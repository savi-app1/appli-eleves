"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { deleteConversation, renameConversation, setPinned } from "@/server/tutor/service";
import { deleteDocument, generateOutput, getDocument, updateDocument } from "@/server/documents/service";
import { generateQuiz, submitAttempt, type AnswerValue } from "@/server/quiz/service";
import { gradeSubmission, deleteSubmission } from "@/server/grading/service";
import { addGoal, deleteGoal, updateGoalProgress } from "@/server/progress/service";

/**
 * Codes d'erreur renvoyés aux écrans. Les erreurs « métier » (quota, essai expiré, IA indisponible)
 * sont traduites en redirections lisibles ; tout le reste remonte dans les journaux serveur.
 */
export type ActionErrorCode = "premium_required" | "quota_exceeded" | "rate_limited" | "ai_unavailable" | "not_found" | "invalid" | "unknown";

function errorCode(err: unknown): ActionErrorCode {
  const name = (err as { name?: string })?.name;
  if (name === "PremiumRequiredError") return "premium_required";
  if (name === "QuotaExceededError") return "quota_exceeded";
  if (name === "RateLimitedError") return "rate_limited";
  if (name === "AiUnavailableError") return "ai_unavailable";
  if (name === "NotFoundError") return "not_found";
  if (name === "ValidationError") return "invalid";
  return "unknown";
}

function isNextRedirect(err: unknown) {
  return typeof (err as { digest?: string })?.digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

/** Exécute une action ; en cas d'erreur métier, redirige vers `backUrl?erreur=code` (ou /abonnement si l'essai est expiré). */
async function guarded<T>(backUrl: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    const code = errorCode(err);
    if (code === "unknown") console.error("[action]", err);
    if (code === "premium_required") redirect("/abonnement?raison=premium");
    const sep = backUrl.includes("?") ? "&" : "?";
    redirect(`${backUrl}${sep}erreur=${code}`);
  }
}

const uuid = z.string().uuid();
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};

/* ---------- Conversations ---------- */

export async function togglePinAction(conversationId: string, pinned: boolean) {
  const { user } = await requireUser();
  const db = await getDb();
  await setPinned(db, user.id, uuid.parse(conversationId), pinned);
  revalidatePath("/profil/historique");
  revalidatePath("/accueil");
}

export async function pinFormAction(fd: FormData) {
  await togglePinAction(str(fd, "id"), str(fd, "pinned") === "1");
}

export async function deleteConversationAction(fd: FormData) {
  const { user } = await requireUser();
  const db = await getDb();
  await deleteConversation(db, user.id, uuid.parse(str(fd, "id")));
  revalidatePath("/profil/historique");
  redirect("/profil/historique");
}

export async function renameConversationAction(fd: FormData) {
  const { user } = await requireUser();
  const title = str(fd, "title").slice(0, 80);
  if (!title) return;
  const db = await getDb();
  await renameConversation(db, user.id, uuid.parse(str(fd, "id")), title);
  revalidatePath("/profil/historique");
}

/* ---------- Documents ---------- */

export async function generateOutputAction(fd: FormData) {
  const { user } = await requireUser();
  const id = uuid.parse(str(fd, "documentId"));
  const kind = str(fd, "kind") === "exercises" ? "exercises" : "summary";
  const back = `/cours/${id}?onglet=${kind}`;
  await guarded(back, async () => {
    const db = await getDb();
    await generateOutput(db, user, id, kind);
  });
  revalidatePath(back);
  redirect(back);
}

export async function updateDocumentAction(fd: FormData) {
  const { user } = await requireUser();
  const id = uuid.parse(str(fd, "documentId"));
  const db = await getDb();
  const subjectId = str(fd, "subjectId");
  await updateDocument(db, user.id, id, {
    title: str(fd, "title").slice(0, 160) || undefined,
    chapter: str(fd, "chapter").slice(0, 120) || null,
    subjectId: subjectId && uuid.safeParse(subjectId).success ? subjectId : null,
  });
  revalidatePath(`/cours/${id}`);
  revalidatePath("/cours");
  redirect(`/cours/${id}`);
}

export async function deleteDocumentAction(fd: FormData) {
  const { user } = await requireUser();
  const db = await getDb();
  await deleteDocument(db, user.id, uuid.parse(str(fd, "documentId")));
  revalidatePath("/cours");
  redirect("/cours");
}

/* ---------- Quiz ---------- */

export async function generateQuizAction(fd: FormData) {
  const { user } = await requireUser();
  const back = str(fd, "back") || "/quiz";
  const documentId = str(fd, "documentId");
  const count = Math.min(15, Math.max(3, Number(str(fd, "count") || 5)));
  const quiz = await guarded(back, async () => {
    const db = await getDb();
    let subject = str(fd, "subject").slice(0, 60);
    let topic = str(fd, "topic").slice(0, 120);
    if (documentId) {
      const doc = await getDocument(db, user.id, uuid.parse(documentId));
      if (!doc) redirect("/cours?erreur=not_found");
      subject = subject || "Mes cours";
      topic = topic || doc.title;
    }
    return generateQuiz(db, user, {
      subject,
      topic,
      count,
      documentId: documentId || null,
      source: documentId ? "document" : str(fd, "source") === "revision" ? "revision" : "subject",
    });
  });
  revalidatePath("/quiz");
  redirect(`/quiz/${quiz.id}`);
}

export async function startMockExamAction(fd: FormData) {
  const { user } = await requireUser();
  const minutes = Math.min(180, Math.max(5, Number(str(fd, "minutes") || 20)));
  const count = Math.min(20, Math.max(5, Number(str(fd, "count") || 10)));
  const examName = str(fd, "exam").slice(0, 80) || "Examen blanc";
  const subject = str(fd, "subject").slice(0, 60) || "Mathématiques";
  const quiz = await guarded("/examens", async () => {
    const db = await getDb();
    return generateQuiz(db, user, { subject, topic: `${examName} — ${subject}`, count, source: "exam", exam: { name: examName, minutes } });
  });
  redirect(`/examens/blanc/${quiz.id}`);
}

export interface AttemptResult {
  ok: true;
  attemptId: string;
  score: number;
  total: number;
  detail: { questionId: string; correct: boolean }[];
}
export type AttemptOutcome = AttemptResult | { ok: false; error: ActionErrorCode };

/** Correction serveur d'une tentative (le score affiché vient toujours d'ici). */
export async function submitAttemptAction(quizId: string, answers: Record<string, AnswerValue>, durationS: number): Promise<AttemptOutcome> {
  try {
    const { user } = await requireUser();
    const db = await getDb();
    const clean: Record<string, AnswerValue> = {};
    for (const [k, v] of Object.entries(answers ?? {})) {
      if (typeof k !== "string" || k.length > 40) continue;
      if (typeof v === "number" || typeof v === "boolean") clean[k] = v;
      else if (typeof v === "string") clean[k] = v.slice(0, 200);
    }
    const r = await submitAttempt(db, user.id, { quizId: uuid.parse(quizId), answers: clean, durationS: Math.max(0, Math.min(6 * 3600, Math.round(Number(durationS) || 0))) });
    revalidatePath("/quiz");
    revalidatePath("/progression");
    return { ok: true, attemptId: r.attempt.id, score: r.score, total: r.total, detail: r.detail.map((d) => ({ questionId: d.questionId, correct: d.correct })) };
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    const code = errorCode(err);
    if (code === "unknown") console.error("[submitAttempt]", err);
    return { ok: false, error: code };
  }
}

/* ---------- Corrections de devoirs ---------- */

export async function gradeSubmissionAction(fd: FormData) {
  const { user } = await requireUser();
  const id = uuid.parse(str(fd, "submissionId"));
  const text = str(fd, "text").slice(0, 8000);
  await guarded(`/correction/${id}`, async () => {
    const db = await getDb();
    await gradeSubmission(db, user, id, text || null);
  });
  revalidatePath(`/correction/${id}`);
  revalidatePath("/correction");
  redirect(`/correction/${id}`);
}

export async function deleteSubmissionAction(fd: FormData) {
  const { user } = await requireUser();
  const db = await getDb();
  await deleteSubmission(db, user.id, uuid.parse(str(fd, "submissionId")));
  revalidatePath("/correction");
  redirect("/correction");
}

/* ---------- Objectifs ---------- */

export async function addGoalAction(fd: FormData) {
  const { user } = await requireUser();
  const title = str(fd, "title").slice(0, 120);
  if (!title) return;
  const target = str(fd, "targetDate");
  const db = await getDb();
  await addGoal(db, user.id, title, /^\d{4}-\d{2}-\d{2}$/.test(target) ? target : null);
  revalidatePath("/progression");
}

export async function updateGoalAction(fd: FormData) {
  const { user } = await requireUser();
  const db = await getDb();
  await updateGoalProgress(db, user.id, uuid.parse(str(fd, "id")), Math.max(0, Math.min(100, Number(str(fd, "progress") || 0))));
  revalidatePath("/progression");
}

export async function deleteGoalAction(fd: FormData) {
  const { user } = await requireUser();
  const db = await getDb();
  await deleteGoal(db, user.id, uuid.parse(str(fd, "id")));
  revalidatePath("/progression");
}
