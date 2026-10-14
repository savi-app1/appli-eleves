import { and, desc, eq, sql } from "drizzle-orm";
import { generateText, Output } from "ai";
import type { Db } from "@/db/client";
import { submissions, type User } from "@/db/schema";
import { getModel } from "@/server/ai/provider";
import { gradingPrompt } from "@/server/ai/prompts";
import { bumpUsage, DAILY_LIMITS, guardAiUsage, NotFoundError, QuotaExceededError, ValidationError } from "@/server/ai/guard";
import { GradingSchema, type Grading } from "@/server/ai/schemas";
import { getStorage, objectKey, validateUpload } from "@/server/storage";
import { audit } from "@/server/security/audit";
import { extractAny } from "@/server/documents/extract";

export interface CreateSubmissionInput {
  file?: { buffer: Buffer; declaredMime: string } | null;
  text?: string | null;
  subject?: string | null;
  hasScale?: boolean;
  outOf?: number | null;
}

/**
 * Étape 1 : réception du devoir (photo/PDF ou texte saisi), lecture du texte.
 * Le devoir passe en « recognized » pour que l'élève vérifie le texte lu avant l'analyse.
 */
export async function createSubmission(db: Db, user: User, input: CreateSubmissionInput) {
  const typed = (input.text ?? "").trim().slice(0, 8000);
  if (!input.file && !typed) throw new ValidationError("Aucun devoir fourni");
  const used = await bumpUsage(db, user.id, "uploads");
  if (used > DAILY_LIMITS.uploads) throw new QuotaExceededError("uploads", DAILY_LIMITS.uploads);

  let storageKey: string | null = null;
  let mime: string | null = null;
  let recognized = typed;
  let confidence: number | null = typed ? 100 : null;
  let warning: string | null = null;

  if (input.file) {
    const v = validateUpload(input.file.buffer, input.file.declaredMime);
    if (!v.ok) throw new ValidationError(`upload_${v.reason}`);
    mime = v.mime;
    storageKey = objectKey(user.id, v.mime);
    await getStorage().put(storageKey, input.file.buffer, v.mime);
    try {
      const ex = await extractAny(input.file.buffer, v.mime);
      recognized = [typed, ex.pages.join("\n\n")].filter(Boolean).join("\n\n").trim();
      confidence = ex.confidence;
      warning = ex.warning ?? null;
    } catch {
      warning = "Lecture du fichier impossible. Tu peux saisir le texte à la main.";
    }
  }

  const [row] = await db
    .insert(submissions)
    .values({
      userId: user.id,
      subject: input.subject?.trim().slice(0, 60) || null,
      storageKey,
      mime,
      recognizedText: recognized || null,
      confidence,
      hasScale: Boolean(input.hasScale),
      gradeOutOf: input.hasScale && input.outOf ? String(input.outOf) : null,
      status: "recognized",
      analysis: warning ? { warning } : null,
    })
    .returning();
  await audit(db, "grading.submit", user.id, { mime, typed: Boolean(typed), confidence });
  return row;
}

export async function getSubmission(db: Db, userId: string, id: string) {
  const rows = await db.select().from(submissions).where(and(eq(submissions.id, id), eq(submissions.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function listSubmissions(db: Db, userId: string, limit = 20) {
  return db
    .select({ id: submissions.id, subject: submissions.subject, status: submissions.status, gradeValue: submissions.gradeValue, gradeOutOf: submissions.gradeOutOf, createdAt: submissions.createdAt, recognizedText: submissions.recognizedText })
    .from(submissions)
    .where(eq(submissions.userId, userId))
    .orderBy(desc(submissions.createdAt))
    .limit(limit);
}

/** Étape 2 : analyse par l'IA du texte confirmé/corrigé par l'élève. */
export async function gradeSubmission(db: Db, user: User, id: string, confirmedText?: string | null): Promise<Grading> {
  const sub = await getSubmission(db, user.id, id);
  if (!sub) throw new NotFoundError("devoir");
  const text = (confirmedText ?? sub.recognizedText ?? "").trim().slice(0, 8000);
  if (text.length < 5) throw new ValidationError("Texte du devoir trop court");
  await guardAiUsage(db, user.id, "gradings");

  const profile = { firstName: user.firstName, level: user.level, country: user.country, answerLocale: user.answerLocale, alsoFrench: user.alsoFrench };
  const outOf = sub.gradeOutOf ? Number(sub.gradeOutOf) : undefined;
  const p = gradingPrompt(profile, { text, subject: sub.subject ?? undefined, hasScale: sub.hasScale, outOf });
  const model = await getModel("strong");
  const { output: object } = await generateText({ model, output: Output.object({ schema: GradingSchema, name: "correction" }), system: p.system, prompt: p.prompt, temperature: 0.2, providerOptions: { savi: { task: "grading" } } });

  // Une note n'est conservée que si l'élève a déclaré un barème : jamais de note « spontanée ».
  const grade = sub.hasScale && object.grade ? object.grade : null;
  const analysis: Grading = { ...object, grade };
  await db
    .update(submissions)
    .set({
      recognizedText: text,
      analysis,
      status: "graded",
      subject: sub.subject ?? analysis.subject.slice(0, 60),
      gradeValue: grade ? String(grade.value) : null,
      gradeOutOf: grade ? String(grade.outOf) : sub.gradeOutOf,
    })
    .where(eq(submissions.id, id));
  await audit(db, "grading.done", user.id, { errors: analysis.errors.length, graded: Boolean(grade) });
  return analysis;
}

export async function deleteSubmission(db: Db, userId: string, id: string) {
  const sub = await getSubmission(db, userId, id);
  if (!sub) throw new NotFoundError("devoir");
  if (sub.storageKey) await getStorage().delete(sub.storageKey);
  await db.delete(submissions).where(and(eq(submissions.id, id), eq(submissions.userId, userId)));
}

export async function countGraded(db: Db, userId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(submissions).where(and(eq(submissions.userId, userId), eq(submissions.status, "graded")));
  return r?.n ?? 0;
}
