import { getFormatter, getTranslations } from "next-intl/server";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { getDb } from "@/db/client";
import { getOwnPayment, isReference } from "@/server/billing/payments";
import { paymentProviderConfig } from "@/server/billing/providers";
import { requireUser } from "@/server/auth/current";

/** Page de retour après paiement : état réel lu en base (jamais déduit du simple retour de l'élève). */
export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { user } = await requireUser();
  const { ref } = await searchParams;
  const t = await getTranslations("subscription.returnPage");
  const format = await getFormatter();
  const db = await getDb();
  const payment = ref && isReference(ref) ? await getOwnPayment(db, user.id, ref) : null;
  const cfg = paymentProviderConfig();
  const automatic = cfg.enabled && cfg.provider.automaticConfirmation;

  if (!payment) {
    return (
      <>
        <PageHeader title={t("title")} back="/abonnement" />
        <EmptyState title={t("notFound")} action={<ButtonLink href="/abonnement" variant="outline">{t("back")}</ButtonLink>} />
      </>
    );
  }

  if (payment.status === "confirmed") {
    return (
      <>
        <PageHeader title={t("title")} back="/abonnement" />
        <Card className="text-center">
          <CheckCircle2 className="mx-auto size-12 text-green" />
          <h2 className="mt-3 text-lg font-extrabold text-ink">{t("confirmedTitle")}</h2>
          <p className="mt-1 text-sm text-muted">
            {t("confirmedBody", { date: payment.periodEnd ? format.dateTime(payment.periodEnd, { day: "numeric", month: "long", year: "numeric" }) : "—" })}
          </p>
          <ButtonLink href="/accueil" className="mt-4" full>{t("home")}</ButtonLink>
        </Card>
      </>
    );
  }

  if (payment.status === "pending") {
    return (
      <>
        {automatic ? <meta httpEquiv="refresh" content="6" /> : null}
        <PageHeader title={t("title")} back="/abonnement" />
        <Card className="text-center">
          <Clock className="mx-auto size-12 text-warning" />
          <h2 className="mt-3 text-lg font-extrabold text-ink">{t("pendingTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{automatic ? t("pendingBodyAuto") : t("pendingBodyManual")}</p>
          <p className="mt-3 font-mono text-sm font-bold text-ink">{payment.reference}</p>
          <ButtonLink href="/abonnement" variant="outline" className="mt-4" full>{t("back")}</ButtonLink>
        </Card>
      </>
    );
  }

  const reasonKey = (["provider_failed", "amount_mismatch", "refunded", "admin_rejected"] as const).find((k) => k === payment.failureReason) ?? "provider_failed";
  return (
    <>
      <PageHeader title={t("title")} back="/abonnement" />
      <Card className="text-center">
        <XCircle className="mx-auto size-12 text-danger" />
        <h2 className="mt-3 text-lg font-extrabold text-ink">{t("failedTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("failedBody", { reason: t(`reasons.${reasonKey}`) })}</p>
        <ButtonLink href="/abonnement" className="mt-4" full>{t("retry")}</ButtonLink>
      </Card>
    </>
  );
}
