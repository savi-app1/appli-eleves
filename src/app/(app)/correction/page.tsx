import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page";
import { GradingFlow } from "@/components/screens/grading-flow";

export default async function GradingPage() {
  const t = await getTranslations("grading");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} back="/accueil" />
      <GradingFlow />
    </>
  );
}
