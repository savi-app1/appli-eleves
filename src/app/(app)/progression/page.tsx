import { getFormatter, getTranslations } from "next-intl/server";
import { Camera, FileText, Flame, ListChecks, MessageCircleQuestion, Plus, Sparkles, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page";
import { ProgressBar, toneForScore } from "@/components/ui/progress";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { getProgress } from "@/server/progress/service";
import { addGoalAction, deleteGoalAction, generateQuizAction, updateGoalAction } from "@/server/learning/actions";
import { cn } from "@/lib/utils";

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

export default async function ProgressPage() {
  const { user } = await requireUser();
  const db = await getDb();
  const t = await getTranslations("progress");
  const th = await getTranslations("home");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const p = await getProgress(db, user.id);
  const max = Math.max(...p.weekActivity, 1);
  const stats = [
    { key: "questions", Icon: MessageCircleQuestion, value: p.stats.questions },
    { key: "quizzes", Icon: ListChecks, value: p.stats.quizzes },
    { key: "gradings", Icon: Camera, value: p.stats.gradings },
    { key: "docs", Icon: FileText, value: p.stats.docs },
  ] as const;
  // Lettres des 7 derniers jours (le dernier = aujourd'hui)
  const todayIdx = (new Date().getDay() + 6) % 7;
  const letters = Array.from({ length: 7 }, (_, i) => DAY_LETTERS[(todayIdx - 6 + i + 7) % 7]);
  // Séances de révision proposées : d'abord les difficultés, sinon des thèmes de démarrage par matière.
  const sessions = p.difficulties.length
    ? p.difficulties.slice(0, 3).map((d) => ({ subject: d.subject, topic: d.topic, why: t("sessionWhy.weak", { percent: d.percent }) }))
    : [{ subject: "Mathématiques", topic: "Théorème de Pythagore", why: t("sessionWhy.new") }, { subject: "Français", topic: "Le discours rapporté", why: t("sessionWhy.new") }];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} back="/accueil" />
      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] bg-green p-5 text-white shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-90">{t("overall")}</div>
            <Badge tone="gray" className="bg-white/15 text-white"><Flame className="size-3.5" /> {t("streak", { count: p.streakDays })}</Badge>
          </div>
          {p.overallPercent === null ? (
            <p className="mt-2 text-sm">{t("noData")}</p>
          ) : (
            <div className="mt-1 flex items-end gap-2">
              <span className="text-5xl font-extrabold leading-none">{p.overallPercent}</span>
              <span className="pb-1 text-xl font-semibold opacity-90">%</span>
            </div>
          )}
          <p className="mt-2 text-xs opacity-85">{t("overallHint")}</p>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span>{th("weeklyGoal")}</span>
            <span className="font-semibold">{th("weeklyGoalProgress", { done: p.weeklyGoal.done, total: p.weeklyGoal.total })}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (p.weeklyGoal.done / p.weeklyGoal.total) * 100)}%` }} /></div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {stats.map(({ key, Icon, value }) => (
            <Card key={key} className="flex flex-col items-center p-3 text-center">
              <Icon className="size-5 text-green" />
              <div className="mt-1 text-lg font-extrabold text-ink">{value}</div>
              <div className="text-[10px] leading-tight text-muted">{t(`stats.${key}`)}</div>
            </Card>
          ))}
        </div>

        <Card>
          <CardTitle>{t("bySubject")}</CardTitle>
          {p.bySubject.length === 0 ? (
            <p className="text-sm text-muted">{t("noData")}</p>
          ) : (
            <ul className="space-y-3">
              {p.bySubject.map((s) => (
                <li key={s.subject}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{s.subject}</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">{s.attempts} quiz <span className="font-bold text-ink">{s.percent} %</span></span>
                  </div>
                  <ProgressBar value={s.percent} tone={toneForScore(s.percent)} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>{t("weekActivity")}</CardTitle>
          <div className="flex h-24 items-end justify-between gap-2">
            {p.weekActivity.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div className={cn("w-full rounded-t-md", v ? "bg-green" : "bg-line")} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} aria-label={`${v}`} />
                </div>
                <span className={cn("text-[10px] font-semibold", i === 6 ? "text-ink" : "text-muted")}>{letters[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card>
            <CardTitle>{t("strengths")}</CardTitle>
            {p.strengths.length === 0 ? <p className="text-sm text-muted">{t("noStrengths")}</p> : (
              <ul className="space-y-1.5">
                {p.strengths.map((s) => <li key={`${s.subject}-${s.topic}`} className="flex items-center gap-2 text-sm text-ink"><Badge tone="green">✓</Badge> <span className="min-w-0 flex-1 truncate">{s.topic}</span><span className="text-xs text-muted">{s.percent} %</span></li>)}
              </ul>
            )}
          </Card>
          <Card>
            <CardTitle>{t("difficulties")}</CardTitle>
            {p.difficulties.length === 0 ? <p className="text-sm text-muted">{t("noDifficulties")}</p> : (
              <ul className="space-y-1.5">
                {p.difficulties.map((s) => <li key={`${s.subject}-${s.topic}`} className="flex items-center gap-2 text-sm text-ink"><Badge tone="danger">!</Badge> <span className="min-w-0 flex-1 truncate">{s.topic}</span><span className="text-xs text-muted">{t("topicStat", { correct: s.correct, total: s.total })}</span></li>)}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <CardTitle><span className="flex items-center gap-2"><Target className="size-4 text-green" /> {t("goals")}</span></CardTitle>
          {p.goals.length === 0 ? <p className="mb-3 text-sm text-muted">{t("noGoals")}</p> : (
            <ul className="mb-4 space-y-3">
              {p.goals.map((g) => (
                <li key={g.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{g.title}</span>
                    {g.targetDate ? <span className="shrink-0 text-xs text-muted">{format.dateTime(new Date(g.targetDate), { day: "numeric", month: "short" })}</span> : null}
                    <form action={deleteGoalAction}><input type="hidden" name="id" value={g.id} /><button type="submit" aria-label={tc("delete")} className="text-muted hover:text-danger"><Trash2 className="size-4" /></button></form>
                  </div>
                  <ProgressBar value={g.progress} />
                  <form action={updateGoalAction} className="mt-1.5 flex items-center gap-2">
                    <input type="hidden" name="id" value={g.id} />
                    <label className="text-xs text-muted" htmlFor={`p-${g.id}`}>{t("goalProgress")}</label>
                    <Select id={`p-${g.id}`} name="progress" defaultValue={String(g.progress)} className="h-8 w-24 py-0 text-xs">{[0, 10, 25, 50, 75, 90, 100].map((v) => <option key={v} value={v}>{v} %</option>)}</Select>
                    <button type="submit" className="text-xs font-semibold text-green">{t("markProgress")}</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={addGoalAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1"><Field label={t("addGoal")} htmlFor="goal-title"><Input id="goal-title" name="title" required maxLength={120} placeholder={t("goalPlaceholder")} /></Field></div>
            <Field label={t("goalDate")} htmlFor="goal-date"><Input id="goal-date" name="targetDate" type="date" /></Field>
            <SubmitButton variant="secondary"><Plus className="size-4" /> {tc("save")}</SubmitButton>
          </form>
        </Card>

        <Card>
          <CardTitle>{t("revisionPlan")}</CardTitle>
          <p className="mb-3 text-xs text-muted">{t("revisionHint")}</p>
          <ul className="space-y-2">
            {sessions.map((r) => (
              <li key={`${r.subject}-${r.topic}`} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{r.topic}</div>
                  <div className="text-xs text-muted">{r.subject} · {tc("minutes", { count: 10 })} · {r.why}</div>
                </div>
                <form action={generateQuizAction}>
                  <input type="hidden" name="subject" value={r.subject} />
                  <input type="hidden" name="topic" value={r.topic} />
                  <input type="hidden" name="count" value="5" />
                  <input type="hidden" name="source" value="revision" />
                  <input type="hidden" name="back" value="/progression" />
                  <SubmitButton size="sm" variant="secondary" className="shrink-0" pendingLabel={tc("generating")}><Sparkles className="size-4" /> {tc("start")}</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
