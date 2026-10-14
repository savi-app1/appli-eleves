import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { TutorChat } from "@/components/screens/tutor-chat";
import { requireUser } from "@/server/auth/current";
import { aiMode } from "@/server/ai/provider";
import { getConversation, loadUiMessages } from "@/server/tutor/service";
import { listDocuments } from "@/server/documents/service";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/**
 * Tuteur : `?c=<conversation>` reprend une discussion, `?strict=1&docs=a,b` active le mode strict
 * sur des documents, `?q=` pré-remplit la question.
 */
export default async function TutorPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { user } = await requireUser();
  const db = await getDb();
  const ta = await getTranslations("auth");
  const tl = await getTranslations("languagesNames");
  const level = ta.has(`levels.${user.level}`) ? ta(`levels.${user.level}`) : user.level;
  const answerLanguage = tl.has(user.answerLocale) ? tl(user.answerLocale) : user.answerLocale;

  const cParam = one(sp.c);
  const conversation = isUuid(cParam) ? await getConversation(db, user.id, cParam) : null;
  const messages = conversation ? await loadUiMessages(db, user.id, conversation.id) : [];

  const strictParam = one(sp.strict) === "1";
  const wantedDocs = (conversation ? (conversation.documentIds as string[]) : one(sp.docs).split(",")).filter(isUuid);
  const strict = conversation ? conversation.strictMode : strictParam;
  let documents: { id: string; title: string }[] = [];
  if (strict && wantedDocs.length) {
    const all = await listDocuments(db, user.id);
    documents = all.filter((d) => d.status === "ready" && wantedDocs.includes(d.id)).map((d) => ({ id: d.id, title: d.title }));
  }

  return (
    <TutorChat
      key={conversation?.id ?? "nouvelle"}
      user={{ firstName: user.firstName, level }}
      answerLanguage={answerLanguage}
      demo={aiMode() === "demo"}
      initial={{
        conversationId: conversation?.id ?? null,
        messages,
        pinned: conversation?.pinned ?? false,
        strict,
        documents,
        prefill: one(sp.q).slice(0, 2000),
      }}
    />
  );
}
