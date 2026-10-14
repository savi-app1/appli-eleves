import "server-only";
import { getCurrentUser, type CurrentUser } from "@/server/auth/current";

/** Utilisateur pour une route API : 401 JSON (jamais de redirection HTML) si la session est absente. */
export async function apiUser(): Promise<CurrentUser | Response> {
  const current = await getCurrentUser();
  if (!current) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { "content-type": "application/json" } });
  return current;
}

export function isResponse(x: unknown): x is Response {
  return x instanceof Response;
}
