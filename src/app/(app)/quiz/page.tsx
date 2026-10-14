import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, FolderOpen, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { mockQuiz, mockQuizHistory, mockSubjects } from "@/lib/mock-data";

export default async function QuizHubPage() {
  const t = await getTranslations("quiz");
  const tc = await getTranslations("common");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] bg-green p-5 text-white shadow-[var(--shadow-card)]">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-90">{t("start")}</div>
          <div className="mt-1 text-lg font-extrabold leading-tight">{mockQuiz.title}</div>
          <div className="mt-1 text-sm opacity-90">{mockQuiz.subject} · {tc("questions", { count: mockQuiz.questions.length })} · {t("types.mcq")}, {t("types.truefalse")}, {t("types.short")}</div>
          <ButtonLink href="/quiz/jouer" variant="black" size="lg" className="mt-4 w-full bg-white text-green hover:bg-white/90">
            <Play className="size-5" /> {tc("start")}
          </ButtonLink>
        </div>

        <Card className="p-0">
          <div className="px-4 pt-4"><CardTitle>{t("fromCourse")}</CardTitle></div>
          <Link href="/cours" className="flex items-center gap-3 border-t border-line px-4 py-3 hover:bg-surface-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-green-soft text-green-ink"><FolderOpen className="size-5" /></span>
            <span className="flex-1 text-[15px] font-medium text-ink">{t("fromCourse")}</span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        </Card>

        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("bySubject")}</div>
          <div className="grid grid-cols-2 gap-3">
            {mockSubjects.map((s) => (
              <Link key={s.id} href="/quiz/jouer" className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 hover:bg-surface-2">
                <span className="text-2xl">{s.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{s.name}</span>
                  <span className="block text-xs text-muted">{s.score} %</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <Card className="p-0">
          <div className="px-4 pt-4"><CardTitle>{t("lastAttempts")}</CardTitle></div>
          <ul className="divide-y divide-line">
            {mockQuizHistory.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium text-ink">{h.title}</div>
                  <div className="text-xs text-muted">{h.subject} · {h.date} · {tc("minutes", { count: h.durationMin })}</div>
                </div>
                <Badge tone={h.score / h.total >= 0.7 ? "green" : h.score / h.total >= 0.5 ? "warning" : "danger"}>{h.score}/{h.total}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
