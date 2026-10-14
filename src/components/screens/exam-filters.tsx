"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Clock, ShieldCheck, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/page";
import { mockExamCatalogue } from "@/lib/mock-data";

export function ExamFilters() {
  const t = useTranslations("exams");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [country, setCountry] = useState("BF");
  const [exam, setExam] = useState("bepc");
  const [subject, setSubject] = useState("Mathématiques");

  const examName = mockExamCatalogue.exams.find((e) => e.id === exam)?.name.split(" (")[0] ?? "";
  const papers = useMemo(
    () => mockExamCatalogue.papers.filter((p) => p.country === country && p.exam === examName && p.subject === subject),
    [country, examName, subject],
  );

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 gap-3">
        <Field label={t("country")} htmlFor="country">
          <Select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
            {mockExamCatalogue.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={t("exam")} htmlFor="exam">
          <Select id="exam" value={exam} onChange={(e) => setExam(e.target.value)}>
            {mockExamCatalogue.exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </Field>
        <Field label={t("subject")} htmlFor="subject">
          <Select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {mockExamCatalogue.subjects.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label={t("level")} htmlFor="level">
          <Select id="level" value={mockExamCatalogue.exams.find((e) => e.id === exam)?.level} disabled>
            {mockExamCatalogue.exams.map((e) => <option key={e.id}>{e.level}</option>)}
          </Select>
        </Field>
      </Card>

      <div className="flex items-start gap-2 rounded-xl bg-info-soft px-3.5 py-2.5 text-xs text-ink">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green" />
        <span><strong>{t("reliability")}.</strong> {t("reliabilityHint")}</span>
      </div>

      <section>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("available")}</div>
        {papers.length === 0 ? (
          <EmptyState icon={<Clock className="size-6" />} title={tc("soon")} body={t("reliabilityHint")} />
        ) : (
          <ul className="space-y-3">
            {papers.map((p) => (
              <li key={p.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-ink">{p.exam} · {p.subject}</div>
                      <div className="text-xs text-muted">{t("year", { year: p.year })} · {tc("questions", { count: p.questions })} · {t("mockTimed", { minutes: p.minutes })}</div>
                    </div>
                    {p.sample ? <Badge tone="warning">{tc("example")}</Badge> : <Badge tone="green">{t("reliability")}</Badge>}
                  </div>
                  <div className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">
                    <div><span className="font-semibold text-ink">{tc("source")} :</span> {p.source}</div>
                    <div>
                      {p.verifiedAt
                        ? tc("verifiedOn", { date: format.dateTime(new Date(p.verifiedAt), { day: "numeric", month: "long", year: "numeric" }) })
                        : "Vérification en attente"}
                    </div>
                  </div>
                  {p.sample ? <p className="mt-2 text-xs text-warning">{t("sampleNotice")}</p> : null}
                  <ButtonLink href="/examens/blanc" size="md" full className="mt-3" aria-disabled={!p.verifiedAt}>
                    <Timer className="size-4" /> {t("startMock")}
                  </ButtonLink>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card className="p-0">
        <div className="px-4 pt-4"><CardTitle>{t("pastResults")}</CardTitle></div>
        <ul className="divide-y divide-line">
          {mockExamCatalogue.pastAttempts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-medium text-ink">{a.title}</div>
                <div className="text-xs text-muted">{a.date}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-extrabold text-ink">{a.score}<span className="text-xs font-semibold text-muted">/{a.total}</span></span>
                <Link href="/examens/blanc" className="text-xs font-semibold text-green">{t("correction")}</Link>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
