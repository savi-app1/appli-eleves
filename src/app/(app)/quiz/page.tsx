import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { AlertTriangle, ChevronRight, FolderOpen, ListChecks, Play, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { aiMode } from "@/server/ai/provider";
import { listSubjects } from "@/server/documents/service";
import { listAttempts, listQuizzes } from "@/server/quiz/service";
import { generateQuizAction } from "@/server/learning/actions";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function QuizHubPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { user } = await requireUser();
  const db = await getDb();
  const t = await getTranslations("quiz");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const [quizzes, attempts, subjects] = await Promise.all([listQuizzes(db, user.id, 30), listAttempts(db, user.id, 10), listSubjects(db, user.id)]);
  const error = one(sp.erreur);
  const demo = aiMode() === "demo";
  const attemptsByQuiz = new Map<string, { n: number; best: number; total: number }>();
  for (const a of await listAttempts(db, user.id, 200)) {
    const cur = attemptsByQuiz.get(a.quizId) ?? { n: 0, best: 0, total: a.total };
    attemptsByQuiz.set(a.quizId, { n: cur.n + 1, best: Math.max(cur.best, a.score), total: a.total });
  }
  const sourceLabel = (s: string) => (t.has(`sources.${s}`) ? t(`sources.${s}`) : s);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <span>{tc.has(`errors.${error}`) ? tc(`errors.${error}`) : tc("errors.unknown")}{error === "premium_required" ? <> · <Link href="/abonnement" className="font-bold underline">{tc("subscribe")}</Link></> : null}</span>
          </div>
        ) : null}

        <div className="rounded-[var(--radius-card)] bg-green p-5 text-white shadow-[var(--shadow-card)]">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-90">{t("newQuiz")}</div>
          <form action={generateQuizAction} className="mt-3 space-y-3">
            <input type="hidden" name="back" value="/quiz" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={<span className="text-white/90">{t("subjectLabel")}</span>} htmlFor="subject">
                <Select id="subject" name="subject" defaultValue={subjects[0]?.name ?? "Mathématiques"} className="bg-white text-ink">
                  {(subjects.length ? subjects.map((s) => s.name) : ["Mathématiques", "Français", "Physique-Chimie", "SVT", "Histoire-Géographie", "Anglais"]).map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </Field>
              <Field label={<span className="text-white/90">{t("topicLabel")}</span>} htmlFor="topic">
                <Input id="topic" name="topic" required maxLength={120} placeholder={t("topicPlaceholder")} className="bg-white text-ink" />
              </Field>
            </div>
            <div className="flex items-end gap-3">
              <Field label={<span className="text-white/90">{t("countLabel")}</span>} htmlFor="count">
                <Select id="count" name="count" defaultValue="5" className="bg-white text-ink">{[3, 5, 8, 10, 15].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
              </Field>
              <SubmitButton variant="black" size="lg" className="flex-1 bg-white text-green hover:bg-white/90" pendingLabel={t("generating")}>
                <Sparkles className="size-5" /> {t("generate")}
              </SubmitButton>
            </div>
          </form>
          {demo ? <p className="mt-3 text-xs opacity-90">{t("demoNotice")}</p> : null}
        </div>

        <Card className="p-0">
          <Link href="/cours" className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-green-soft text-green-ink"><FolderOpen className="size-5" /></span>
            <span className="flex-1 text-[15px] font-medium text-ink">{t("fromCourse")}</span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        </Card>

        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("myQuizzes")}</div>
          {quizzes.length === 0 ? (
            <EmptyState icon={<ListChecks className="size-6" />} title={t("noQuizzes")} />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-line">
                {quizzes.map((qz) => {
                  const a = attemptsByQuiz.get(qz.id);
                  const n = (qz.questions as unknown[]).length;
                  return (
                    <li key={qz.id}>
                      <Link href={qz.source === "exam" ? `/examens/blanc/${qz.id}` : `/quiz/${qz.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink"><Play className="size-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium text-ink">{qz.title}</span>
                          <span className="block truncate text-xs text-muted">
                            {qz.subject} · {tc("questions", { count: n })} · {sourceLabel(qz.source)} · {t("attempts", { count: a?.n ?? 0 })}
                          </span>
                        </span>
                        {a ? <Badge tone={a.best / a.total >= 0.7 ? "green" : a.best / a.total >= 0.5 ? "warning" : "danger"}>{a.best}/{a.total}</Badge> : <Badge tone="gray">{tc("new")}</Badge>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </section>

        <Card className="p-0">
          <div className="px-4 pt-4"><CardTitle>{t("lastAttempts")}</CardTitle></div>
          {attempts.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted">{t("noAttempts")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {attempts.map((h) => (
                <li key={h.id}>
                  <Link href={h.source === "exam" ? `/examens/blanc/${h.quizId}` : `/quiz/${h.quizId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium text-ink">{h.title}</div>
                      <div className="text-xs text-muted">
                        {h.subject} · {format.dateTime(h.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{h.durationS ? ` · ${tc("minutes", { count: Math.max(1, Math.round(h.durationS / 60)) })}` : ""}
                      </div>
                    </div>
                    <Badge tone={h.score / h.total >= 0.7 ? "green" : h.score / h.total >= 0.5 ? "warning" : "danger"}>{h.score}/{h.total}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
