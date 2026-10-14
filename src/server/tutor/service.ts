import { and, desc, eq, sql } from "drizzle-orm";
import { convertToModelMessages, streamText, type ModelMessage, type UIMessage } from "ai";
import type { Db } from "@/db/client";
import { conversations, documents, messages, type User } from "@/db/schema";
import { getModel, modelLabel } from "@/server/ai/provider";
import { INTENT_INSTRUCTIONS, tutorSystemPrompt, type Intent, type LearnerProfile } from "@/server/ai/prompts";
import { guardAiUsage, NotFoundError, ValidationError } from "@/server/ai/guard";
import type { SourceRef } from "@/server/ai/schemas";
import { searchChunks } from "@/server/documents/search";

export const MAX_QUESTION_CHARS = 4000;
const CONTEXT_MESSAGES = 12;

export type TutorMetadata = { conversationId?: string; sources?: SourceRef[]; intent?: Intent; demo?: boolean };
export type TutorUIMessage = UIMessage<TutorMetadata>;

function profileOf(user: User): LearnerProfile {
  return { firstName: user.firstName, level: user.level, country: user.country, answerLocale: user.answerLocale, alsoFrench: user.alsoFrench };
}

/* ---------------------------------------------------------- conversations */

export async function listConversations(db: Db, userId: string, limit = 50) {
  const preview = sql<string | null>`(select left(m.content, 140) from messages m where m.conversation_id = ${conversations.id} and m.role = 'assistant' order by m.created_at desc limit 1)`;
  const messageCount = sql<number>`(select count(*)::int from messages m where m.conversation_id = ${conversations.id})`;
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      subject: conversations.subject,
      pinned: conversations.pinned,
      strictMode: conversations.strictMode,
      updatedAt: conversations.updatedAt,
      preview,
      messageCount,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.pinned), desc(conversations.updatedAt))
    .limit(limit);
}

export async function getConversation(db: Db, userId: string, id: string) {
  const rows = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function setPinned(db: Db, userId: string, id: string, pinned: boolean) {
  await db.update(conversations).set({ pinned }).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}

export async function deleteConversation(db: Db, userId: string, id: string) {
  await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}

export async function renameConversation(db: Db, userId: string, id: string, title: string) {
  const clean = title.trim().slice(0, 120);
  if (!clean) throw new ValidationError("Titre vide");
  await db.update(conversations).set({ title: clean }).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}

/** Messages d'une conversation au format de l'interface (parts), dans l'ordre chronologique. */
export async function loadUiMessages(db: Db, userId: string, conversationId: string): Promise<TutorUIMessage[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.userId, userId)))
    .orderBy(messages.createdAt);
  return rows
    .filter((m) => m.role !== "system")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
      metadata: m.sources ? { sources: m.sources as SourceRef[] } : undefined,
    }));
}

/* ------------------------------------------------------------- réponse */

export interface AskInput {
  conversationId?: string | null;
  text: string;
  intent?: Intent | null;
  strict?: boolean;
  documentIds?: string[];
}

/**
 * Traite une question : vérifie les droits et quotas, crée/charge la conversation, enregistre la question,
 * construit le contexte (historique + extraits en mode strict) et renvoie le flux de réponse.
 * Le message de l'assistant est enregistré à la fin du flux.
 */
export async function askTutor(db: Db, user: User, input: AskInput) {
  const intent = input.intent && input.intent in INTENT_INSTRUCTIONS ? input.intent : null;
  const text = (intent ? INTENT_INSTRUCTIONS[intent] : input.text ?? "").trim();
  if (!text) throw new ValidationError("Question vide");
  if (text.length > MAX_QUESTION_CHARS) throw new ValidationError("Question trop longue");

  await guardAiUsage(db, user.id, "tutor_messages");

  // Documents autorisés pour le mode strict : uniquement ceux de l'utilisateur, prêts.
  const strict = Boolean(input.strict);
  let documentIds: string[] = [];
  if (strict) {
    const wanted = Array.from(new Set((input.documentIds ?? []).filter((d) => typeof d === "string"))).slice(0, 20);
    if (wanted.length) {
      const owned = await db
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.userId, user.id), eq(documents.status, "ready"), sql`${documents.id} = ANY(ARRAY[${sql.join(wanted.map((w) => sql`${w}::uuid`), sql`, `)}])`));
      documentIds = owned.map((o) => o.id);
    }
  }

  let conversation = input.conversationId ? await getConversation(db, user.id, input.conversationId) : null;
  if (input.conversationId && !conversation) throw new NotFoundError("conversation");
  if (!conversation) {
    const title = (intent ? "Nouvelle discussion" : text).replace(/\s+/g, " ").slice(0, 80);
    const [created] = await db.insert(conversations).values({ userId: user.id, title, strictMode: strict, documentIds }).returning();
    conversation = created;
  } else if (conversation.strictMode !== strict || JSON.stringify(conversation.documentIds) !== JSON.stringify(documentIds)) {
    await db.update(conversations).set({ strictMode: strict, documentIds, updatedAt: new Date() }).where(eq(conversations.id, conversation.id));
  }
  const conversationId = conversation.id;

  await db.insert(messages).values({ conversationId, userId: user.id, role: "user", content: text, questionLocale: user.questionLocale, answerLocale: user.answerLocale });

  // Historique récent (déjà en base, y compris la question qui vient d'être insérée).
  const history = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(CONTEXT_MESSAGES);
  const uiHistory: Array<Omit<TutorUIMessage, "id">> = history
    .reverse()
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", parts: [{ type: "text" as const, text: m.content }] }));

  // Mode strict : extraits pertinents des documents sélectionnés.
  let sources: SourceRef[] = [];
  if (strict) {
    const previousQuestion = intent ? [...history].reverse().find((m) => m.role === "user" && !Object.values(INTENT_INSTRUCTIONS).includes(m.content))?.content : undefined;
    const query = intent && previousQuestion ? previousQuestion : text;
    const hits = await searchChunks(db, user.id, documentIds, query, 6);
    sources = hits.map((h, i) => ({ n: i + 1, documentId: h.documentId, title: h.title, page: h.page, excerpt: h.content }));
  }

  const system = tutorSystemPrompt(profileOf(user), { strict, sources });
  const modelMessages: ModelMessage[] = await convertToModelMessages(uiHistory);
  const tier = strict ? "strong" : "fast";
  const model = await getModel(tier);
  const label = modelLabel(tier);

  const result = streamText({
    model,
    system,
    messages: modelMessages,
    maxOutputTokens: 1200,
    temperature: 0.4,
    providerOptions: { savi: { task: "tutor" } },
    onFinish: async ({ text: answer, usage }) => {
      await db.insert(messages).values({
        conversationId,
        userId: user.id,
        role: "assistant",
        content: answer,
        answerLocale: user.answerLocale,
        model: label,
        tokensIn: usage.inputTokens ?? null,
        tokensOut: usage.outputTokens ?? null,
        sources: sources.length ? sources : null,
      });
      await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
    },
  });

  return { result, conversationId, sources };
}
