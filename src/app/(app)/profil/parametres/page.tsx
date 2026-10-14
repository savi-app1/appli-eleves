import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page";
import { SettingsScreen } from "@/components/screens/settings";
import { requireUser } from "@/server/auth/current";
import { mockExamCatalogue } from "@/lib/mock-data";

export default async function SettingsPage() {
  const { user } = await requireUser();
  const t = await getTranslations("settings");
  return (
    <>
      <PageHeader title={t("title")} back="/profil" />
      <SettingsScreen
        countries={mockExamCatalogue.countries}
        initial={{
          firstName: user.firstName,
          level: user.level,
          country: user.country,
          questionLocale: user.questionLocale,
          answerLocale: user.answerLocale,
          alsoFrench: user.alsoFrench,
          theme: user.theme,
        }}
      />
    </>
  );
}
