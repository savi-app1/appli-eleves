import { QuizPlayer } from "@/components/screens/quiz-player";
import { mockQuiz } from "@/lib/mock-data";

export default function QuizPlayPage() {
  return <QuizPlayer subject={mockQuiz.subject} questions={mockQuiz.questions} />;
}
