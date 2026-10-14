import { getDb } from "@/db/client";
import { applyPaymentEvent } from "@/server/billing/payments";
import { InvalidWebhookError, paymentProviderConfig } from "@/server/billing/providers";
import { audit } from "@/server/security/audit";
import { hit, ipKey } from "@/server/security/rate-limit";

/**
 * Notification de paiement du prestataire (serveur → serveur, sans cookie).
 * - seul le prestataire configuré est accepté ;
 * - la signature est vérifiée sur le corps brut avant toute lecture ;
 * - l'application de l'événement est idempotente (un rejeu ne prolonge pas deux fois l'abonnement).
 */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: providerParam } = await ctx.params;
  const cfg = paymentProviderConfig();
  if (!cfg.enabled || cfg.provider.id !== providerParam) return Response.json({ error: "unknown_provider" }, { status: 404 });

  const db = await getDb();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
  const rl = await hit(db, `webhook:${ipKey(ip)}`, { limit: 60, windowS: 60 });
  if (!rl.allowed) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } });

  const rawBody = await req.text();
  if (rawBody.length > 64 * 1024) return Response.json({ error: "too_large" }, { status: 413 });

  let event;
  try {
    event = await cfg.provider.parseWebhook({ headers: req.headers, rawBody });
  } catch (err) {
    const reason = err instanceof InvalidWebhookError ? err.reason : "error";
    await audit(db, "payment.webhook_rejected", null, { provider: providerParam, reason });
    return Response.json({ error: "invalid_signature", reason }, { status: 401 });
  }

  const result = await applyPaymentEvent(db, cfg.provider.id, event);
  if (result.outcome === "unknown_reference") return Response.json({ ok: false, outcome: result.outcome }, { status: 404 });
  return Response.json({ ok: true, outcome: result.outcome });
}
