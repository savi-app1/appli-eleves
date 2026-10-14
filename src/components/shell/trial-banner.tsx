import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Banner } from "@/components/ui/page";
import { MOCK_NOW, mockSubscription } from "@/lib/mock-data";
import { daysBetween } from "@/lib/utils";

export function TrialBanner() {
  const t = useTranslations("trial");
  const tc = useTranslations("common");
  const format = useFormatter();
  const { status, trialEndsAt, currentPeriodEnd } = mockSubscription;

  if (status === "premium" && currentPeriodEnd) {
    return null;
  }
  const days = daysBetween(MOCK_NOW, trialEndsAt);
  const date = format.dateTime(trialEndsAt, { day: "numeric", month: "long" });

  if (status === "expired" || days <= 0) {
    return (
      <Banner tone="danger" action={<Link href="/abonnement" className="shrink-0 text-sm font-bold text-danger">{t("cta")}</Link>}>
        {t("expired")}
      </Banner>
    );
  }
  return (
    <Banner
      tone={days <= 1 ? "warning" : "green"}
      action={<Link href="/abonnement" className="shrink-0 text-sm font-bold">{t("cta")}</Link>}
    >
      <span className="flex items-center gap-2">
        <Sparkles className="size-4 shrink-0" />
        <span>{days <= 1 ? t("lastDay", { date }) : t("active", { days: tc("days", { count: days }), date })}</span>
      </span>
    </Banner>
  );
}
