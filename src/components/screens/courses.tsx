"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, FileText, ImageIcon, Loader2, MessageCircleQuestion, Plus, Search, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Toggle } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/page";
import { cn } from "@/lib/utils";

export interface CourseDoc {
  id: string;
  title: string;
  chapter: string | null;
  subjectId: string | null;
  mime: string;
  pages: number | null;
  status: "processing" | "ready" | "failed";
  failureReason: string | null;
  createdAt: string;
}
export interface CourseSubject {
  id: string;
  name: string;
  emoji: string | null;
}
interface SearchHit {
  documentId: string;
  title: string;
  page: number | null;
  snippet: string;
}

export function CoursesScreen({ docs, subjects, error, openImport }: { docs: CourseDoc[]; subjects: CourseSubject[]; error?: string | null; openImport?: boolean }) {
  const t = useTranslations("courses");
  const tc = useTranslations("common");
  const format = useFormatter();
  const labels = {
    import: t("import"),
    importHint: t("importHint"),
    searchPlaceholder: t("searchPlaceholder"),
    subjects: t("subjects"),
    pages: (n: number) => t("pages", { count: n }),
    actions: { summary: t("actions.summary"), quiz: t("actions.quiz"), exercises: t("actions.exercises"), ask: t("actions.ask") },
    strictMode: t("strictMode"),
    strictModeHint: t("strictModeHint"),
    strictOn: (n: number) => t("strictOn", { count: n }),
    status: { ready: t("status.ready"), processing: t("status.processing"), failed: t("status.failed") },
    empty: t("empty"),
    selectForStrict: t("selectForStrict"),
    all: tc("seeAll"),
  };
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [strict, setStrict] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(Boolean(openImport));
  const [importing, setImporting] = useState(false);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) if (d.subjectId) m.set(d.subjectId, (m.get(d.subjectId) ?? 0) + 1);
    return m;
  }, [docs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => (!subject || d.subjectId === subject) && (!q || d.title.toLowerCase().includes(q) || (d.chapter ?? "").toLowerCase().includes(q)));
  }, [docs, query, subject]);

  // Recherche dans le contenu (plein texte côté serveur), avec anti-rebond.
  useEffect(() => {
    const q = query.trim();
    abortRef.current?.abort();
    if (q.length < 3) {
      const id = window.setTimeout(() => setHits(null), 0);
      return () => window.clearTimeout(id);
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const id = window.setTimeout(() => {
      fetch(`/api/documents/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { hits: [] }))
        .then((j: { hits: SearchHit[] }) => setHits(j.hits))
        .catch(() => {});
    }, 350);
    return () => {
      window.clearTimeout(id);
      ctrl.abort();
    };
  }, [query]);

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const strictHref = `/tuteur?strict=1&docs=${Array.from(selected).join(",")}`;
  const subjectOf = (id: string | null) => subjects.find((s) => s.id === id);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>{tc.has(`errors.${error}`) ? tc(`errors.${error}`) : tc("errors.unknown")}</span>
        </div>
      ) : null}

      <div className="flex gap-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
            className="h-12 w-full rounded-[var(--radius-btn)] border border-line bg-surface pr-3 pl-10 text-base text-ink placeholder:text-muted focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25"
          />
        </label>
        <Button className="h-12 shrink-0 px-3.5" aria-label={labels.import} aria-expanded={showImport} onClick={() => setShowImport((v) => !v)}>
          {showImport ? <X className="size-5" /> : <Plus className="size-5" />} <span className="hidden sm:inline">{labels.import}</span>
        </Button>
      </div>
      <p className="-mt-2 text-xs text-muted">{labels.importHint}</p>

      {showImport ? (
        <Card className="animate-fade-up border-green">
          <form action="/api/documents" method="post" encType="multipart/form-data" className="space-y-3" onSubmit={() => setImporting(true)}>
            <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><Upload className="size-4 text-green" /> {t("importTitle")}</div>
            <Field label={t("importFile")} htmlFor="file">
              <input id="file" name="file" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className="block w-full text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-green-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-green-ink" />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label={`${t("titleLabel")} (${tc("optional")})`} htmlFor="title"><Input id="title" name="title" maxLength={160} /></Field>
              <Field label={t("subjectLabel")} htmlFor="subjectId">
                <Select id="subjectId" name="subjectId" defaultValue="">
                  <option value="">{t("noSubject")}</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ""}{s.name}</option>)}
                </Select>
              </Field>
              <Field label={`${t("chapterLabel")} (${tc("optional")})`} htmlFor="chapter"><Input id="chapter" name="chapter" maxLength={120} /></Field>
            </div>
            <Button type="submit" size="lg" full loading={importing} disabled={importing}>
              {importing ? t("importing") : t("importSubmit")}
            </Button>
            <p className="text-center text-xs text-muted">{t("importPrivacy")}</p>
          </form>
        </Card>
      ) : null}

      {subjects.length > 0 ? (
        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{labels.subjects}</div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <button type="button" onClick={() => setSubject(null)} className={cn("shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold", !subject ? "border-green bg-green text-white" : "border-line bg-surface text-ink")}>
              {labels.all}
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubject(s.id === subject ? null : s.id)}
                className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold", subject === s.id ? "border-green bg-green text-white" : "border-line bg-surface text-ink")}
              >
                {s.emoji ? <span>{s.emoji}</span> : null} {s.name}
                <span className={cn("rounded-full px-1.5 text-xs", subject === s.id ? "bg-white/20" : "bg-surface-2 text-muted")}>{counts.get(s.id) ?? 0}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {docs.some((d) => d.status === "ready") ? (
        <Card className={cn(strict && "border-green")}>
          <Toggle
            id="strict"
            checked={strict}
            onChange={setStrict}
            label={<span className="flex items-center gap-2"><ShieldCheck className="size-4 text-green" /> {labels.strictMode}</span>}
            description={labels.strictModeHint}
          />
          {strict ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-green-soft px-3 py-2 text-sm text-green-ink">
              <span>{selected.size ? labels.strictOn(selected.size) : t("strictNeedSelection")}</span>
              {selected.size ? (
                <Link href={strictHref} className="flex shrink-0 items-center gap-1 font-bold"><MessageCircleQuestion className="size-4" /> {labels.actions.ask}</Link>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      {hits && hits.length > 0 ? (
        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("inContent")}</div>
          <Card className="p-0">
            <ul className="divide-y divide-line">
              {hits.map((h, i) => (
                <li key={`${h.documentId}-${i}`}>
                  <Link href={`/cours/${h.documentId}`} className="block px-4 py-3 hover:bg-surface-2">
                    <div className="truncate text-sm font-semibold text-ink">{h.title}{h.page ? ` · p. ${h.page}` : ""}</div>
                    <Snippet text={h.snippet} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {docs.length === 0 ? (
        <EmptyState icon={<FileText className="size-6" />} title={labels.empty} action={<Button onClick={() => setShowImport(true)}><Plus className="size-4" /> {labels.import}</Button>} />
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted">{t("noResults")}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((d) => {
            const s = subjectOf(d.subjectId);
            const isSel = selected.has(d.id);
            const meta = [s ? `${s.emoji ? `${s.emoji} ` : ""}${s.name}` : null, d.chapter, d.pages ? labels.pages(d.pages) : null, t("added", { date: format.dateTime(new Date(d.createdAt), { day: "numeric", month: "short" }) })].filter(Boolean).join(" · ");
            return (
              <li key={d.id}>
                <Card className={cn("p-0", strict && isSel && "ring-2 ring-green")}>
                  <div className="flex items-start gap-3 p-4">
                    {strict ? (
                      <input type="checkbox" aria-label={labels.selectForStrict} checked={isSel} onChange={() => toggleSelect(d.id)} disabled={d.status !== "ready"} className="mt-1 size-5 shrink-0 accent-green" />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink">
                        {d.mime === "application/pdf" ? <FileText className="size-5" /> : <ImageIcon className="size-5" />}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link href={`/cours/${d.id}`} className="block truncate text-[15px] font-semibold text-ink hover:underline">{d.title}</Link>
                      <div className="truncate text-xs text-muted">{meta}</div>
                      <div className="mt-1.5">
                        {d.status === "ready" ? (
                          <Badge tone="green">{labels.status.ready}</Badge>
                        ) : d.status === "processing" ? (
                          <Badge tone="warning"><Loader2 className="size-3 animate-spin" /> {labels.status.processing}</Badge>
                        ) : (
                          <Badge tone="danger">{labels.status.failed}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {d.status === "ready" ? (
                    <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-line px-4 py-2.5">
                      {(
                        [
                          [labels.actions.summary, `/cours/${d.id}?onglet=summary`],
                          [labels.actions.exercises, `/cours/${d.id}?onglet=exercises`],
                          [labels.actions.quiz, `/cours/${d.id}?onglet=quiz`],
                          [labels.actions.ask, `/tuteur?strict=1&docs=${d.id}`],
                        ] as const
                      ).map(([label, href]) => (
                        <Link key={label} href={href} className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-green-soft">
                          <Sparkles className="size-3.5 text-green" /> {label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Extrait de recherche : les segments **surlignés** par PostgreSQL deviennent du gras. */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
      {parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <mark key={i} className="rounded bg-green-soft px-0.5 text-green-ink">{p.slice(2, -2)}</mark> : <span key={i}>{p}</span>))}
    </p>
  );
}
