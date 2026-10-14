"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Camera, CheckCircle2, FileUp, ImageIcon, MessageCircleQuestion, ScanText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Select, Textarea, Toggle } from "@/components/ui/form";
import { mockGrading, mockSubjects } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2;

export function GradingFlow() {
  const t = useTranslations("grading");
  const tc = useTranslations("common");
  const tt = useTranslations("tutor");
  const labels = {
    steps: { upload: t("steps.upload"), verify: t("steps.verify"), result: t("steps.result") },
    takePhoto: t("takePhoto"),
    chooseFile: t("chooseFile"),
    acceptedFormats: t("acceptedFormats"),
    tips: t("tips"),
    subjectLabel: t("subjectLabel"),
    hasScale: t("hasScale"),
    analyze: t("analyze"),
    recognizedTitle: t("recognizedTitle"),
    recognizedHint: t("recognizedHint"),
    confidence: t("confidence", { percent: mockGrading.confidence }),
    confirm: t("confirm"),
    stepsTitle: t("stepsTitle"),
    errorsTitle: t("errorsTitle"),
    noErrors: t("noErrors"),
    improveTitle: t("improveTitle"),
    gradeTitle: t("gradeTitle"),
    gradeNote: t("gradeNote"),
    noGrade: t("noGrade"),
    askTutor: t("askTutor"),
    newGrading: t("newGrading"),
    back: tc("back"),
    exampleNotice: tt("exampleNotice"),
  };
  const [step, setStep] = useState<Step>(0);
  const [picked, setPicked] = useState<{ file: File; preview: string | null } | null>(null);
  const file = picked?.file ?? null;
  const preview = picked?.preview ?? null;
  const previewRef = useRef<string | null>(null);
  const [hasScale, setHasScale] = useState(true);
  const [text, setText] = useState(mockGrading.recognizedText);
  const [loading, setLoading] = useState(false);

  /** Sélection d'un fichier : aperçu local (URL d'objet) libéré à chaque changement et au démontage. */
  function setFile(f: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
    previewRef.current = url;
    setPicked(f ? { file: f, preview: url } : null);
  }
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  function go(next: Step) {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setStep(next);
      window.scrollTo({ top: 0 });
    }, 900);
  }

  const stepLabels = [labels.steps.upload, labels.steps.verify, labels.steps.result];

  return (
    <div className="space-y-4">
      <ol className="flex items-center gap-2" aria-label="Étapes">
        {stepLabels.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                i < step ? "bg-green text-white" : i === step ? "bg-black text-white" : "bg-line text-muted",
              )}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className={cn("truncate text-xs font-semibold", i === step ? "text-ink" : "text-muted")}>{s}</span>
            {i < 2 ? <span className="h-px flex-1 bg-line" /> : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <>
          <Card>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-green px-3 py-6 text-center text-white">
                <Camera className="size-7" />
                <span className="text-sm font-bold">{labels.takePhoto}</span>
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3 py-6 text-center text-ink">
                <FileUp className="size-7" />
                <span className="text-sm font-bold">{labels.chooseFile}</span>
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <p className="mt-3 text-center text-xs text-muted">{labels.acceptedFormats}</p>
            {file ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface-2">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="max-h-64 w-full object-contain" />
                ) : (
                  <div className="flex items-center gap-2 p-3 text-sm text-ink"><ImageIcon className="size-4" /> {file.name}</div>
                )}
                <div className="flex items-center justify-between px-3 py-2 text-xs text-muted">
                  <span className="truncate">{file.name}</span>
                  <span>{Math.max(1, Math.round(file.size / 1024))} Ko</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-info-soft px-3 py-2 text-xs text-ink">{labels.tips}</p>
            )}
          </Card>

          <Card className="space-y-4">
            <Field label={labels.subjectLabel} htmlFor="subject">
              <Select id="subject" defaultValue="maths">
                {mockSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Toggle id="scale" checked={hasScale} onChange={setHasScale} label={labels.hasScale} />
          </Card>

          <Button size="lg" full loading={loading} onClick={() => go(1)}>
            <ScanText className="size-5" /> {labels.analyze}
          </Button>
          <p className="text-center text-xs text-muted">{labels.exampleNotice}</p>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Card>
            <CardTitle action={<Badge tone="green">{labels.confidence}</Badge>}>{labels.recognizedTitle}</CardTitle>
            <p className="mb-3 text-xs text-muted">{labels.recognizedHint}</p>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-44 font-mono text-sm" />
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(0)}>{labels.back}</Button>
            <Button size="lg" className="flex-[2]" loading={loading} onClick={() => go(2)}>
              <CheckCircle2 className="size-5" /> {labels.confirm}
            </Button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          {hasScale ? (
            <div className="rounded-[var(--radius-card)] bg-green p-5 text-white shadow-[var(--shadow-card)]">
              <div className="text-xs font-semibold uppercase tracking-wide opacity-90">{labels.gradeTitle}</div>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-5xl font-extrabold leading-none">{mockGrading.grade.value}</span>
                <span className="pb-1 text-xl font-semibold opacity-90">/ {mockGrading.grade.outOf}</span>
              </div>
              <div className="mt-2 text-sm">{mockGrading.grade.comment}</div>
              <p className="mt-3 text-xs opacity-85">{labels.gradeNote}</p>
            </div>
          ) : (
            <Card className="bg-info-soft">
              <p className="text-sm text-ink">{labels.noGrade}</p>
            </Card>
          )}

          <Card>
            <CardTitle>{labels.stepsTitle}</CardTitle>
            <ol className="space-y-2.5">
              {mockGrading.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-[15px] text-ink">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-soft text-xs font-bold text-green-ink">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardTitle>{labels.errorsTitle}</CardTitle>
            {mockGrading.errors.length === 0 ? (
              <p className="text-sm text-ink">{labels.noErrors}</p>
            ) : (
              <ul className="space-y-3">
                {mockGrading.errors.map((e, i) => (
                  <li key={i} className="rounded-xl bg-danger-soft p-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-danger"><AlertTriangle className="size-4" /> {e.where}</div>
                    <div className="mt-1 text-[15px] text-ink">{e.what}</div>
                    <div className="mt-1 text-sm text-muted">{e.why}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle>{labels.improveTitle}</CardTitle>
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-ink">
              {mockGrading.improve.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </Card>

          <ButtonLink href="/tuteur" variant="secondary" size="lg" full>
            <MessageCircleQuestion className="size-5" /> {labels.askTutor}
          </ButtonLink>
          <Button variant="outline" size="lg" full onClick={() => { setStep(0); setFile(null); }}>
            {labels.newGrading}
          </Button>
        </>
      ) : null}
    </div>
  );
}
