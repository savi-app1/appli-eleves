import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { Banner } from "@/components/ui/page";
import type { Entitlement } from "@/server/billing/entitlement";

export async function TrialBanner({ entitlement }: { entitlement: Entitlement }) {
  const t = await getTranslations("trial");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const cta = <Link href="/abonnement" className="shrink-0 text-sm font-bold">{t("cta")}</Link>;

  if (entitlement.status === "premium" && entitlement.premiumUntil) {
    return (
      <Banner tone="green" action={cta}>
        <span className="flex items-center gap-2"><Sparkles className="size-4 shrink-0" />{t("premium", { date: format.dateTime(entitlement.premiumUntil, { day: "numeric", month: "long" }) })}</span>
      </Banner>
    );
  }
  const date = format.dateTime(entitlement.trialEndsAt, { day: "numeric", month: "long" });
  if (entitlement.status === "expired") {
    return (
      <Banner tone="danger" action={<Link href="/abonnement" className="shrink-0 text-sm font-bold text-danger">{t("cta")}</Link>}>
        {t("expired")}
      </Banner>
    );
  }
  return (
    <Banner tone={entitlement.daysLeft <= 1 ? "warning" : "green"} action={cta}>
      <span className="flex items-center gap-2">
        <Sparkles className="size-4 shrink-0" />
        <span>{entitlement.daysLeft <= 1 ? t("lastDay", { date }) : t("active", { days: tc("days", { count: entitlement.daysLeft }), date })}</span>
      </span>
    </Banner>
  );
}
