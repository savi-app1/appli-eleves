import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page";
import { SettingsScreen } from "@/components/screens/settings";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  return (
    <>
      <PageHeader title={t("title")} back="/profil" />
      <SettingsScreen />
    </>
  );
}
