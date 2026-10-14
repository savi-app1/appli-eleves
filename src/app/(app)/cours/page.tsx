import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page";
import { CoursesScreen } from "@/components/screens/courses";

export default async function CoursesPage() {
  const t = await getTranslations("courses");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <CoursesScreen />
    </>
  );
}
