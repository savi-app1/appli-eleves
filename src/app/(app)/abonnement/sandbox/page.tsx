import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Banner, PageHeader } from "@/components/ui/page";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDb } from "@/db/client";
import { sandboxPayAction } from "@/server/billing/actions";
import { getOwnPayment, isReference } from "@/server/billing/payments";
import { appEnv, paymentProviderConfig } from "@/server/billing/providers";
import { requireUser } from "@/server/auth/current";
import { formatXof } from "@/lib/utils";

/** Écran de test : n'est servi que si PAYMENT_PROVIDER=sandbox et hors production. */
export default async function SandboxPaymentPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { user } = await requireUser();
  const cfg = paymentProviderConfig();
  if (appEnv() === "production" || !cfg.enabled || cfg.provider.id !== "sandbox") redirect("/abonnement?erreur=payments_disabled");
  const { ref } = await searchParams;
  const db = await getDb();
  const payment = ref && isReference(ref) ? await getOwnPayment(db, user.id, ref) : null;
  if (!payment) redirect("/abonnement?erreur=invalid");
  if (payment.status !== "pending") redirect(`/abonnement/retour?ref=${encodeURIComponent(payment.reference)}`);
  const t = await getTranslations("subscription.sandbox");

  return (
    <>
      <PageHeader title={t("title")} back="/abonnement" />
      <div className="space-y-4">
        <Banner tone="warning">{t("warning")}</Banner>
        <Card className="text-center">
          <FlaskConical className="mx-auto size-10 text-muted" />
          <div className="mt-2 font-mono text-lg font-bold text-ink">{payment.reference}</div>
          <div className="text-sm text-muted">{t("amount", { amount: formatXof(payment.amount) })}</div>
          <div className="mt-4 grid gap-2">
            <form action={sandboxPayAction}>
              <input type="hidden" name="reference" value={payment.reference} />
              <input type="hidden" name="outcome" value="confirmed" />
              <SubmitButton full>{t("success")}</SubmitButton>
            </form>
            <form action={sandboxPayAction}>
              <input type="hidden" name="reference" value={payment.reference} />
              <input type="hidden" name="outcome" value="failed" />
              <SubmitButton full variant="outline">{t("fail")}</SubmitButton>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
