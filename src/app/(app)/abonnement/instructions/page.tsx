import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Banner, PageHeader } from "@/components/ui/page";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDb } from "@/db/client";
import { declarePaymentAction } from "@/server/billing/actions";
import { getOwnPayment, isReference } from "@/server/billing/payments";
import { paymentLinkUrl, paymentProviderConfig } from "@/server/billing/providers";
import { requireUser } from "@/server/auth/current";
import { formatXof } from "@/lib/utils";

/** Paiement par lien fourni par l'équipe SAVI : instructions + déclaration « j'ai payé » (confirmation manuelle ensuite). */
export default async function PaymentInstructionsPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { user } = await requireUser();
  const { ref } = await searchParams;
  const cfg = paymentProviderConfig();
  const link = paymentLinkUrl();
  if (!cfg.enabled || cfg.provider.id !== "link" || !link) redirect("/abonnement?erreur=payments_disabled");
  const db = await getDb();
  const payment = ref && isReference(ref) ? await getOwnPayment(db, user.id, ref) : null;
  if (!payment) redirect("/abonnement?erreur=invalid");
  if (payment.status !== "pending") redirect(`/abonnement/retour?ref=${encodeURIComponent(payment.reference)}`);
  const t = await getTranslations("subscription");
  const amount = formatXof(payment.amount);

  return (
    <>
      <PageHeader title={t("instructions.title")} subtitle={t("instructions.lead", { plan: payment.plan === "yearly" ? t("yearly") : t("monthly"), amount })} back="/abonnement" />
      <div className="space-y-4">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{t("instructions.copy")}</div>
          <div className="mt-1 font-mono text-2xl font-extrabold tracking-wide text-ink">{payment.reference}</div>
        </Card>
        <Card>
          <ol className="list-decimal space-y-2 pl-5 text-[15px] text-ink">
            <li>{t("instructions.step1")}</li>
            <li>{t("instructions.step2", { amount, reference: payment.reference })}</li>
            <li>{t("instructions.step3")}</li>
          </ol>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green px-4 py-3 text-sm font-bold text-white"
          >
            <ExternalLink className="size-4" /> {t("instructions.open")}
          </a>
        </Card>
        <Banner tone="info">{t("manualNote")}</Banner>
        <Card>
          <form action={declarePaymentAction} className="space-y-3">
            <input type="hidden" name="reference" value={payment.reference} />
            <Field label={t("instructions.note")} htmlFor="note">
              <Input id="note" name="note" maxLength={60} placeholder={t("instructions.notePlaceholder")} autoComplete="off" />
            </Field>
            <SubmitButton full>{t("instructions.declare")}</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
