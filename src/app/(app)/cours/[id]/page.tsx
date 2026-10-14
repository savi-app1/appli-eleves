import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { AlertTriangle, ExternalLink, FileText, ListChecks, MessageCircleQuestion, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Field, Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { aiMode } from "@/server/ai/provider";
import { documentText, getDocument, listOutputs, listSubjects } from "@/server/documents/service";
import { deleteDocumentAction, generateOutputAction, generateQuizAction, updateDocumentAction } from "@/server/learning/actions";
import { cn } from "@/lib/utils";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const TABS = ["text", "summary", "exercises", "quiz"] as const;
type Tab = (typeof TABS)[number];

export default async function DocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { user } = await requireUser();
  const db = await getDb();
  const doc = await getDocument(db, user.id, id);
  if (!doc) notFound();
  const t = await getTranslations("courses");
  const tq = await getTranslations("quiz");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const [subjects, outputs, text] = await Promise.all([listSubjects(db, user.id), listOutputs(db, user.id, id), documentText(db, user.id, id, 6000)]);
  const tab: Tab = (TABS as readonly string[]).includes(one(sp.onglet)) ? (one(sp.onglet) as Tab) : "text";
  const error = one(sp.erreur);
  const demo = aiMode() === "demo";
  const subject = subjects.find((s) => s.id === doc.subjectId);
  const summaries = outputs.filter((o) => o.kind === "summary");
  const exercises = outputs.filter((o) => o.kind === "exercises");
  const ready = doc.status === "ready";

  const tabLabel: Record<Tab, string> = { text: t("detail.text"), summary: t("detail.summary"), exercises: t("detail.exercises"), quiz: t("actions.quiz") };

  return (
    <>
      <PageHeader
        title={doc.title}
        subtitle={[subject ? `${subject.emoji} ${subject.name}` : null, doc.chapter, doc.pages ? t("pages", { count: doc.pages }) : null].filter(Boolean).join(" · ") || undefined}
        back="/cours"
        action={<a href={`/api/documents/${doc.id}/fichier`} target="_blank" rel="noopener" className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2" aria-label={t("detail.openFile")}><ExternalLink className="size-5" /></a>}
      />
      <div className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <span>{tc.has(`errors.${error}`) ? tc(`errors.${error}`) : tc("errors.unknown")}{error === "premium_required" ? <> · <Link href="/abonnement" className="font-bold underline">{tc("subscribe")}</Link></> : null}</span>
          </div>
        ) : null}
        {doc.status === "failed" ? (
          <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-ink"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" /> {t("detail.failure", { reason: doc.failureReason ?? "" })}</div>
        ) : doc.failureReason ? (
          <div className="flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-ink"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {t("detail.warning", { reason: doc.failureReason })}</div>
        ) : null}
        {demo && tab !== "text" ? <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-ink">{tc("demoMode")}</p> : null}

        {ready ? (
          <div className="grid grid-cols-2 gap-2">
            <ButtonLink href={`/tuteur?strict=1&docs=${doc.id}`} variant="secondary" className="justify-center"><MessageCircleQuestion className="size-4" /> {t("detail.ask")}</ButtonLink>
            <form action={generateQuizAction}>
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="subject" value={subject?.name ?? ""} />
              <input type="hidden" name="back" value={`/cours/${doc.id}?onglet=quiz`} />
              <SubmitButton variant="outline" full pendingLabel={tq("generating")}><ListChecks className="size-4" /> {t("detail.quiz")}</SubmitButton>
            </form>
          </div>
        ) : null}

        <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" aria-label="Onglets">
          {TABS.map((k) => (
            <Link key={k} href={`/cours/${doc.id}?onglet=${k}`} className={cn("shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold", tab === k ? "border-green bg-green text-white" : "border-line bg-surface text-ink")} aria-current={tab === k ? "page" : undefined}>
              {tabLabel[k]}
            </Link>
          ))}
        </nav>

        {tab === "text" ? (
          <Card>
            <CardTitle action={<Badge tone="gray"><FileText className="size-3" /> {doc.mime === "application/pdf" ? "PDF" : "Image"}</Badge>}>{t("detail.text")}</CardTitle>
            <p className="mb-2 text-xs text-muted">{t("detail.textHint")}</p>
            {text ? <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-sans text-sm text-ink">{text}</pre> : <p className="text-sm text-muted">{t("detail.noText")}</p>}
          </Card>
        ) : null}
        {tab === "summary" ? <Outputs kind="summary" items={summaries} docId={doc.id} ready={ready} t={t} tc={tc} format={format} /> : null}
        {tab === "exercises" ? <Outputs kind="exercises" items={exercises} docId={doc.id} ready={ready} t={t} tc={tc} format={format} /> : null}
        {tab === "quiz" ? (
          <Card>
            <CardTitle>{t("detail.quiz")}</CardTitle>
            <p className="mb-3 text-sm text-muted">{tq("fromCourse")} · {doc.title}</p>
            <form action={generateQuizAction} className="space-y-3">
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="subject" value={subject?.name ?? ""} />
              <input type="hidden" name="back" value={`/cours/${doc.id}?onglet=quiz`} />
              <Field label={tq("countLabel")} htmlFor="count">
                <Select id="count" name="count" defaultValue="5">{[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
              </Field>
              <SubmitButton size="lg" full pendingLabel={tq("generating")} disabled={!ready}><Sparkles className="size-5" /> {tq("generate")}</SubmitButton>
            </form>
          </Card>
        ) : null}

        <Card>
          <CardTitle>{t("detail.edit")}</CardTitle>
          <form action={updateDocumentAction} className="space-y-3">
            <input type="hidden" name="documentId" value={doc.id} />
            <Field label={t("titleLabel")} htmlFor="title"><Input id="title" name="title" defaultValue={doc.title} maxLength={160} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("subjectLabel")} htmlFor="subjectId">
                <Select id="subjectId" name="subjectId" defaultValue={doc.subjectId ?? ""}>
                  <option value="">{t("noSubject")}</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                </Select>
              </Field>
              <Field label={t("chapterLabel")} htmlFor="chapter"><Input id="chapter" name="chapter" defaultValue={doc.chapter ?? ""} maxLength={120} /></Field>
            </div>
            <SubmitButton variant="outline" full>{tc("save")}</SubmitButton>
          </form>
        </Card>

        <form action={deleteDocumentAction} className="pb-2">
          <input type="hidden" name="documentId" value={doc.id} />
          <ConfirmSubmit message={tc("confirmDelete")} className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-danger/30 px-4 py-3 text-sm font-bold text-danger hover:bg-danger-soft">
            <Trash2 className="size-4" /> {t("detail.delete")}
          </ConfirmSubmit>
        </form>
      </div>
    </>
  );
}


type Output = Awaited<ReturnType<typeof listOutputs>>[number];
type T = Awaited<ReturnType<typeof getTranslations>>;
type F = Awaited<ReturnType<typeof getFormatter>>;

function Outputs({ kind, items, docId, ready, t, tc, format }: { kind: "summary" | "exercises"; items: Output[]; docId: string; ready: boolean; t: T; tc: T; format: F }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t("detail.outputsHint")}</p>
      {items.length === 0 ? <p className="text-sm text-muted">{t("detail.emptyOutput")}</p> : null}
      {items.map((o, i) => (
        <Card key={o.id} className={cn(i > 0 && "opacity-80")}>
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>{t("detail.generatedOn", { date: format.dateTime(o.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })}</span>
            {o.model ? <Badge tone="gray">{o.model}</Badge> : null}
          </div>
          <Rich text={o.content} />
        </Card>
      ))}
      {ready ? (
        <form action={generateOutputAction}>
          <input type="hidden" name="documentId" value={docId} />
          <input type="hidden" name="kind" value={kind} />
          <SubmitButton size="lg" full pendingLabel={tc("generating")}><Sparkles className="size-5" /> {items.length ? t("detail.regenerate") : t("detail.generate")}</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

/** Rendu léger du texte généré (titres #, gras, listes). */
function Rich({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-[15px] leading-relaxed text-ink">
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const h = /^(#{1,3})\s+(.*)$/.exec(line);
        if (h) return <div key={i} className={cn("font-bold", h[1].length === 1 ? "text-lg" : "text-base")}>{inline(h[2])}</div>;
        const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
        if (bullet) return <div key={i} className="flex gap-2 pl-1"><span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-green" /><span>{inline(bullet[1])}</span></div>;
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}
function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>));
}
