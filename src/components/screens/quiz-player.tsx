"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, RotateCcw, X, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { ProgressBar } from "@/components/ui/progress";
import type { MockQuestion } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Answer = { value: string | number | boolean; correct: boolean };

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, "").replace(/−/g, "-").replace(/²/g, "^2");
}

function isCorrect(q: MockQuestion, value: string | number | boolean) {
  if (q.type === "mcq") return value === q.answer;
  if (q.type === "truefalse") return value === q.answer;
  return q.accepted.some((a) => normalize(a) === normalize(String(value)));
}

export function QuizPlayer({ subject, questions, exitHref = "/quiz" }: { subject: string; questions: MockQuestion[]; exitHref?: string }) {
  const t = useTranslations("quiz");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [draft, setDraft] = useState<string | number | boolean | null>(null);
  const [finished, setFinished] = useState(false);

  const q = questions[index];
  const current = answers[q.id];
  const score = useMemo(() => Object.values(answers).filter((a) => a.correct).length, [answers]);

  function validate() {
    if (draft === null || draft === "") return;
    setAnswers((a) => ({ ...a, [q.id]: { value: draft, correct: isCorrect(q, draft) } }));
  }

  function next() {
    setDraft(null);
    if (index + 1 >= questions.length) setFinished(true);
    else setIndex(index + 1);
    window.scrollTo({ top: 0 });
  }

  function restart() {
    setAnswers({});
    setDraft(null);
    setIndex(0);
    setFinished(false);
  }

  if (finished) {
    const pct = score / questions.length;
    const msg = pct >= 0.8 ? t("resultGood") : pct >= 0.5 ? t("resultMedium") : t("resultLow");
    return (
      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] bg-green p-6 text-center text-white shadow-[var(--shadow-card)]">
          <div className="text-sm font-semibold uppercase tracking-wide opacity-90">{t("resultTitle")}</div>
          <div className="mt-2 text-5xl font-extrabold">{score}<span className="text-2xl opacity-80"> / {questions.length}</span></div>
          <div className="mt-2 text-sm">{t("resultScore", { score, total: questions.length })}</div>
          <p className="mt-3 text-[15px] font-medium">{msg}</p>
        </div>
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {questions.map((qq, i) => {
              const a = answers[qq.id];
              return (
                <li key={qq.id} className="flex items-start gap-3 px-4 py-3">
                  {a?.correct ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-danger" />}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">{i + 1}. {qq.prompt}</div>
                    {!a?.correct ? <div className="mt-1 text-xs text-muted">{qq.explanation}</div> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="flex gap-3">
          <Button variant="outline" size="lg" className="flex-1" onClick={restart}><RotateCcw className="size-4" /> {t("replay")}</Button>
          <ButtonLink href={exitHref} size="lg" className="flex-1">{t("history")}</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-muted">{t("question", { current: index + 1, total: questions.length })}</span>
          <Link href={exitHref} className="font-semibold text-muted hover:text-ink">✕</Link>
        </div>
        <ProgressBar value={((index + (current ? 1 : 0)) / questions.length) * 100} />
      </div>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Badge tone="gray">{t(`types.${q.type}`)}</Badge>
          <span className="text-xs text-muted">{subject}</span>
        </div>
        <h1 className="text-lg font-bold leading-snug text-ink">{q.prompt}</h1>
      </Card>

      {q.type === "mcq" ? (
        <ul className="space-y-2">
          {q.options.map((opt, i) => {
            const chosen = (current ? current.value : draft) === i;
            const reveal = Boolean(current);
            const good = reveal && i === q.answer;
            const bad = reveal && chosen && i !== q.answer;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={reveal}
                  onClick={() => setDraft(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius-card)] border bg-surface px-4 py-3.5 text-left text-[15px] text-ink transition-colors",
                    chosen && !reveal ? "border-green ring-2 ring-green/30" : "border-line",
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
            const chosen = (current ? current.value : draft) === v;
            const reveal = Boolean(current);
            const good = reveal && v === q.answer;
            const bad = reveal && chosen && v !== q.answer;
            return (
              <button
                key={String(v)}
                type="button"
                disabled={reveal}
                onClick={() => setDraft(v)}
                className={cn(
                  "rounded-[var(--radius-card)] border bg-surface py-5 text-lg font-bold text-ink",
                  chosen && !reveal ? "border-green ring-2 ring-green/30" : "border-line",
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
          value={current ? String(current.value) : (draft as string) ?? ""}
          onChange={(e) => setDraft(e.target.value)}
          disabled={Boolean(current)}
          placeholder={t("shortPlaceholder")}
          onKeyDown={(e) => e.key === "Enter" && validate()}
          className={cn(current && (current.correct ? "border-green bg-green-soft" : "border-danger bg-danger-soft"))}
        />
      ) : null}

      {current ? (
        <Card className={cn("animate-fade-up", current.correct ? "border-green" : "border-danger")}>
          <div className={cn("flex items-center gap-2 text-[15px] font-bold", current.correct ? "text-green" : "text-danger")}>
            {current.correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            {current.correct ? t("correct") : t("incorrect")}
          </div>
          {!current.correct && q.type === "short" ? (
            <p className="mt-1 text-sm text-muted">{t("expected")} : <strong className="text-ink">{q.accepted[0]}</strong></p>
          ) : null}
          <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("explanation")}</div>
          <p className="mt-1 text-[15px] text-ink">{q.explanation}</p>
        </Card>
      ) : null}

      {current ? (
        <Button size="lg" full onClick={next}>{index + 1 >= questions.length ? t("seeScore") : t("nextQuestion")}</Button>
      ) : (
        <Button size="lg" full onClick={validate} disabled={draft === null || draft === ""}>{t("validate")}</Button>
      )}
    </div>
  );
}
