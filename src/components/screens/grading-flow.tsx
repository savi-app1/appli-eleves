"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, FileUp, ImageIcon, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { compressImage, setInputFile } from "@/lib/compress-image";

/** Étape 1 : envoi du devoir (photo/PDF et/ou texte saisi). Formulaire classique vers /api/corrections. */
export function GradingUpload({ subjects, demo }: { subjects: string[]; demo: boolean }) {
  const t = useTranslations("grading");
  const [picked, setPicked] = useState<{ file: File; preview: string | null } | null>(null);
  const previewRef = useRef<string | null>(null);
  const [hasScale, setHasScale] = useState(false);
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyFile(f: File | null, source: HTMLInputElement | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
    previewRef.current = url;
    setPicked(f ? { file: f, preview: url } : null);
    // Un seul champ `file` est envoyé : on recopie la sélection (caméra ou fichier compressé) dans le champ principal.
    if (f && fileInputRef.current && (source !== fileInputRef.current || f !== source?.files?.[0])) setInputFile(fileInputRef.current, f);
  }
  function setFile(f: File | null, source: HTMLInputElement | null) {
    if (!f || !f.type.startsWith("image/")) return applyFile(f, source);
    // Photos : compression côté téléphone avant envoi (réseaux lents), aperçu immédiat.
    applyFile(f, source);
    void compressImage(f).then((c) => { if (c !== f) applyFile(c, source); });
  }
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const canSubmit = Boolean(picked) || typed.trim().length > 0;

  return (
    <form action="/api/corrections" method="post" encType="multipart/form-data" className="space-y-4" onSubmit={() => setLoading(true)}>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-green px-3 py-6 text-center text-white">
            <Camera className="size-7" />
            <span className="text-sm font-bold">{t("takePhoto")}</span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null, e.target)} />
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-3 py-6 text-center text-ink">
            <FileUp className="size-7" />
            <span className="text-sm font-bold">{t("chooseFile")}</span>
            <input ref={fileInputRef} name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null, e.target)} />
          </label>
        </div>
        <p className="mt-3 text-center text-xs text-muted">{t("acceptedFormats")}</p>
        {picked ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface-2">
            {picked.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={picked.preview} alt="" className="max-h-64 w-full object-contain" />
            ) : (
              <div className="flex items-center gap-2 p-3 text-sm text-ink"><ImageIcon className="size-4" /> {picked.file.name}</div>
            )}
            <div className="flex items-center justify-between px-3 py-2 text-xs text-muted">
              <span className="truncate">{picked.file.name}</span>
              <span>{Math.max(1, Math.round(picked.file.size / 1024))} Ko</span>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-info-soft px-3 py-2 text-xs text-ink">{t("tips")}</p>
        )}
      </Card>

      <Card className="space-y-4">
        <Field label={t("typeInstead")} htmlFor="text">
          <Textarea id="text" name="text" value={typed} onChange={(e) => setTyped(e.target.value)} rows={4} maxLength={8000} placeholder={t("typedPlaceholder")} />
        </Field>
        <Field label={t("subjectLabel")} htmlFor="subject">
          <Select id="subject" name="subject" defaultValue={subjects[0] ?? "Mathématiques"}>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Toggle id="hasScale" checked={hasScale} onChange={setHasScale} label={t("hasScale")} />
        <input type="hidden" name="hasScale" value={hasScale ? "on" : ""} />
        {hasScale ? (
          <Field label={t("outOfLabel")} htmlFor="outOf"><Input id="outOf" name="outOf" type="number" min={1} max={100} defaultValue={20} className="max-w-32" /></Field>
        ) : null}
      </Card>

      <Button type="submit" size="lg" full loading={loading} disabled={!canSubmit || loading}>
        <ScanText className="size-5" /> {loading ? t("pending") : t("analyze")}
      </Button>
      <p className="text-center text-xs text-muted">{canSubmit ? (demo ? t("demoNotice") : "") : t("textOrFile")}</p>
    </form>
  );
}
