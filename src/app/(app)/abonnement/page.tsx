import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Check, Lock, Sparkles, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Banner, PageHeader } from "@/components/ui/page";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDb } from "@/db/client";
import { PRICING } from "@/server/billing/entitlement";
import { startCheckoutAction } from "@/server/billing/actions";
import { listPayments } from "@/server/billing/payments";
import { appEnv, paymentProviderConfig } from "@/server/billing/providers";
import { requireUser } from "@/server/auth/current";
import { formatXof } from "@/lib/utils";

type Search = { raison?: string; erreur?: string };

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { user, entitlement } = await requireUser();
  const sp = await searchParams;
  const t = await getTranslations("subscription");
  const tc = await getTranslations("common");
  const format = await getFormatter();
  const db = await getDb();
  const history = await listPayments(db, user.id, 10);
  const cfg = paymentProviderConfig();
  const enabled = cfg.enabled;
  const sandbox = enabled && cfg.provider.id === "sandbox";
  const manual = enabled && !cfg.provider.automaticConfirmation;

  const days = entitlement.daysLeft;
  const endDate = format.dateTime(entitlement.premiumUntil ?? entitlement.trialEndsAt, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const features = [0, 1, 2, 3, 4, 5].map((i) => t(`features.${i}`));
  const errorKey = sp.erreur && ["payments_disabled", "rate_limited", "invalid", "unknown"].includes(sp.erreur) ? sp.erreur : null;

  const plans = [
    { id: "monthly", label: t("monthly"), price: PRICING.monthly, unit: t("perMonth"), highlight: false },
    { id: "yearly", label: t("yearly"), price: PRICING.yearly, unit: t("perYear"), highlight: true },
  ] as const;

  return (
    <>
      <PageHeader title={t("title")} back="/profil" />
      <div className="space-y-4">
        {sp.raison === "premium" ? <Banner tone="warning">{t("reasonPremium")}</Banner> : null}
        {errorKey ? <Banner tone="danger">{t(`errors.${errorKey}`)}</Banner> : null}
        {sandbox || appEnv() === "preview" ? <Banner tone="info">{t("sandboxBadge")}</Banner> : null}

        <div className={`rounded-[var(--radius-card)] p-5 text-white shadow-[var(--shadow-card)] ${entitlement.status === "expired" ? "bg-ink" : "bg-green"}`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-90">
            <Sparkles className="size-4" /> {entitlement.status === "trial" ? t("trialTitle") : entitlement.status === "premium" ? t("activeTitle") : t("expiredTitle")}
          </div>
          {entitlement.status === "expired" ? (
            <>
              <div className="mt-2 text-2xl font-extrabold">{t("expiredLead")}</div>
              <div className="mt-1 text-sm opacity-90">{t("trialEnds", { date: endDate })}</div>
            </>
          ) : (
            <>
              <div className="mt-2 text-2xl font-extrabold">{t("trialRemaining", { days: tc("days", { count: days }) })}</div>
              <div className="mt-1 text-sm opacity-90">{entitlement.status === "premium" ? t("activeUntil", { date: endDate }) : t("trialEnds", { date: endDate })}</div>
            </>
          )}
          <p className="mt-3 text-xs opacity-85">{t("whatHappens")}</p>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{t("plans")}</div>
            {!PRICING.confirmed ? <Badge tone="warning">{tc("toConfirm")}</Badge> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {plans.map((p) => (
              <Card key={p.id} className={`relative flex flex-col ${p.highlight ? "border-green" : ""}`}>
                {p.highlight ? <Badge tone="green" className="absolute -top-2.5 right-3">{t("yearlySaving")}</Badge> : null}
                <div className="text-sm font-semibold text-muted">{p.label}</div>
                <div className="mt-1 text-2xl font-extrabold text-ink">{formatXof(p.price)}</div>
                <div className="text-xs text-muted">{p.unit}</div>
                {enabled ? (
                  <form action={startCheckoutAction} className="mt-4">
                    <input type="hidden" name="plan" value={p.id} />
                    <SubmitButton full aria-label={t("pay", { amount: formatXof(p.price) })}>{t("pay", { amount: formatXof(p.price) })}</SubmitButton>
                  </form>
                ) : (
                  <Button className="mt-4" full disabled>
                    <Lock className="size-4" /> {t("pay", { amount: formatXof(p.price) })}
                  </Button>
                )}
              </Card>
            ))}
          </div>
          {!PRICING.confirmed ? <p className="mt-2 text-xs text-muted">{t("priceNote")}</p> : null}
        </section>

        {!enabled ? (
          <Card className="bg-warning-soft">
            <div className="text-sm font-bold text-ink">{t("payUnavailable")}</div>
            <p className="mt-1 text-sm text-ink">{t("payUnavailableHint")}</p>
            <p className="mt-2 text-xs text-muted">{t("methods")}</p>
          </Card>
        ) : manual ? (
          <Card className="bg-info-soft">
            <p className="text-sm text-ink">{t("manualNote")}</p>
          </Card>
        ) : null}

        {history.length ? (
          <Card>
            <CardTitle>{t("history")}</CardTitle>
            <ul className="divide-y divide-line">
              {history.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">
                      {p.plan === "yearly" ? t("yearly") : t("monthly")} · {formatXof(p.amount)}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {format.dateTime(p.createdAt, { day: "numeric", month: "short", year: "numeric" })} · {t("reference")} {p.reference}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={p.status === "confirmed" ? "green" : p.status === "pending" ? "warning" : p.status === "failed" ? "danger" : "gray"}>{t(`status.${p.status}`)}</Badge>
                    {p.status === "pending" ? (
                      <Link href={`/abonnement/retour?ref=${encodeURIComponent(p.reference)}`} className="text-xs font-bold text-green">
                        →
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <CardTitle>{t("includes")}</CardTitle>
          <ul className="space-y-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[15px] text-ink">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-soft text-green">
                  <Check className="size-3.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted">
            <Lock className="mt-0.5 size-3.5 shrink-0" /> {t("securityNote")}
          </p>
        </Card>

        <Link href="/profil" className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">
          <UserRound className="size-4" /> {t("manage")}
        </Link>
      </div>
    </>
  );
}
