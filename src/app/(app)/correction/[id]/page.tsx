import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, CheckCircle2, MessageCircleQuestion, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { aiMode } from "@/server/ai/provider";
import type { Grading } from "@/server/ai/schemas";
import { getSubmission } from "@/server/grading/service";
import { deleteSubmissionAction, gradeSubmissionAction } from "@/server/learning/actions";
import { cn } from "@/lib/utils";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function GradingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { user } = await requireUser();
  const db = await getDb();
  const sub = await getSubmission(db, user.id, id);
  if (!sub) notFound();
  const t = await getTranslations("grading");
  const tc = await getTranslations("common");
  const error = one(sp.erreur);
  const demo = aiMode() === "demo";
  const analysis = (sub.analysis ?? {}) as Partial<Grading> & { warning?: string };
  const graded = sub.status === "graded" && Array.isArray(analysis.steps);
  const step = graded ? 2 : 1;
  const stepLabels = [t("steps.upload"), t("steps.verify"), t("steps.result")];
  const hasFile = Boolean(sub.storageKey);
  const isImage = sub.mime?.startsWith("image/") ?? false;
  const lowConfidence = (sub.confidence ?? 100) < 70;
  const grade = graded && sub.hasScale && analysis.grade ? analysis.grade : null;
  const askHref = `/tuteur?q=${encodeURIComponent(`Peux-tu m'expliquer la correction de cet exercice ? ${(sub.recognizedText ?? "").slice(0, 300)}`)}`;

  return (
    <>
      <PageHeader title={t("title")} back="/correction" />
      <div className="space-y-4">
        <ol className="flex items-center gap-2" aria-label="Étapes">
          {stepLabels.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", i < step ? "bg-green text-white" : i === step ? "bg-black text-white" : "bg-line text-muted")}>{i < step ? "✓" : i + 1}</span>
              <span className={cn("truncate text-xs font-semibold", i === step ? "text-ink" : "text-muted")}>{s}</span>
              {i < 2 ? <span className="h-px flex-1 bg-line" /> : null}
            </li>
          ))}
        </ol>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <span>{tc.has(`errors.${error}`) ? tc(`errors.${error}`) : tc("errors.unknown")}{error === "premium_required" ? <> · <Link href="/abonnement" className="font-bold underline">{tc("subscribe")}</Link></> : null}</span>
          </div>
        ) : null}
        {analysis.warning && !graded ? <div className="flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-ink"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {analysis.warning}</div> : null}

        {hasFile ? (
          <Card className="p-0">
            <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">{t("photo")}</div>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/corrections/${sub.id}/fichier`} alt="" className="mt-2 max-h-72 w-full rounded-b-[var(--radius-card)] object-contain" />
            ) : (
              <a href={`/api/corrections/${sub.id}/fichier`} target="_blank" rel="noopener" className="block px-4 py-3 text-sm font-semibold text-green">PDF ↗</a>
            )}
          </Card>
        ) : null}

        {step === 1 ? (
          <form action={gradeSubmissionAction} className="space-y-4">
            <input type="hidden" name="submissionId" value={sub.id} />
            <Card>
              <CardTitle action={sub.confidence != null ? <Badge tone={lowConfidence ? "warning" : "green"}>{t("confidence", { percent: sub.confidence })}</Badge> : undefined}>{t("recognizedTitle")}</CardTitle>
              <p className="mb-3 text-xs text-muted">{sub.recognizedText ? t("recognizedHint") : t("recognizedEmpty")}</p>
              {lowConfidence && sub.recognizedText ? <p className="mb-2 text-xs font-semibold text-warning">{t("lowConfidence")}</p> : null}
              <Textarea name="text" defaultValue={sub.recognizedText ?? ""} required maxLength={8000} className="min-h-44 font-mono text-sm" />
            </Card>
            <SubmitButton size="lg" full pendingLabel={t("pending")}><CheckCircle2 className="size-5" /> {t("confirm")}</SubmitButton>
            {demo ? <p className="text-center text-xs text-muted">{t("demoNotice")}</p> : null}
          </form>
        ) : null}

        {step === 2 ? (
          <>
            {grade ? (
              <div className="rounded-[var(--radius-card)] bg-green p-5 text-white shadow-[var(--shadow-card)]">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-90">{t("gradeTitle")}</div>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-5xl font-extrabold leading-none">{grade.value.toLocaleString("fr-FR")}</span>
                  <span className="pb-1 text-xl font-semibold opacity-90">/ {grade.outOf}</span>
                </div>
                <div className="mt-2 text-sm">{grade.comment}</div>
                <p className="mt-3 text-xs opacity-85">{t("gradeNote")}</p>
              </div>
            ) : (
              <Card className="bg-info-soft"><p className="text-sm text-ink">{t("noGrade")}</p></Card>
            )}
            {demo ? <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-ink">{t("demoNotice")}</p> : null}

            {analysis.summary ? (
              <Card>
                <CardTitle>{t("summary")}</CardTitle>
                <p className="text-[15px] text-ink">{analysis.summary}</p>
              </Card>
            ) : null}

            <Card>
              <CardTitle>{t("stepsTitle")}</CardTitle>
              <ol className="space-y-2.5">
                {(analysis.steps ?? []).map((s, i) => (
                  <li key={i} className="flex gap-3 text-[15px] text-ink">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-soft text-xs font-bold text-green-ink">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card>
              <CardTitle>{t("errorsTitle")}</CardTitle>
              {(analysis.errors ?? []).length === 0 ? (
                <p className="text-sm text-ink">{t("noErrors")}</p>
              ) : (
                <ul className="space-y-3">
                  {(analysis.errors ?? []).map((e, i) => (
                    <li key={i} className="rounded-xl bg-danger-soft p-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-danger"><AlertTriangle className="size-4" /> {e.where}</div>
                      <div className="mt-1 text-[15px] text-ink">{e.what}</div>
                      <div className="mt-1 text-sm text-muted">{e.why}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {(analysis.improve ?? []).length > 0 ? (
              <Card>
                <CardTitle>{t("improveTitle")}</CardTitle>
                <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-ink">
                  {(analysis.improve ?? []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </Card>
            ) : null}

            <details className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">{t("recognizedTitle")}</summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-muted">{sub.recognizedText}</pre>
            </details>

            <ButtonLink href={askHref} variant="secondary" size="lg" full><MessageCircleQuestion className="size-5" /> {t("askTutor")}</ButtonLink>
            <ButtonLink href="/correction" variant="outline" size="lg" full>{t("newGrading")}</ButtonLink>
          </>
        ) : null}

        <form action={deleteSubmissionAction} className="pb-2">
          <input type="hidden" name="submissionId" value={sub.id} />
          <ConfirmSubmit message={tc("confirmDelete")} className="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-muted hover:text-danger">
            <Trash2 className="size-4" /> {t("delete")}
          </ConfirmSubmit>
        </form>
      </div>
    </>
  );
}
