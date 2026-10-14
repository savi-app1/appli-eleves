import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { rateLimits } from "@/db/schema";

export interface RateLimitRule {
  /** nombre maximal d'événements par fenêtre */
  limit: number;
  /** durée de la fenêtre en secondes */
  windowS: number;
}

export const RULES = {
  login: { limit: 10, windowS: 15 * 60 } satisfies RateLimitRule,
  /** par identifiant, toutes adresses confondues (force brute distribuée) */
  loginIdentifier: { limit: 30, windowS: 60 * 60 } satisfies RateLimitRule,
  register: { limit: 5, windowS: 60 * 60 } satisfies RateLimitRule,
  api: { limit: 120, windowS: 60 } satisfies RateLimitRule,
};

/**
 * Limiteur à fenêtre fixe stocké en base (fonctionne avec plusieurs instances et en serverless).
 * Retourne `allowed=false` quand la limite est dépassée. Les clés contiennent toujours le type d'action.
 */
export async function hit(db: Db, key: string, rule: RateLimitRule, now = new Date()): Promise<{ allowed: boolean; remaining: number; retryAfterS: number }> {
  const windowStart = new Date(Math.floor(now.getTime() / (rule.windowS * 1000)) * rule.windowS * 1000);
  const rows = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.windowStart} = ${windowStart} THEN ${rateLimits.count} + 1 ELSE 1 END`,
        windowStart,
      },
    })
    .returning({ count: rateLimits.count });
  const count = rows[0]?.count ?? 1;
  const resetAt = windowStart.getTime() + rule.windowS * 1000;
  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterS: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
  };
}

/** Hachage court et non réversible d'une adresse IP pour les clés de limitation (pas de stockage d'IP en clair). */
export function ipKey(ip: string | null | undefined) {
  if (!ip) return "noip";
  let h = 0;
  for (const c of ip) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

/** Hachage court (SHA-256 tronqué) d'une valeur sensible (identifiant) pour servir de clé de limitation. */
export function hashKey(value: string) {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("base64url").slice(0, 16);
}
