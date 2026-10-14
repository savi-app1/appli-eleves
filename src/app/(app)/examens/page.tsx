import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page";
import { ExamFilters } from "@/components/screens/exam-filters";

export default async function ExamsPage() {
  const t = await getTranslations("exams");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} back="/accueil" />
      <ExamFilters />
    </>
  );
}
