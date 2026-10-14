import { getTranslations } from "next-intl/server";
import { Camera, FileText, ListChecks, MessageCircleQuestion, Plus, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { ProgressBar, toneForScore } from "@/components/ui/progress";
import { mockProgress, mockSubjects } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const days = ["L", "M", "M", "J", "V", "S", "D"];

export default async function ProgressPage() {
  const t = await getTranslations("progress");
  const tc = await getTranslations("common");
  const max = Math.max(...mockProgress.weekActivity, 1);
  const stats = [
    { key: "questions", Icon: MessageCircleQuestion, value: mockProgress.stats.questions },
    { key: "quizzes", Icon: ListChecks, value: mockProgress.stats.quizzes },
    { key: "gradings", Icon: Camera, value: mockProgress.stats.gradings },
    { key: "docs", Icon: FileText, value: mockProgress.stats.docs },
  ] as const;

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} back="/accueil" />
      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] bg-green p-5 text-white shadow-[var(--shadow-card)]">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-90">{t("overall")}</div>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-5xl font-extrabold leading-none">{mockProgress.overall.toLocaleString("fr-FR")}</span>
            <span className="pb-1 text-xl font-semibold opacity-90">/ 20</span>
          </div>
          <p className="mt-2 text-xs opacity-85">{t("basedOn")}</p>
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
          <ul className="space-y-3">
            {mockSubjects.map((s) => (
              <li key={s.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{s.emoji} {s.name}</span>
                  <span className="flex items-center gap-1.5">
                    {s.trend !== 0 ? (
                      <span className={cn("flex items-center text-xs font-semibold", s.trend > 0 ? "text-green" : "text-danger")}>
                        {s.trend > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}{s.trend > 0 ? "+" : ""}{s.trend}
                      </span>
                    ) : null}
                    <span className="font-bold text-ink">{s.score} %</span>
                  </span>
                </div>
                <ProgressBar value={s.score} tone={toneForScore(s.score)} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>{t("weekActivity")}</CardTitle>
          <div className="flex h-24 items-end justify-between gap-2">
            {mockProgress.weekActivity.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div className={cn("w-full rounded-t-md", v ? "bg-green" : "bg-line")} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} aria-label={`${v}`} />
                </div>
                <span className="text-[10px] font-semibold text-muted">{days[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card>
            <CardTitle>{t("strengths")}</CardTitle>
            <ul className="space-y-1.5">
              {mockProgress.strengths.map((s) => <li key={s} className="flex items-center gap-2 text-sm text-ink"><Badge tone="green">✓</Badge> {s}</li>)}
            </ul>
          </Card>
          <Card>
            <CardTitle>{t("difficulties")}</CardTitle>
            <ul className="space-y-1.5">
              {mockProgress.difficulties.map((s) => <li key={s} className="flex items-center gap-2 text-sm text-ink"><Badge tone="danger">!</Badge> {s}</li>)}
            </ul>
          </Card>
        </div>

        <Card>
          <CardTitle action={<Button variant="ghost" size="sm" className="text-green"><Plus className="size-4" /> {t("addGoal")}</Button>}>
            <span className="flex items-center gap-2"><Target className="size-4 text-green" /> {t("goals")}</span>
          </CardTitle>
          <ul className="space-y-3">
            {mockProgress.goals.map((g) => (
              <li key={g.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-ink">{g.title}</span>
                  <span className="shrink-0 text-xs text-muted">{g.due}</span>
                </div>
                <ProgressBar value={g.progress} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>{t("revisionPlan")}</CardTitle>
          <ul className="space-y-2">
            {mockProgress.revisionSessions.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{r.title}</div>
                  <div className="text-xs text-muted">{r.subject} · {tc("minutes", { count: r.minutes })} · {r.why}</div>
                </div>
                <ButtonLink href="/quiz/jouer" size="sm" variant="secondary" className="shrink-0">{tc("start")}</ButtonLink>
              </li>
            ))}
          </ul>
          <Button variant="outline" full className="mt-3"><Sparkles className="size-4 text-green" /> {t("generatePlan")}</Button>
        </Card>
      </div>
    </>
  );
}
