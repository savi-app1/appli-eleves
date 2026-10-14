import { getTranslations } from "next-intl/server";
import { Onboarding } from "@/components/screens/onboarding";

export default async function WelcomePage() {
  const t = await getTranslations("onboarding");
  const slides = [0, 1, 2, 3].map((i) => ({ title: t(`slides.${i}.title`), body: t(`slides.${i}.body`) }));
  return (
    <Onboarding
      slides={slides}
      labels={{ skip: t("skip"), next: t("cta"), haveAccount: t("haveAccount"), trialNote: t("trialNote") }}
    />
  );
}
