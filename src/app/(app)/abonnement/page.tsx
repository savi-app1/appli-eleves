import { getFormatter, getTranslations } from "next-intl/server";
import { Check, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { MOCK_NOW, mockPricing, mockSubscription } from "@/lib/mock-data";
import { daysBetween, formatXof } from "@/lib/utils";

export default async function SubscriptionPage() {
  const t = await getTranslations("subscription");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const days = Math.max(0, daysBetween(MOCK_NOW, mockSubscription.trialEndsAt));
  const endDate = format.dateTime(mockSubscription.trialEndsAt, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const features = [0, 1, 2, 3, 4, 5].map((i) => t(`features.${i}`));

  return (
    <>
      <PageHeader title={t("title")} back="/profil" />
      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] bg-green p-5 text-white shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-90"><Sparkles className="size-4" /> {mockSubscription.status === "trial" ? t("trialTitle") : mockSubscription.status === "premium" ? t("activeTitle") : t("expiredTitle")}</div>
          <div className="mt-2 text-2xl font-extrabold">{t("trialRemaining", { days: tc("days", { count: days }) })}</div>
          <div className="mt-1 text-sm opacity-90">{t("trialEnds", { date: endDate })}</div>
          <p className="mt-3 text-xs opacity-85">{t("whatHappens")}</p>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{t("plans")}</div>
            {!mockPricing.confirmed ? <Badge tone="warning">{tc("toConfirm")}</Badge> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Card className="flex flex-col">
              <div className="text-sm font-semibold text-muted">{t("monthly")}</div>
              <div className="mt-1 text-2xl font-extrabold text-ink">{formatXof(mockPricing.monthly)}</div>
              <div className="text-xs text-muted">{t("perMonth")}</div>
              <Button className="mt-4" full disabled><Lock className="size-4" /> {t("pay", { amount: formatXof(mockPricing.monthly) })}</Button>
            </Card>
            <Card className="relative flex flex-col border-green">
              <Badge tone="green" className="absolute -top-2.5 right-3">{t("yearlySaving")}</Badge>
              <div className="text-sm font-semibold text-muted">{t("yearly")}</div>
              <div className="mt-1 text-2xl font-extrabold text-ink">{formatXof(mockPricing.yearly)}</div>
              <div className="text-xs text-muted">{t("perYear")}</div>
              <Button className="mt-4" full disabled><Lock className="size-4" /> {t("pay", { amount: formatXof(mockPricing.yearly) })}</Button>
            </Card>
          </div>
          <p className="mt-2 text-xs text-muted">{t("priceNote")}</p>
        </section>

        <Card className="bg-warning-soft">
          <div className="text-sm font-bold text-ink">{t("payUnavailable")}</div>
          <p className="mt-1 text-sm text-ink">{t("payUnavailableHint")}</p>
          <p className="mt-2 text-xs text-muted">{t("methods")}</p>
        </Card>

        <Card>
          <CardTitle>{t("includes")}</CardTitle>
          <ul className="space-y-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[15px] text-ink">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-soft text-green"><Check className="size-3.5" /></span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted"><Lock className="mt-0.5 size-3.5 shrink-0" /> {t("securityNote")}</p>
        </Card>
      </div>
    </>
  );
}
