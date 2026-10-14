import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { conversations, documents, goals, messages, quizAttempts, quizzes, submissions } from "@/db/schema";
import type { AttemptAnswer } from "@/server/quiz/service";

export interface SubjectStat {
  subject: string;
  attempts: number;
  correct: number;
  total: number;
  percent: number;
}
export interface TopicStat {
  topic: string;
  subject: string;
  correct: number;
  total: number;
  percent: number;
}
export interface ProgressSummary {
  stats: { questions: number; quizzes: number; gradings: number; docs: number };
  overallPercent: number | null;
  bySubject: SubjectStat[];
  strengths: TopicStat[];
  difficulties: TopicStat[];
  weekActivity: number[]; // 7 valeurs, du plus ancien à aujourd'hui
  streakDays: number;
  weeklyGoal: { done: number; total: number };
  goals: { id: string; title: string; progress: number; targetDate: string | null }[];
}

const DAY = 86_400_000;
function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Jours d'activité (question posée, quiz terminé, devoir corrigé) sur les 60 derniers jours. */
async function activityDays(db: Db, userId: string, now: Date): Promise<Set<string>> {
  const since = new Date(now.getTime() - 60 * DAY);
  const [m, a, s] = await Promise.all([
    db.select({ d: messages.createdAt }).from(messages).where(and(eq(messages.userId, userId), eq(messages.role, "user"), gte(messages.createdAt, since))),
    db.select({ d: quizAttempts.createdAt }).from(quizAttempts).where(and(eq(quizAttempts.userId, userId), gte(quizAttempts.createdAt, since))),
    db.select({ d: submissions.createdAt }).from(submissions).where(and(eq(submissions.userId, userId), gte(submissions.createdAt, since))),
  ]);
  return new Set([...m, ...a, ...s].map((r) => dayKey(r.d)));
}

export async function getProgress(db: Db, userId: string, now = new Date()): Promise<ProgressSummary> {
  const [[q], [g], [d], attempts, days, goalRows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.userId, userId), eq(messages.role, "user"))),
    db.select({ n: sql<number>`count(*)::int` }).from(submissions).where(and(eq(submissions.userId, userId), eq(submissions.status, "graded"))),
    db.select({ n: sql<number>`count(*)::int` }).from(documents).where(eq(documents.userId, userId)),
    db
      .select({ score: quizAttempts.score, total: quizAttempts.total, answers: quizAttempts.answers, createdAt: quizAttempts.createdAt, subject: quizzes.subject })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(200),
    activityDays(db, userId, now),
    db.select().from(goals).where(eq(goals.userId, userId)).orderBy(goals.createdAt),
  ]);

  const bySubjectMap = new Map<string, SubjectStat>();
  const topicMap = new Map<string, TopicStat>();
  let correct = 0;
  let total = 0;
  for (const a of attempts) {
    const subject = a.subject ?? "Autre";
    const s = bySubjectMap.get(subject) ?? { subject, attempts: 0, correct: 0, total: 0, percent: 0 };
    s.attempts += 1;
    s.correct += a.score;
    s.total += a.total;
    bySubjectMap.set(subject, s);
    correct += a.score;
    total += a.total;
    for (const ans of (a.answers as AttemptAnswer[]) ?? []) {
      if (!ans.topic) continue;
      const key = `${subject}::${ans.topic}`;
      const t = topicMap.get(key) ?? { topic: ans.topic, subject, correct: 0, total: 0, percent: 0 };
      t.total += 1;
      if (ans.correct) t.correct += 1;
      topicMap.set(key, t);
    }
  }
  const bySubject = Array.from(bySubjectMap.values()).map((s) => ({ ...s, percent: s.total ? Math.round((100 * s.correct) / s.total) : 0 })).sort((a, b) => b.attempts - a.attempts);
  const topics = Array.from(topicMap.values()).map((t) => ({ ...t, percent: Math.round((100 * t.correct) / t.total) }));
  const strengths = topics.filter((t) => t.total >= 2 && t.percent >= 75).sort((a, b) => b.percent - a.percent).slice(0, 5);
  const difficulties = topics.filter((t) => t.percent < 60).sort((a, b) => a.percent - b.percent).slice(0, 5);

  const weekActivity = Array.from({ length: 7 }, (_, i) => {
    const day = dayKey(new Date(now.getTime() - (6 - i) * DAY));
    return days.has(day) ? 1 : 0;
  });
  // comptage réel des actions par jour pour la barre d'activité
  const perDay = new Map<string, number>();
  for (const a of attempts) perDay.set(dayKey(a.createdAt), (perDay.get(dayKey(a.createdAt)) ?? 0) + 1);
  const activity = weekActivity.map((v, i) => {
    const day = dayKey(new Date(now.getTime() - (6 - i) * DAY));
    return Math.max(v, perDay.get(day) ?? 0);
  });

  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const day = dayKey(new Date(now.getTime() - i * DAY));
    if (days.has(day)) streak += 1;
    else if (i > 0) break;
  }

  const monday = new Date(now);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const [conv] = await db.select({ n: sql<number>`count(*)::int` }).from(conversations).where(and(eq(conversations.userId, userId), gte(conversations.createdAt, monday)));
  const weekAttempts = attempts.filter((a) => a.createdAt >= monday).length;
  const weeklyGoal = { done: Math.min(99, weekAttempts + (conv?.n ?? 0)), total: Number(process.env.WEEKLY_GOAL_SESSIONS ?? 4) };

  return {
    stats: { questions: q?.n ?? 0, quizzes: attempts.length, gradings: g?.n ?? 0, docs: d?.n ?? 0 },
    overallPercent: total ? Math.round((100 * correct) / total) : null,
    bySubject,
    strengths,
    difficulties,
    weekActivity: activity,
    streakDays: streak,
    weeklyGoal,
    goals: goalRows.map((g) => ({ id: g.id, title: g.title, progress: g.progress, targetDate: g.targetDate })),
  };
}

export async function addGoal(db: Db, userId: string, title: string, targetDate?: string | null) {
  const clean = title.trim().slice(0, 120);
  if (!clean) return;
  await db.insert(goals).values({ userId, title: clean, targetDate: targetDate || null });
}

export async function updateGoalProgress(db: Db, userId: string, id: string, progress: number) {
  await db.update(goals).set({ progress: Math.max(0, Math.min(100, Math.round(progress))) }).where(and(eq(goals.id, id), eq(goals.userId, userId)));
}

export async function deleteGoal(db: Db, userId: string, id: string) {
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
}
