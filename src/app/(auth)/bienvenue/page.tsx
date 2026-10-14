import { getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { Onboarding } from "@/components/screens/onboarding";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const t = await getTranslations("onboarding");
  const tp = await getTranslations("profile");
  const slides = [0, 1, 2, 3].map((i) => ({ title: t(`slides.${i}.title`), body: t(`slides.${i}.body`) }));
  return (
    <>
      {deleted === "1" ? (
        <div role="status" className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-xl bg-green-soft px-4 py-3 text-sm text-green-ink">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{tp("deletedNotice")}</span>
        </div>
      ) : null}
      <Onboarding
        slides={slides}
        labels={{ skip: t("skip"), next: t("cta"), haveAccount: t("haveAccount"), trialNote: t("trialNote") }}
      />
    </>
  );
}
