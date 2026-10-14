import { and, desc, eq, sql } from "drizzle-orm";
import { generateText, Output } from "ai";
import type { Db } from "@/db/client";
import { quizAttempts, quizzes, type User } from "@/db/schema";
import { getModel } from "@/server/ai/provider";
import { quizPrompt } from "@/server/ai/prompts";
import { guardAiUsage, NotFoundError, ValidationError } from "@/server/ai/guard";
import { QuizSchema, type QuizQuestion } from "@/server/ai/schemas";
import { documentText, getDocument } from "@/server/documents/service";

export type AnswerValue = number | boolean | string;
export interface AttemptAnswer {
  questionId: string;
  value: AnswerValue | null;
  correct: boolean;
  topic?: string;
}

/** Normalisation tolérante des réponses courtes : casse, accents, espaces, « x = », unités simples. */
export function normalizeShort(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/−|–/g, "-")
    .replace(/²/g, "^2")
    .replace(/\s+/g, "")
    .replace(/^x=/, "")
    .replace(/(cm|m|km|g|kg|l|ml|fcfa|f)$/i, "")
    .replace(/[.,;:!?]+$/, "")
    .replace(/,/g, ".");
}

export function isCorrect(q: QuizQuestion, value: AnswerValue | null): boolean {
  if (value === null || value === undefined) return false;
  if (q.type === "mcq") return typeof value === "number" && value === q.answer;
  if (q.type === "truefalse") return typeof value === "boolean" && value === q.answer;
  const v = normalizeShort(String(value));
  return v.length > 0 && q.accepted.some((a) => normalizeShort(a) === v);
}

export async function listQuizzes(db: Db, userId: string, limit = 30) {
  return db
    .select({ id: quizzes.id, title: quizzes.title, subject: quizzes.subject, source: quizzes.source, topic: quizzes.topic, minutes: quizzes.minutes, documentId: quizzes.documentId, createdAt: quizzes.createdAt, questions: quizzes.questions })
    .from(quizzes)
    .where(eq(quizzes.userId, userId))
    .orderBy(desc(quizzes.createdAt))
    .limit(limit);
}

export async function getQuiz(db: Db, userId: string, id: string) {
  const rows = await db.select().from(quizzes).where(and(eq(quizzes.id, id), eq(quizzes.userId, userId))).limit(1);
  const q = rows[0];
  return q ? { ...q, questions: q.questions as QuizQuestion[] } : null;
}

export interface GenerateQuizInput {
  subject: string;
  topic: string;
  count?: number;
  documentId?: string | null;
  source?: "document" | "subject" | "revision" | "exam";
  exam?: { name: string; minutes: number } | null;
}

/** Génère un quiz (structure validée par schéma) et l'enregistre pour l'utilisateur. */
export async function generateQuiz(db: Db, user: User, input: GenerateQuizInput) {
  const subject = input.subject.trim().slice(0, 60);
  const topic = input.topic.trim().slice(0, 120);
  if (!subject || !topic) throw new ValidationError("Matière et thème requis");
  const count = Math.min(20, Math.max(3, Number(input.count ?? 5) || 5));
  await guardAiUsage(db, user.id, "generations");

  let text: string | undefined;
  let documentId: string | null = null;
  if (input.documentId) {
    const doc = await getDocument(db, user.id, input.documentId);
    if (!doc || doc.status !== "ready") throw new NotFoundError("document");
    text = await documentText(db, user.id, doc.id);
    documentId = doc.id;
  }
  const profile = { firstName: user.firstName, level: user.level, country: user.country, answerLocale: user.answerLocale, alsoFrench: user.alsoFrench };
  const p = quizPrompt(profile, { subject, topic, count, text, exam: input.exam ?? undefined });
  const model = await getModel("fast");
  const { output: object } = await generateText({ model, output: Output.object({ schema: QuizSchema, name: "quiz" }), system: p.system, prompt: p.prompt, temperature: 0.5, providerOptions: { savi: { task: "quiz" } } });

  const questions: QuizQuestion[] = object.questions
    .filter((q) => q.type !== "mcq" || (q.answer >= 0 && q.answer < q.options.length))
    .map((q, i) => ({ ...q, id: `q${i + 1}` }));
  if (questions.length === 0) throw new ValidationError("Quiz vide");

  const [row] = await db
    .insert(quizzes)
    .values({
      userId: user.id,
      title: object.title.slice(0, 120),
      subject: object.subject.slice(0, 60) || subject,
      source: input.source ?? (documentId ? "document" : "subject"),
      documentId,
      topic,
      level: user.level,
      minutes: input.exam?.minutes ?? null,
      questions,
    })
    .returning();
  return { ...row, questions };
}

export interface SubmitInput {
  quizId: string;
  answers: Record<string, AnswerValue | null>;
  durationS?: number | null;
}

/** Corrige côté serveur, enregistre la tentative et renvoie le détail par question. */
export async function submitAttempt(db: Db, userId: string, input: SubmitInput) {
  const quiz = await getQuiz(db, userId, input.quizId);
  if (!quiz) throw new NotFoundError("quiz");
  const detail: AttemptAnswer[] = quiz.questions.map((q) => {
    const value = input.answers?.[q.id] ?? null;
    return { questionId: q.id, value, correct: isCorrect(q, value), topic: q.topic };
  });
  const score = detail.filter((d) => d.correct).length;
  const [attempt] = await db
    .insert(quizAttempts)
    .values({ userId, quizId: quiz.id, answers: detail, score, total: quiz.questions.length, durationS: input.durationS ? Math.max(0, Math.round(input.durationS)) : null })
    .returning();
  return { attempt, quiz, detail, score, total: quiz.questions.length };
}

export async function listAttempts(db: Db, userId: string, limit = 20) {
  return db
    .select({ id: quizAttempts.id, quizId: quizAttempts.quizId, score: quizAttempts.score, total: quizAttempts.total, durationS: quizAttempts.durationS, createdAt: quizAttempts.createdAt, title: quizzes.title, subject: quizzes.subject, source: quizzes.source, answers: quizAttempts.answers })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .where(eq(quizAttempts.userId, userId))
    .orderBy(desc(quizAttempts.createdAt))
    .limit(limit);
}

export async function getAttempt(db: Db, userId: string, attemptId: string) {
  const rows = await db.select().from(quizAttempts).where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.userId, userId))).limit(1);
  const a = rows[0];
  if (!a) return null;
  const quiz = await getQuiz(db, userId, a.quizId);
  return quiz ? { attempt: { ...a, answers: a.answers as AttemptAnswer[] }, quiz } : null;
}

export async function countAttempts(db: Db, userId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(quizAttempts).where(eq(quizAttempts.userId, userId));
  return r?.n ?? 0;
}
