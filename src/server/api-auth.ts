import "server-only";
import { headers } from "next/headers";
import { getCurrentUser, type CurrentUser } from "@/server/auth/current";

function json(status: number, error: string) {
  return new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json" } });
}

/**
 * Vérifie que l'origine de la requête correspond à l'hôte servi (protection CSRF en profondeur, en plus du cookie
 * SameSite=Lax). Les requêtes sans en-tête Origin (outils, navigation) ne sont pas concernées.
 */
export async function sameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return true;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Utilisateur pour une route API : 401 JSON (jamais de redirection HTML) si la session est absente, 403 si l'origine est étrangère. */
export async function apiUser(): Promise<CurrentUser | Response> {
  if (!(await sameOrigin())) return json(403, "bad_origin");
  const current = await getCurrentUser();
  if (!current) return json(401, "unauthenticated");
  return current;
}

export function isResponse(x: unknown): x is Response {
  return x instanceof Response;
}
