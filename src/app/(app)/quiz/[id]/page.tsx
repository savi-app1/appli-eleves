import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { QuizPlayer } from "@/components/screens/quiz-player";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { aiMode } from "@/server/ai/provider";
import { getQuiz, listAttempts } from "@/server/quiz/service";

export default async function QuizPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { user } = await requireUser();
  const db = await getDb();
  const quiz = await getQuiz(db, user.id, id);
  if (!quiz) notFound();
  if (quiz.source === "exam") redirect(`/examens/blanc/${quiz.id}`);
  const t = await getTranslations("quiz");
  const format = await getFormatter();
  const attempts = (await listAttempts(db, user.id, 100)).filter((a) => a.quizId === quiz.id).slice(0, 5);

  return (
    <div className="space-y-6">
      <QuizPlayer quizId={quiz.id} subject={quiz.subject ?? ""} questions={quiz.questions} exitHref="/quiz" demo={aiMode() === "demo"} />
      {attempts.length > 0 ? (
        <Card className="p-0">
          <div className="px-4 pt-4"><CardTitle>{t("previousAttempts")}</CardTitle></div>
          <ul className="divide-y divide-line">
            {attempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted">{format.dateTime(a.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <Badge tone={a.score / a.total >= 0.7 ? "green" : a.score / a.total >= 0.5 ? "warning" : "danger"}>{a.score}/{a.total}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
