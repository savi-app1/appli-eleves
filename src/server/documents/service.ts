import { and, desc, eq, sql } from "drizzle-orm";
import { generateText } from "ai";
import type { Db } from "@/db/client";
import { documentChunks, documentOutputs, documents, subjects, type User } from "@/db/schema";
import { getModel, modelLabel } from "@/server/ai/provider";
import { exercisesPrompt, summaryPrompt } from "@/server/ai/prompts";
import { bumpUsage, DAILY_LIMITS, guardAiUsage, NotFoundError, QuotaExceededError, ValidationError } from "@/server/ai/guard";
import { getStorage, objectKey, validateUpload } from "@/server/storage";
import { audit } from "@/server/security/audit";
import { chunkPages, extractAny } from "./extract";

export const MAX_DOC_TEXT_CHARS = 12_000;

export async function listSubjects(db: Db, userId: string) {
  return db.select().from(subjects).where(eq(subjects.userId, userId)).orderBy(subjects.name);
}

export async function listDocuments(db: Db, userId: string) {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      chapter: documents.chapter,
      subjectId: documents.subjectId,
      mime: documents.mime,
      sizeBytes: documents.sizeBytes,
      pages: documents.pages,
      status: documents.status,
      failureReason: documents.failureReason,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));
}

export async function getDocument(db: Db, userId: string, id: string) {
  const rows = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function documentText(db: Db, userId: string, documentId: string, maxChars = MAX_DOC_TEXT_CHARS): Promise<string> {
  const rows = await db
    .select({ content: documentChunks.content, page: documentChunks.page })
    .from(documentChunks)
    .where(and(eq(documentChunks.documentId, documentId), eq(documentChunks.userId, userId)))
    .orderBy(documentChunks.idx);
  let out = "";
  for (const r of rows) {
    if (out.length + r.content.length > maxChars) break;
    out += (out ? "\n\n" : "") + r.content;
  }
  return out;
}

export interface UploadInput {
  buffer: Buffer;
  declaredMime: string;
  filename: string;
  title?: string | null;
  chapter?: string | null;
  subjectId?: string | null;
}

/**
 * Import d'un document : validation (type réel, taille), stockage privé, extraction du texte,
 * découpage en extraits indexés pour la recherche et le mode strict.
 */
export async function uploadDocument(db: Db, user: User, input: UploadInput) {
  const v = validateUpload(input.buffer, input.declaredMime);
  if (!v.ok) throw new ValidationError(`upload_${v.reason}`);
  const used = await bumpUsage(db, user.id, "uploads");
  if (used > DAILY_LIMITS.uploads) throw new QuotaExceededError("uploads", DAILY_LIMITS.uploads);

  let subjectId: string | null = null;
  if (input.subjectId) {
    const [s] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, input.subjectId), eq(subjects.userId, user.id)));
    subjectId = s?.id ?? null;
  }
  const title = (input.title?.trim() || input.filename.replace(/\.[a-z0-9]+$/i, "").trim() || "Document").slice(0, 120);
  const chapter = input.chapter?.trim().slice(0, 120) || null;

  const key = objectKey(user.id, v.mime);
  await getStorage().put(key, input.buffer, v.mime);
  const [doc] = await db
    .insert(documents)
    .values({ userId: user.id, subjectId, chapter, title, mime: v.mime, sizeBytes: input.buffer.length, storageKey: key, status: "processing" })
    .returning();

  try {
    const extracted = await extractAny(input.buffer, v.mime);
    const chunks = chunkPages(extracted.pages);
    if (chunks.length === 0) {
      await db.update(documents).set({ status: "failed", failureReason: extracted.warning ?? "Aucun texte lisible.", pages: extracted.pages.length || null, updatedAt: new Date() }).where(eq(documents.id, doc.id));
    } else {
      await db.insert(documentChunks).values(chunks.map((c) => ({ documentId: doc.id, userId: user.id, idx: c.idx, page: c.page, content: c.content })));
      await db
        .update(documents)
        .set({ status: "ready", pages: extracted.pages.length || 1, failureReason: extracted.warning ?? null, updatedAt: new Date() })
        .where(eq(documents.id, doc.id));
    }
    await audit(db, "document.upload", user.id, { mime: v.mime, size: input.buffer.length, method: extracted.method, chunks: chunks.length });
  } catch (err) {
    await db.update(documents).set({ status: "failed", failureReason: "Erreur pendant la lecture du fichier.", updatedAt: new Date() }).where(eq(documents.id, doc.id));
    await audit(db, "document.failed", user.id, { mime: v.mime, error: (err as Error).name });
  }
  return getDocument(db, user.id, doc.id);
}

export async function updateDocument(db: Db, userId: string, id: string, patch: { title?: string; chapter?: string | null; subjectId?: string | null }) {
  const set: Partial<typeof documents.$inferInsert> = { updatedAt: new Date() };
  if (patch.title !== undefined) {
    const t = patch.title.trim().slice(0, 120);
    if (!t) throw new ValidationError("Titre vide");
    set.title = t;
  }
  if (patch.chapter !== undefined) set.chapter = patch.chapter?.trim().slice(0, 120) || null;
  if (patch.subjectId !== undefined) {
    if (patch.subjectId) {
      const [s] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, patch.subjectId), eq(subjects.userId, userId)));
      set.subjectId = s?.id ?? null;
    } else set.subjectId = null;
  }
  await db.update(documents).set(set).where(and(eq(documents.id, id), eq(documents.userId, userId)));
}

export async function deleteDocument(db: Db, userId: string, id: string) {
  const doc = await getDocument(db, userId, id);
  if (!doc) throw new NotFoundError("document");
  await getStorage().delete(doc.storageKey);
  await db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, userId)));
  await audit(db, "document.delete", userId, {});
}

export async function listOutputs(db: Db, userId: string, documentId: string) {
  return db
    .select()
    .from(documentOutputs)
    .where(and(eq(documentOutputs.documentId, documentId), eq(documentOutputs.userId, userId)))
    .orderBy(desc(documentOutputs.createdAt));
}

/** Fiche de révision ou exercices générés à partir du texte du document (stockés pour relecture). */
export async function generateOutput(db: Db, user: User, documentId: string, kind: "summary" | "exercises") {
  const doc = await getDocument(db, user.id, documentId);
  if (!doc || doc.status !== "ready") throw new NotFoundError("document");
  await guardAiUsage(db, user.id, "generations");
  const text = await documentText(db, user.id, documentId);
  const profile = { firstName: user.firstName, level: user.level, country: user.country, answerLocale: user.answerLocale, alsoFrench: user.alsoFrench };
  const p = kind === "summary" ? summaryPrompt(profile, doc.title, text) : exercisesPrompt(profile, doc.title, text);
  const model = await getModel("fast");
  const { text: content } = await generateText({ model, system: p.system, prompt: p.prompt, maxOutputTokens: 1800, temperature: 0.3, providerOptions: { savi: { task: kind } } });
  const [row] = await db.insert(documentOutputs).values({ userId: user.id, documentId, kind, content, model: modelLabel("fast") }).returning();
  return row;
}

export async function countDocuments(db: Db, userId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(documents).where(eq(documents.userId, userId));
  return r?.n ?? 0;
}
