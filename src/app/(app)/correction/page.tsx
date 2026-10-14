import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { AlertTriangle, Camera, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { GradingUpload } from "@/components/screens/grading-flow";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { aiMode } from "@/server/ai/provider";
import { listSubjects } from "@/server/documents/service";
import { listSubmissions } from "@/server/grading/service";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function GradingPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { user } = await requireUser();
  const db = await getDb();
  const t = await getTranslations("grading");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const error = one(sp.erreur);
  const [subjects, history] = await Promise.all([listSubjects(db, user.id), listSubmissions(db, user.id, 15)]);
  const statusTone = { recognized: "warning", graded: "green", failed: "danger", uploaded: "gray" } as const;

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
        <GradingUpload subjects={subjects.length ? subjects.map((s) => s.name) : ["Mathématiques", "Français", "Physique-Chimie", "SVT", "Histoire-Géographie", "Anglais"]} demo={aiMode() === "demo"} />

        <Card className="p-0">
          <div className="px-4 pt-4"><CardTitle>{t("history")}</CardTitle></div>
          {history.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted">{t("historyEmpty")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {history.map((h) => (
                <li key={h.id}>
                  <Link href={`/correction/${h.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink"><Camera className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink">{(h.recognizedText ?? "").split("\n")[0]?.slice(0, 80) || tc("untitled")}</span>
                      <span className="block text-xs text-muted">{[h.subject, format.dateTime(h.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })].filter(Boolean).join(" · ")}</span>
                    </span>
                    {h.status === "graded" && h.gradeValue ? (
                      <Badge tone="green">{Number(h.gradeValue).toLocaleString("fr-FR")}/{Number(h.gradeOutOf ?? 20)}</Badge>
                    ) : (
                      <Badge tone={statusTone[h.status]}>{t(`status.${h.status === "uploaded" ? "pending" : h.status}`)}</Badge>
                    )}
                    <ChevronRight className="size-4 text-muted" />
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
