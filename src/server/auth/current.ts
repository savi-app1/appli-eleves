import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import type { User } from "@/db/schema";
import { getEntitlement, type Entitlement } from "@/server/billing/entitlement";
import { SESSION_COOKIE, validateSessionToken } from "./session";

export interface CurrentUser {
  user: User;
  entitlement: Entitlement;
}

const isProd = process.env.NODE_ENV === "production";

export function sessionCookieOptions(expires: Date) {
  return { httpOnly: true, secure: isProd, sameSite: "lax" as const, path: "/", expires };
}

/**
 * Utilisateur de la requête courante (mémorisé par requête grâce à `cache`).
 * Lit le cookie de session, le vérifie en base et calcule le droit d'accès (essai / premium / expiré).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const result = await validateSessionToken(db, token);
  if (!result) return null;
  if (result.refreshed) {
    // La prolongation du cookie n'est possible que dans une action ou un gestionnaire de route ;
    // dans un rendu de page, l'appel est ignoré silencieusement par Next.js.
    try {
      store.set(SESSION_COOKIE, token, sessionCookieOptions(result.session.expiresAt));
    } catch {}
  }
  const entitlement = await getEntitlement(db, result.user.id);
  return { user: result.user, entitlement };
});

export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/connexion");
  return current;
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
