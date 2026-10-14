import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { ExamFilters } from "@/components/screens/exam-filters";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { aiMode } from "@/server/ai/provider";
import { listAttempts, listQuizzes } from "@/server/quiz/service";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ExamsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { user } = await requireUser();
  const db = await getDb();
  const t = await getTranslations("exams");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const error = one(sp.erreur);
  const [quizzes, attempts] = await Promise.all([listQuizzes(db, user.id, 50), listAttempts(db, user.id, 50)]);
  const exams = quizzes.filter((q) => q.source === "exam");
  const attemptsFor = (quizId: string) => attempts.filter((a) => a.quizId === quizId);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} back="/accueil" />
      <div className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <span>{tc.has(`errors.${error}`) ? tc(`errors.${error}`) : tc("errors.unknown")}{error === "premium_required" ? <> · <Link href="/abonnement" className="font-bold underline">{tc("subscribe")}</Link></> : null}</span>
          </div>
        ) : null}
        <ExamFilters defaultCountry={user.country} demo={aiMode() === "demo"} />
        <Card className="p-0">
          <div className="px-4 pt-4"><CardTitle>{t("pastResults")}</CardTitle></div>
          {exams.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted">{t("pastEmpty")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {exams.map((e) => {
                const att = attemptsFor(e.id);
                const last = att[0];
                return (
                  <li key={e.id}>
                    <Link href={`/examens/blanc/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-medium text-ink">{e.title}</div>
                        <div className="text-xs text-muted">
                          {format.dateTime(e.createdAt, { day: "numeric", month: "short" })} · {t("mockTimed", { minutes: e.minutes ?? 0 })} · {tc("questions", { count: (e.questions as unknown[]).length })}
                        </div>
                      </div>
                      {last ? (
                        <span className="text-lg font-extrabold text-ink">{last.score}<span className="text-xs font-semibold text-muted">/{last.total}</span></span>
                      ) : (
                        <span className="text-xs font-semibold text-green">{tc("start")}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
