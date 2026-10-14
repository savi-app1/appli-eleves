import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Banner, EmptyState, PageHeader } from "@/components/ui/page";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDb } from "@/db/client";
import { adminConfirmPaymentAction, adminFailPaymentAction } from "@/server/billing/actions";
import { requireAdmin } from "@/server/billing/admin";
import { listPaymentsForAdmin } from "@/server/billing/payments";
import { formatXof } from "@/lib/utils";

type Search = { resultat?: string; erreur?: string };

/** Administration minimale : uniquement les paiements, avec identifiants masqués. */
export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const sp = await searchParams;
  const t = await getTranslations("subscription");
  const format = await getFormatter();
  const db = await getDb();
  const [pending, confirmed] = await Promise.all([listPaymentsForAdmin(db, "pending", 100), listPaymentsForAdmin(db, "confirmed", 20)]);
  const resultKey = sp.resultat && ["confirmed", "already_confirmed", "failed", "unknown_reference", "pending"].includes(sp.resultat) ? sp.resultat : null;
  const date = (d: Date) => format.dateTime(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} back="/profil" />
      <div className="space-y-4">
        {resultKey ? <Banner tone={resultKey === "confirmed" ? "green" : "info"}>{t(`admin.result.${resultKey}`)}</Banner> : null}
        {sp.erreur ? <Banner tone="danger">{t("errors.invalid")}</Banner> : null}

        <section>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("admin.pending")} ({pending.length})</div>
          {pending.length === 0 ? (
            <EmptyState title={t("admin.none")} />
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <Card key={p.reference}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-base font-extrabold text-ink">{p.reference}</div>
                      <div className="text-sm text-ink">
                        {p.plan === "yearly" ? t("yearly") : t("monthly")} · {formatXof(p.amount)} · {p.firstName ?? "—"} {p.maskedIdentifier ? `(${p.maskedIdentifier})` : ""}
                      </div>
                      <div className="text-xs text-muted">{t("admin.createdAt", { date: date(p.createdAt) })}</div>
                      {p.declaredAt ? <div className="text-xs text-green-ink">{t("admin.declared", { date: date(p.declaredAt) })}</div> : null}
                      {p.payerNote ? <div className="text-xs text-ink">{t("admin.noteLabel", { note: p.payerNote })}</div> : null}
                    </div>
                    <Badge tone="warning">{t("status.pending")}</Badge>
                  </div>
                  <form action={adminConfirmPaymentAction} className="mt-3 flex items-end gap-2">
                    <input type="hidden" name="reference" value={p.reference} />
                    <div className="flex-1">
                      <Field label={t("admin.providerRef")} htmlFor={`ref-${p.reference}`}>
                        <Input id={`ref-${p.reference}`} name="providerRef" required minLength={4} maxLength={80} autoComplete="off" />
                      </Field>
                    </div>
                    <SubmitButton>{t("admin.confirm")}</SubmitButton>
                  </form>
                  <form action={adminFailPaymentAction} className="mt-2">
                    <input type="hidden" name="reference" value={p.reference} />
                    <input type="hidden" name="reason" value="admin_rejected" />
                    <SubmitButton variant="ghost" size="sm">{t("admin.reject")}</SubmitButton>
                  </form>
                </Card>
              ))}
            </div>
          )}
        </section>

        {confirmed.length ? (
          <Card>
            <CardTitle>{t("admin.confirmed")}</CardTitle>
            <ul className="divide-y divide-line text-sm">
              {confirmed.map((p) => (
                <li key={p.reference} className="flex items-center justify-between gap-2 py-2">
                  <span className="font-mono text-xs text-ink">{p.reference}</span>
                  <span className="text-xs text-muted">{formatXof(p.amount)} · {p.confirmedAt ? date(p.confirmedAt) : ""}</span>
                  <Badge tone="green">{t("status.confirmed")}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
