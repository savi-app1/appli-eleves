"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, RotateCcw, Timer, X, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { ProgressBar } from "@/components/ui/progress";
import type { QuizQuestion } from "@/server/ai/schemas";
import { submitAttemptAction, type AttemptOutcome } from "@/server/learning/actions";
import { cn } from "@/lib/utils";

type Value = string | number | boolean;

/** Vérification locale (retour immédiat) ; le score officiel est recalculé par le serveur. */
function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").replace(/[−–]/g, "-").replace(/²/g, "^2").replace(/^x=/, "").replace(/[.,;:!?]+$/g, "");
}
function localCorrect(q: QuizQuestion, value: Value) {
  if (q.type === "mcq") return value === q.answer;
  if (q.type === "truefalse") return value === q.answer;
  return q.accepted.some((a) => normalize(a) === normalize(String(value)));
}
function expectedOf(q: QuizQuestion, tTrue: string, tFalse: string) {
  if (q.type === "mcq") return q.options[q.answer];
  if (q.type === "truefalse") return q.answer ? tTrue : tFalse;
  return q.accepted[0];
}
function shown(q: QuizQuestion, v: Value | undefined, tTrue: string, tFalse: string) {
  if (v === undefined) return null;
  if (q.type === "mcq") return q.options[v as number];
  if (q.type === "truefalse") return v ? tTrue : tFalse;
  return String(v);
}

export interface QuizPlayerProps {
  quizId: string;
  subject: string;
  questions: QuizQuestion[];
  exitHref?: string;
  /** `instant` : correction après chaque question ; `deferred` : copie rendue à la fin (examen blanc). */
  mode?: "instant" | "deferred";
  minutes?: number | null;
  demo?: boolean;
}

export function QuizPlayer({ quizId, subject, questions, exitHref = "/quiz", mode = "instant", minutes = null, demo = false }: QuizPlayerProps) {
  const t = useTranslations("quiz");
  const te = useTranslations("exams");
  const tc = useTranslations("common");
  const deferred = mode === "deferred";
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Value>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Value | null>(null);
  const [finished, setFinished] = useState(false);
  const [outcome, setOutcome] = useState<AttemptOutcome | null>(null);
  const [saving, setSaving] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const startedAt = useRef(Date.now());
  const submittedRef = useRef(false);

  const total = questions.length;
  const q = questions[index];
  const answered = Object.keys(answers).length;
  const isRevealed = Boolean(revealed[q.id]);
  const currentValue = answers[q.id];

  // Minuteur (examen blanc) : à zéro, la copie est rendue automatiquement depuis le tick (hors rendu).
  const [left, setLeft] = useState(() => (minutes ? minutes * 60 : 0));
  const finishRef = useRef<(auto: boolean) => Promise<void>>(async () => {});
  useEffect(() => {
    finishRef.current = finish;
  });
  useEffect(() => {
    if (!minutes || finished) return;
    const id = window.setInterval(() => {
      setLeft((s) => {
        const n = Math.max(0, s - 1);
        if (n === 0 && s > 0) {
          window.clearInterval(id);
          setTimeUp(true);
          void finishRef.current(true);
        }
        return n;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [minutes, finished]);

  const localScore = useMemo(() => questions.filter((qq) => answers[qq.id] !== undefined && localCorrect(qq, answers[qq.id])).length, [answers, questions]);
  const serverDetail = useMemo(() => (outcome && outcome.ok ? new Map(outcome.detail.map((d) => [d.questionId, d.correct])) : null), [outcome]);
  const correctOf = (qq: QuizQuestion) => serverDetail?.get(qq.id) ?? (answers[qq.id] !== undefined && localCorrect(qq, answers[qq.id]));

  async function finish(auto = false) {
    if (submittedRef.current) return;
    if (!auto && deferred && !window.confirm(te("submitConfirm"))) return;
    submittedRef.current = true;
    setFinished(true);
    setSaving(true);
    window.scrollTo({ top: 0 });
    const durationS = Math.round((Date.now() - startedAt.current) / 1000);
    try {
      const res = await submitAttemptAction(quizId, answers, durationS);
      setOutcome(res);
    } catch {
      setOutcome({ ok: false, error: "unknown" });
    } finally {
      setSaving(false);
    }
  }

  function commit(value: Value) {
    setAnswers((a) => ({ ...a, [q.id]: value }));
    if (!deferred) setRevealed((r) => ({ ...r, [q.id]: true }));
  }
  function validate() {
    if (draft === null || draft === "") return;
    commit(draft);
    if (deferred) goTo(index + 1);
  }
  function goTo(i: number) {
    if (i < 0 || i >= total) return;
    setDraft(null);
    setIndex(i);
    window.scrollTo({ top: 0 });
  }
  function next() {
    setDraft(null);
    if (index + 1 >= total) void finish(true);
    else goTo(index + 1);
  }
  function restart() {
    submittedRef.current = false;
    startedAt.current = Date.now();
    setAnswers({});
    setRevealed({});
    setDraft(null);
    setIndex(0);
    setFinished(false);
    setOutcome(null);
    setTimeUp(false);
    if (minutes) setLeft(minutes * 60);
  }

  /* ----- Écran de résultat ----- */
  if (finished) {
    const score = outcome?.ok ? outcome.score : localScore;
    const pct = total ? score / total : 0;
    const msg = pct >= 0.8 ? t("resultGood") : pct >= 0.5 ? t("resultMedium") : t("resultLow");
    return (
      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] bg-green p-6 text-center text-white shadow-[var(--shadow-card)]">
          <div className="text-sm font-semibold uppercase tracking-wide opacity-90">{deferred ? te("finished") : t("resultTitle")}</div>
          <div className="mt-2 text-5xl font-extrabold">{score}<span className="text-2xl opacity-80"> / {total}</span></div>
          <div className="mt-2 text-sm">{t("resultScore", { score, total })}</div>
          <p className="mt-3 text-[15px] font-medium">{msg}</p>
          {timeUp ? <p className="mt-2 text-xs opacity-90">{te("timeUp")}</p> : null}
          <p className="mt-3 text-xs opacity-85">
            {saving ? t("saving") : outcome?.ok ? `✓ ${t("saved")}` : outcome ? t("saveError", { reason: tc.has(`errors.${outcome.error}`) ? tc(`errors.${outcome.error}`) : outcome.error }) : null}
          </p>
        </div>
        <Card className="p-0">
          <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">{te("reviewTitle")}</div>
          <ul className="divide-y divide-line">
            {questions.map((qq, i) => {
              const ok = correctOf(qq);
              const mine = shown(qq, answers[qq.id], t("true"), t("false"));
              return (
                <li key={qq.id} className="flex items-start gap-3 px-4 py-3">
                  {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-danger" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink">{i + 1}. {qq.prompt}</div>
                    {!ok ? (
                      <div className="mt-1 text-xs text-muted">
                        <span>{te("yourAnswer")} : <strong className="text-danger">{mine ?? te("noAnswer")}</strong></span>
                        <span> · {t("expected")} : <strong className="text-ink">{expectedOf(qq, t("true"), t("false"))}</strong></span>
                      </div>
                    ) : null}
                    <div className="mt-1 text-xs text-muted">{qq.explanation}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="flex gap-3">
          <Button variant="outline" size="lg" className="flex-1" onClick={restart}><RotateCcw className="size-4" /> {t("replay")}</Button>
          <ButtonLink href={exitHref} size="lg" className="flex-1">{deferred ? te("title") : t("history")}</ButtonLink>
        </div>
      </div>
    );
  }

  /* ----- Question en cours ----- */
  const picked = isRevealed || (deferred && currentValue !== undefined && draft === null) ? currentValue : draft;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const urgent = minutes ? left < 5 * 60 : false;

  return (
    <div className="space-y-4">
      {minutes ? (
        <div className={cn("flex items-center justify-between rounded-[var(--radius-card)] px-4 py-3 shadow-[var(--shadow-card)]", urgent ? "bg-danger-soft text-danger" : "bg-black text-white")}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{te("timeLeft")}</div>
            <div className="text-sm opacity-90">{te("answered", { done: answered, total })}</div>
          </div>
          <div className="flex items-center gap-2 text-3xl font-extrabold tabular-nums"><Timer className="size-6" /> {mm}:{ss}</div>
        </div>
      ) : null}
      {demo ? <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-ink">{t("demoNotice")}</p> : null}

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-muted">{t("question", { current: index + 1, total })}</span>
          <Link href={exitHref} className="font-semibold text-muted hover:text-ink" aria-label={tc("close")}>✕</Link>
        </div>
        <ProgressBar value={((deferred ? answered : index + (isRevealed ? 1 : 0)) / total) * 100} />
      </div>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Badge tone="gray">{t(`types.${q.type}`)}</Badge>
          <span className="text-xs text-muted">{subject}{q.topic ? ` · ${q.topic}` : ""}</span>
        </div>
        <h1 className="text-lg font-bold leading-snug text-ink">{q.prompt}</h1>
      </Card>

      {q.type === "mcq" ? (
        <ul className="space-y-2">
          {q.options.map((opt, i) => {
            const chosen = picked === i;
            const good = isRevealed && i === q.answer;
            const bad = isRevealed && chosen && i !== q.answer;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={isRevealed}
                  onClick={() => setDraft(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius-card)] border bg-surface px-4 py-3.5 text-left text-[15px] text-ink transition-colors",
                    chosen && !isRevealed ? "border-green ring-2 ring-green/30" : "border-line",
                    good && "border-green bg-green-soft",
                    bad && "border-danger bg-danger-soft",
                  )}
                >
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold", good ? "border-green bg-green text-white" : bad ? "border-danger bg-danger text-white" : "border-line text-muted")}>
                    {good ? <Check className="size-4" /> : bad ? <X className="size-4" /> : String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {q.type === "truefalse" ? (
        <div className="grid grid-cols-2 gap-3">
          {[true, false].map((v) => {
            const chosen = picked === v;
            const good = isRevealed && v === q.answer;
            const bad = isRevealed && chosen && v !== q.answer;
            return (
              <button
                key={String(v)}
                type="button"
                disabled={isRevealed}
                onClick={() => setDraft(v)}
                className={cn(
                  "rounded-[var(--radius-card)] border bg-surface py-5 text-lg font-bold text-ink",
                  chosen && !isRevealed ? "border-green ring-2 ring-green/30" : "border-line",
                  good && "border-green bg-green-soft",
                  bad && "border-danger bg-danger-soft",
                )}
              >
                {v ? t("true") : t("false")}
              </button>
            );
          })}
        </div>
      ) : null}

      {q.type === "short" ? (
        <Input
          value={picked === undefined || picked === null ? "" : String(picked)}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isRevealed}
          placeholder={t("shortPlaceholder")}
          onKeyDown={(e) => e.key === "Enter" && validate()}
          className={cn(isRevealed && (localCorrect(q, currentValue) ? "border-green bg-green-soft" : "border-danger bg-danger-soft"))}
        />
      ) : null}

      {isRevealed ? (
        <Card className={cn("animate-fade-up", localCorrect(q, currentValue) ? "border-green" : "border-danger")}>
          <div className={cn("flex items-center gap-2 text-[15px] font-bold", localCorrect(q, currentValue) ? "text-green" : "text-danger")}>
            {localCorrect(q, currentValue) ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            {localCorrect(q, currentValue) ? t("correct") : t("incorrect")}
          </div>
          {!localCorrect(q, currentValue) && q.type === "short" ? (
            <p className="mt-1 text-sm text-muted">{t("expected")} : <strong className="text-ink">{q.accepted[0]}</strong></p>
          ) : null}
          <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("explanation")}</div>
          <p className="mt-1 text-[15px] text-ink">{q.explanation}</p>
        </Card>
      ) : null}

      {deferred ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="flex-1" onClick={() => goTo(index - 1)} disabled={index === 0}><ChevronLeft className="size-4" /> {te("previous")}</Button>
            {index + 1 < total ? (
              <Button size="lg" className="flex-[2]" onClick={() => (draft !== null && draft !== "" ? validate() : goTo(index + 1))}>
                {te("next")} <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button size="lg" className="flex-[2]" onClick={() => { if (draft !== null && draft !== "") commit(draft); void finish(false); }}>
                {te("submit")}
              </Button>
            )}
          </div>
          {index + 1 < total ? (
            <button type="button" onClick={() => { if (draft !== null && draft !== "") commit(draft); void finish(false); }} className="w-full text-center text-sm font-semibold text-muted hover:text-ink">
              {te("submit")} ({te("answered", { done: answered, total })})
            </button>
          ) : null}
        </div>
      ) : isRevealed ? (
        <Button size="lg" full onClick={next}>{index + 1 >= total ? t("seeScore") : t("nextQuestion")}</Button>
      ) : (
        <Button size="lg" full onClick={validate} disabled={draft === null || draft === ""}>{t("validate")}</Button>
      )}
    </div>
  );
}
