import { randomBytes } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { payments, subscriptions, users, type Payment, type Subscription, type User } from "@/db/schema";
import { audit } from "@/server/security/audit";
import { hit } from "@/server/security/rate-limit";
import { PRICING } from "./entitlement";
import { getPaymentProvider, type PaymentEvent, type Plan } from "./providers";

export const PLAN_DAYS: Record<Plan, number> = { monthly: 30, yearly: 365 };

/** Référence lisible, sans caractères ambigus (0/O, 1/I), ex. SAVI-7K3M9PQ2. */
export function newReference(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `SAVI-${out}`;
}

export function isReference(value: string): boolean {
  return /^SAVI-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(value);
}

/** Nouvelle fin de période : on prolonge la période payée restante, sinon on part de maintenant. */
export function nextPeriodEnd(sub: Pick<Subscription, "status" | "currentPeriodEnd">, plan: Plan, now = new Date()): Date {
  const stillPaid = sub.status === "active" && sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > now.getTime();
  const base = stillPaid ? sub.currentPeriodEnd!.getTime() : now.getTime();
  return new Date(base + PLAN_DAYS[plan] * 86_400_000);
}

export function planAmount(plan: Plan): number {
  return plan === "yearly" ? PRICING.yearly : PRICING.monthly;
}

export function parsePlan(value: unknown): Plan | null {
  return value === "monthly" || value === "yearly" ? value : null;
}

export class CheckoutRateLimitedError extends Error {
  readonly code = "rate_limited";
  constructor() {
    super("rate_limited");
  }
}

/* ------------------------------------------------------------------ démarrage d'un paiement */

export async function startCheckout(db: Db, user: Pick<User, "id">, plan: Plan, origin: string): Promise<{ payment: Payment; url: string }> {
  const provider = getPaymentProvider();
  const rl = await hit(db, `checkout:${user.id}`, { limit: 10, windowS: 3600 });
  if (!rl.allowed) throw new CheckoutRateLimitedError();

  // Réutilise une tentative encore ouverte (même formule, < 30 min) pour éviter les doublons.
  const since = new Date(Date.now() - 30 * 60_000);
  const existing = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, user.id), eq(payments.plan, plan), eq(payments.status, "pending"), eq(payments.provider, provider.id), gt(payments.createdAt, since)))
    .orderBy(desc(payments.createdAt))
    .limit(1);

  let payment = existing[0];
  if (!payment) {
    const amount = planAmount(plan);
    for (let attempt = 0; attempt < 3 && !payment; attempt++) {
      const reference = newReference();
      try {
        const rows = await db
          .insert(payments)
          .values({ userId: user.id, provider: provider.id, reference, providerRef: reference, plan, amount, currency: PRICING.currency, status: "pending" })
          .returning();
        payment = rows[0];
      } catch (e) {
        if (attempt === 2) throw e; // collision de référence improbable : on réessaie deux fois
      }
    }
    await audit(db, "payment.checkout_started", user.id, { plan, provider: provider.id, reference: payment!.reference });
  }

  const returnUrl = `${origin}/abonnement/retour?ref=${encodeURIComponent(payment!.reference)}`;
  const { url } = await provider.createCheckout({ reference: payment!.reference, plan, amount: payment!.amount, currency: payment!.currency, returnUrl, origin });
  return { payment: payment!, url };
}

/* ------------------------------------------------------------------ application d'un événement vérifié */

export type ApplyResult =
  | { outcome: "confirmed"; payment: Payment; periodEnd: Date }
  | { outcome: "already_confirmed"; payment: Payment }
  | { outcome: "failed"; payment: Payment; reason: string }
  | { outcome: "pending"; payment: Payment }
  | { outcome: "unknown_reference" };

/**
 * Point unique d'activation du Premium. Idempotent : un même événement rejoué ne prolonge pas deux fois.
 * `actor` = identifiant de l'administrateur pour une confirmation manuelle, sinon null.
 */
export async function applyPaymentEvent(db: Db, providerId: string, event: PaymentEvent, actor: string | null = null, now = new Date()): Promise<ApplyResult> {
  const found = await db.select().from(payments).where(eq(payments.reference, event.reference)).limit(1);
  const payment = found[0];
  if (!payment || payment.provider !== providerId) {
    await audit(db, "payment.unknown_reference", null, { provider: providerId, reference: event.reference.slice(0, 32) });
    return { outcome: "unknown_reference" };
  }
  if (payment.status === "confirmed") return { outcome: "already_confirmed", payment };
  if (payment.status === "refunded") return { outcome: "failed", payment, reason: "refunded" };

  if (event.status === "pending") return { outcome: "pending", payment };

  if (event.status === "failed") {
    const rows = await db
      .update(payments)
      .set({ status: "failed", providerRef: event.providerRef || payment.providerRef, failureReason: "provider_failed", rawPayload: event.raw ?? null, updatedAt: now })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
      .returning();
    await audit(db, "payment.failed", payment.userId, { reference: payment.reference, provider: providerId });
    return { outcome: "failed", payment: rows[0] ?? payment, reason: "provider_failed" };
  }

  // Montant et devise doivent correspondre exactement à ce qui a été demandé.
  if (event.amount !== payment.amount || event.currency !== payment.currency) {
    const rows = await db
      .update(payments)
      .set({ status: "failed", providerRef: event.providerRef || payment.providerRef, failureReason: "amount_mismatch", rawPayload: event.raw ?? null, updatedAt: now })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
      .returning();
    await audit(db, "payment.amount_mismatch", payment.userId, { reference: payment.reference, expected: payment.amount, received: event.amount, currency: event.currency });
    return { outcome: "failed", payment: rows[0] ?? payment, reason: "amount_mismatch" };
  }

  if (!payment.userId) {
    await audit(db, "payment.orphan", null, { reference: payment.reference });
    return { outcome: "failed", payment, reason: "orphan" };
  }
  const userId = payment.userId;

  const result = await db.transaction(async (tx) => {
    // Verrou optimiste : seule la transition pending → confirmed passe ; un rejeu concurrent ne fait rien.
    const updated = await tx
      .update(payments)
      .set({ status: "confirmed", providerRef: event.providerRef || payment.providerRef, confirmedAt: now, confirmedBy: actor, rawPayload: event.raw ?? null, failureReason: null, updatedAt: now })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
      .returning();
    if (!updated[0]) return null;

    const subRows = await tx.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
    const sub = subRows[0];
    const periodEnd = nextPeriodEnd(sub ?? { status: "trial", currentPeriodEnd: null }, payment.plan, now);
    if (sub) {
      await tx.update(subscriptions).set({ status: "active", plan: payment.plan, provider: providerId, currentPeriodEnd: periodEnd, updatedAt: now }).where(eq(subscriptions.id, sub.id));
    } else {
      await tx.insert(subscriptions).values({ userId, status: "active", plan: payment.plan, provider: providerId, trialEndsAt: now, currentPeriodEnd: periodEnd });
    }
    const final = await tx.update(payments).set({ periodEnd }).where(eq(payments.id, payment.id)).returning();
    return { payment: final[0]!, periodEnd };
  });

  if (!result) {
    const again = await db.select().from(payments).where(eq(payments.id, payment.id)).limit(1);
    return { outcome: "already_confirmed", payment: again[0] ?? payment };
  }
  await audit(db, "payment.confirmed", userId, { reference: payment.reference, provider: providerId, plan: payment.plan, manual: !!actor, by: actor });
  return { outcome: "confirmed", payment: result.payment, periodEnd: result.periodEnd };
}

/* ------------------------------------------------------------------ confirmation manuelle (administrateur) */

export async function confirmPaymentManually(db: Db, adminId: string, reference: string, providerRef: string): Promise<ApplyResult> {
  const found = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
  const payment = found[0];
  if (!payment) return { outcome: "unknown_reference" };
  return applyPaymentEvent(db, payment.provider, { reference, providerRef: providerRef.trim(), status: "confirmed", amount: payment.amount, currency: payment.currency, raw: { manual: true } }, adminId);
}

export async function failPaymentManually(db: Db, adminId: string, reference: string, reason: string): Promise<ApplyResult> {
  const found = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
  const payment = found[0];
  if (!payment) return { outcome: "unknown_reference" };
  const res = await applyPaymentEvent(db, payment.provider, { reference, providerRef: payment.providerRef, status: "failed", amount: payment.amount, currency: payment.currency, raw: { manual: true, reason: reason.slice(0, 80) } }, adminId);
  return res;
}

/* ------------------------------------------------------------------ côté élève */

export async function declarePayment(db: Db, userId: string, reference: string, payerNote: string) {
  const note = payerNote.replace(/\s+/g, " ").trim().slice(0, 60);
  const rows = await db
    .update(payments)
    .set({ payerNote: note || null, declaredAt: new Date(), updatedAt: new Date() })
    .where(and(eq(payments.reference, reference), eq(payments.userId, userId), eq(payments.status, "pending")))
    .returning();
  if (rows[0]) await audit(db, "payment.declared", userId, { reference });
  return rows[0] ?? null;
}

export async function getOwnPayment(db: Db, userId: string, reference: string): Promise<Payment | null> {
  const rows = await db.select().from(payments).where(and(eq(payments.reference, reference), eq(payments.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function listPayments(db: Db, userId: string, limit = 20): Promise<Payment[]> {
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).limit(limit);
}

/* ------------------------------------------------------------------ côté administrateur (vue minimale) */

export interface AdminPaymentRow {
  reference: string;
  plan: Plan;
  amount: number;
  currency: string;
  status: Payment["status"];
  payerNote: string | null;
  declaredAt: Date | null;
  createdAt: Date;
  confirmedAt: Date | null;
  firstName: string | null;
  maskedIdentifier: string | null;
}

/** Masque un e-mail ou un numéro : a***@exemple.com, +226 70 ** ** 33. */
export function maskIdentifier(email: string | null, phone: string | null): string | null {
  if (email) {
    const [local, domain] = email.split("@");
    return `${local?.slice(0, 1) ?? ""}***@${domain ?? ""}`;
  }
  if (phone) {
    const digits = phone.replace(/\s+/g, "");
    return `${digits.slice(0, 6)}****${digits.slice(-2)}`;
  }
  return null;
}

export async function listPaymentsForAdmin(db: Db, status: Payment["status"], limit = 100): Promise<AdminPaymentRow[]> {
  const rows = await db
    .select({
      reference: payments.reference,
      plan: payments.plan,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      payerNote: payments.payerNote,
      declaredAt: payments.declaredAt,
      createdAt: payments.createdAt,
      confirmedAt: payments.confirmedAt,
      firstName: users.firstName,
      email: users.email,
      phone: users.phone,
    })
    .from(payments)
    .leftJoin(users, eq(users.id, payments.userId))
    .where(eq(payments.status, status))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
  return rows.map(({ email, phone, ...r }) => ({ ...r, maskedIdentifier: maskIdentifier(email, phone) }));
}
