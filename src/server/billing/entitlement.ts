import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { subscriptions, type Subscription } from "@/db/schema";

/** Durée de l'essai, définie UNIQUEMENT côté serveur. */
export const TRIAL_DAYS = Math.max(0, Number(process.env.TRIAL_DAYS ?? 4));

export const PRICING = {
  currency: "XOF",
  monthly: Number(process.env.PRICING_MONTHLY_XOF ?? 1000),
  yearly: Number(process.env.PRICING_YEARLY_XOF ?? 10000),
  /** Les tarifs restent « à confirmer » tant que PRICING_CONFIRMED=1 n'est pas défini. */
  confirmed: process.env.PRICING_CONFIRMED === "1",
};

export type EntitlementStatus = "trial" | "premium" | "expired";

export interface Entitlement {
  status: EntitlementStatus;
  /** fin de l'essai (toujours renseignée) */
  trialEndsAt: Date;
  /** fin de la période payée si abonnement actif */
  premiumUntil: Date | null;
  /** jours entiers restants (essai ou abonnement), 0 si expiré */
  daysLeft: number;
  canUsePremium: boolean;
}

export function computeEntitlement(sub: Pick<Subscription, "status" | "trialEndsAt" | "currentPeriodEnd">, now = new Date()): Entitlement {
  const premiumActive = sub.status === "active" && !!sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > now.getTime();
  if (premiumActive) {
    return {
      status: "premium",
      trialEndsAt: sub.trialEndsAt,
      premiumUntil: sub.currentPeriodEnd,
      daysLeft: daysUntil(sub.currentPeriodEnd!, now),
      canUsePremium: true,
    };
  }
  const trialActive = sub.trialEndsAt.getTime() > now.getTime();
  return {
    status: trialActive ? "trial" : "expired",
    trialEndsAt: sub.trialEndsAt,
    premiumUntil: null,
    daysLeft: trialActive ? daysUntil(sub.trialEndsAt, now) : 0,
    canUsePremium: trialActive,
  };
}

function daysUntil(date: Date, now: Date) {
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 86_400_000));
}

export function trialEndDate(from = new Date()) {
  return new Date(from.getTime() + TRIAL_DAYS * 86_400_000);
}

export async function getSubscription(db: Db, userId: string): Promise<Subscription | null> {
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getEntitlement(db: Db, userId: string, now = new Date()): Promise<Entitlement> {
  const sub = await getSubscription(db, userId);
  // Un utilisateur sans ligne d'abonnement (cas anormal) est traité comme expiré : jamais d'accès gratuit par défaut.
  if (!sub) return { status: "expired", trialEndsAt: now, premiumUntil: null, daysLeft: 0, canUsePremium: false };
  return computeEntitlement(sub, now);
}

export class PremiumRequiredError extends Error {
  readonly code = "premium_required";
  constructor() {
    super("premium_required");
  }
}

/** À appeler dans toute fonction serveur coûteuse (IA, OCR, génération). */
export async function requirePremium(db: Db, userId: string) {
  const e = await getEntitlement(db, userId);
  if (!e.canUsePremium) throw new PremiumRequiredError();
  return e;
}
