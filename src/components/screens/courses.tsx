"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, ImageIcon, Loader2, MessageCircleQuestion, Plus, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/page";
import { mockDocuments, mockSubjects } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function CoursesScreen() {
  const t = useTranslations("courses");
  const tc = useTranslations("common");
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
  const [selected, setSelected] = useState<Set<string>>(new Set(["d1", "d2"]));

  const docs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mockDocuments.filter(
      (d) => (!subject || d.subjectId === subject) && (!q || d.title.toLowerCase().includes(q) || d.chapter.toLowerCase().includes(q)),
    );
  }, [query, subject]);

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="h-12 w-full rounded-[var(--radius-btn)] border border-line bg-surface pr-3 pl-10 text-base text-ink placeholder:text-muted focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25"
          />
        </label>
        <Button className="h-12 shrink-0 px-3.5" aria-label={labels.import}>
          <Plus className="size-5" /> <span className="hidden sm:inline">{labels.import}</span>
        </Button>
      </div>
      <p className="-mt-2 text-xs text-muted">{labels.importHint}</p>

      <section>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{labels.subjects}</div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            onClick={() => setSubject(null)}
            className={cn("shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold", !subject ? "border-green bg-green text-white" : "border-line bg-surface text-ink")}
          >
            {labels.all}
          </button>
          {mockSubjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSubject(s.id === subject ? null : s.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold",
                subject === s.id ? "border-green bg-green text-white" : "border-line bg-surface text-ink",
              )}
            >
              <span>{s.emoji}</span> {s.name}
              <span className={cn("rounded-full px-1.5 text-xs", subject === s.id ? "bg-white/20" : "bg-surface-2 text-muted")}>{s.documents}</span>
            </button>
          ))}
        </div>
      </section>

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
            <span>{labels.strictOn(selected.size)}</span>
            <Link href="/tuteur" className="flex shrink-0 items-center gap-1 font-bold"><MessageCircleQuestion className="size-4" /> {labels.actions.ask}</Link>
          </div>
        ) : null}
      </Card>

      {docs.length === 0 ? (
        <EmptyState icon={<FileText className="size-6" />} title={labels.empty} />
      ) : (
        <ul className="space-y-3">
          {docs.map((d) => {
            const s = mockSubjects.find((x) => x.id === d.subjectId)!;
            const isSel = selected.has(d.id);
            return (
              <li key={d.id}>
                <Card className={cn("p-0", strict && isSel && "ring-2 ring-green")}>
                  <div className="flex items-start gap-3 p-4">
                    {strict ? (
                      <input
                        type="checkbox"
                        aria-label={labels.selectForStrict}
                        checked={isSel}
                        onChange={() => toggleSelect(d.id)}
                        disabled={d.status !== "ready"}
                        className="mt-1 size-5 shrink-0 accent-green"
                      />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink">
                        {d.type === "pdf" ? <FileText className="size-5" /> : <ImageIcon className="size-5" />}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold text-ink">{d.title}</div>
                      <div className="truncate text-xs text-muted">{s.emoji} {s.name} · {d.chapter} · {labels.pages(d.pages)}</div>
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
                      {[
                        [labels.actions.summary, "/tuteur"],
                        [labels.actions.quiz, "/quiz/jouer"],
                        [labels.actions.exercises, "/quiz/jouer"],
                        [labels.actions.ask, "/tuteur"],
                      ].map(([label, href]) => (
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
