"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Timer } from "lucide-react";
import { QuizPlayer } from "./quiz-player";
import { mockMockExamQuestions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function MockExam() {
  const t = useTranslations("exams");
  const total = 20 * 60; // 20 min pour la démonstration
  const [left, setLeft] = useState(total);
  useEffect(() => {
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const urgent = left < 5 * 60;
  return (
    <div className="space-y-4">
      <div className={cn("flex items-center justify-between rounded-[var(--radius-card)] px-4 py-3 shadow-[var(--shadow-card)]", urgent ? "bg-danger-soft text-danger" : "bg-black text-white")}>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{t("timeLeft")}</div>
          <div className="text-sm opacity-90">BEPC blanc · Mathématiques · {t("year", { year: 2024 })}</div>
        </div>
        <div className="flex items-center gap-2 text-3xl font-extrabold tabular-nums"><Timer className="size-6" /> {mm}:{ss}</div>
      </div>
      <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-ink">{t("sampleNotice")}</p>
      <QuizPlayer subject="Mathématiques" questions={mockMockExamQuestions} exitHref="/examens" />
    </div>
  );
}
