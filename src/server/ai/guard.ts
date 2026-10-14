import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { usageCounters } from "@/db/schema";
import { requirePremium } from "@/server/billing/entitlement";
import { hit, RULES } from "@/server/security/rate-limit";

export type UsageKind = "tutor_messages" | "gradings" | "generations" | "uploads";

/** Plafonds journaliers par compte (protection des coûts d'IA et anti-abus). Modifiables par variables d'environnement. */
export const DAILY_LIMITS: Record<UsageKind, number> = {
  tutor_messages: Number(process.env.DAILY_LIMIT_TUTOR ?? 150),
  gradings: Number(process.env.DAILY_LIMIT_GRADINGS ?? 20),
  generations: Number(process.env.DAILY_LIMIT_GENERATIONS ?? 30),
  uploads: Number(process.env.DAILY_LIMIT_UPLOADS ?? 40),
};

export class RateLimitedError extends Error {
  constructor(public readonly retryAfterS: number) {
    super("Trop de demandes, réessaie dans un instant.");
    this.name = "RateLimitedError";
  }
}
export class QuotaExceededError extends Error {
  constructor(public readonly kind: UsageKind, public readonly limit: number) {
    super("Plafond journalier atteint pour cette fonction.");
    this.name = "QuotaExceededError";
  }
}

function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Incrémente le compteur du jour et renvoie la valeur atteinte. */
export async function bumpUsage(db: Db, userId: string, kind: UsageKind, now = new Date()): Promise<number> {
  const rows = await db
    .insert(usageCounters)
    .values({ userId, day: today(now), kind, count: 1 })
    .onConflictDoUpdate({ target: [usageCounters.userId, usageCounters.day, usageCounters.kind], set: { count: sql`${usageCounters.count} + 1` } })
    .returning({ count: usageCounters.count });
  return rows[0]?.count ?? 1;
}

export async function usageToday(db: Db, userId: string, kind: UsageKind, now = new Date()): Promise<number> {
  const rows = await db
    .select({ count: usageCounters.count })
    .from(usageCounters)
    .where(and(eq(usageCounters.userId, userId), eq(usageCounters.day, today(now)), eq(usageCounters.kind, kind)));
  return rows[0]?.count ?? 0;
}

/**
 * Garde commune à toute fonction qui consomme de l'IA :
 *  1. accès premium (essai actif ou abonnement) — sinon PremiumRequiredError (HTTP 402) ;
 *  2. limite de débit par utilisateur (120 appels / min) — sinon RateLimitedError (HTTP 429) ;
 *  3. plafond journalier par type d'usage — sinon QuotaExceededError (HTTP 429).
 */
export async function guardAiUsage(db: Db, userId: string, kind: UsageKind, now = new Date()) {
  const entitlement = await requirePremium(db, userId);
  const rl = await hit(db, `api:${userId}`, RULES.api, now);
  if (!rl.allowed) throw new RateLimitedError(rl.retryAfterS);
  const count = await bumpUsage(db, userId, kind, now);
  if (count > DAILY_LIMITS[kind]) throw new QuotaExceededError(kind, DAILY_LIMITS[kind]);
  return { entitlement, usedToday: count };
}

/** Traduit les erreurs métier en réponses HTTP (routes API). */
export function errorResponse(err: unknown): Response | null {
  const name = (err as { name?: string })?.name;
  const json = (status: number, body: Record<string, unknown>, headers?: Record<string, string>) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
  if (name === "PremiumRequiredError") return json(402, { error: "premium_required" });
  if (name === "RateLimitedError") return json(429, { error: "rate_limited" }, { "retry-after": String((err as RateLimitedError).retryAfterS) });
  if (name === "QuotaExceededError") return json(429, { error: "quota_exceeded", kind: (err as QuotaExceededError).kind, limit: (err as QuotaExceededError).limit });
  if (name === "AiUnavailableError") return json(503, { error: "ai_unavailable" });
  if (name === "NotFoundError") return json(404, { error: "not_found" });
  if (name === "ValidationError") return json(400, { error: "invalid", message: (err as Error).message });
  return null;
}

export class NotFoundError extends Error {
  constructor(what = "ressource") {
    super(`${what} introuvable`);
    this.name = "NotFoundError";
  }
}
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
