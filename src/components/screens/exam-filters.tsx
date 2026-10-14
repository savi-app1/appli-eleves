"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, Sparkles, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EXAMS, EXAM_COUNTRIES, EXAM_SUBJECTS } from "@/lib/exam-catalogue";
import { startMockExamAction } from "@/server/learning/actions";

export function ExamFilters({ defaultCountry = "BF", demo = false }: { defaultCountry?: string; demo?: boolean }) {
  const t = useTranslations("exams");
  const tc = useTranslations("common");
  const [country, setCountry] = useState(defaultCountry);
  const [examId, setExamId] = useState<string>("bepc");
  const [subject, setSubject] = useState<string>("Mathématiques");
  const exam = EXAMS.find((e) => e.id === examId) ?? EXAMS[1];
  const [minutes, setMinutes] = useState<number>(exam.minutes);
  const [count, setCount] = useState<number>(exam.questions);

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 gap-3">
        <Field label={t("country")} htmlFor="country">
          <Select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
            {EXAM_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={t("exam")} htmlFor="exam">
          <Select
            id="exam"
            value={examId}
            onChange={(e) => {
              const ex = EXAMS.find((x) => x.id === e.target.value) ?? EXAMS[1];
              setExamId(ex.id);
              setMinutes(ex.minutes);
              setCount(ex.questions);
            }}
          >
            {EXAMS.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </Select>
        </Field>
        <Field label={t("subject")} htmlFor="subject">
          <Select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {EXAM_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label={t("level")} htmlFor="level">
          <Select id="level" value={exam.level} disabled><option>{exam.level}</option></Select>
        </Field>
      </Card>

      <div className="flex items-start gap-2 rounded-xl bg-info-soft px-3.5 py-2.5 text-xs text-ink">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green" />
        <span><strong>{t("reliability")}.</strong> {t("reliabilityHint")} {t("official")}</span>
      </div>

      <Card className="border-green">
        <CardTitle action={<Badge tone="warning">{tc("example")}</Badge>}>{t("mockAiTitle")}</CardTitle>
        <p className="mb-3 text-sm text-muted">{t("mockAiHint")}</p>
        <form action={startMockExamAction} className="space-y-3">
          <input type="hidden" name="exam" value={`${exam.name} ${EXAM_COUNTRIES.find((c) => c.code === country)?.name ?? ""}`.trim()} />
          <input type="hidden" name="subject" value={subject} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("duration")} htmlFor="minutes">
              <Select id="minutes" name="minutes" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                {[15, 20, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{t("minutesLabel", { count: m })}</option>)}
              </Select>
            </Field>
            <Field label={t("questionsCount")} htmlFor="count">
              <Select id="count" name="count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[5, 8, 10, 12, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
          </div>
          <SubmitButton size="lg" full pendingLabel={tc("generating")}><Timer className="size-5" /> {t("startMock")}</SubmitButton>
          {demo ? <p className="flex items-center justify-center gap-1 text-center text-xs text-muted"><Sparkles className="size-3" /> {tc("demoMode")}</p> : null}
        </form>
      </Card>
    </div>
  );
}
