import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signature des notifications de paiement (format générique SAVI) :
 *   X-Savi-Signature: t=<secondes unix>,v1=<hmac_sha256(secret, `${t}.${corps brut}`)>
 * Un prestataire (ou un petit relais) qui notifie SAVI doit produire exactement cet en-tête.
 */
export const SIGNATURE_HEADER = "x-savi-signature";
export const SIGNATURE_TOLERANCE_S = 5 * 60;

export function signPayload(secret: string, rawBody: string, timestampS = Math.floor(Date.now() / 1000)): string {
  const mac = createHmac("sha256", secret).update(`${timestampS}.${rawBody}`).digest("hex");
  return `t=${timestampS},v1=${mac}`;
}

export type SignatureCheck = { ok: true } | { ok: false; reason: "missing" | "malformed" | "expired" | "mismatch" };

export function verifySignature(secret: string, rawBody: string, header: string | null | undefined, nowS = Math.floor(Date.now() / 1000)): SignatureCheck {
  if (!header) return { ok: false, reason: "missing" };
  const parts = Object.fromEntries(
    header
      .split(",")
      .map((kv) => kv.trim().split("="))
      .filter((kv) => kv.length === 2) as [string, string][],
  );
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(t) || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return { ok: false, reason: "malformed" };
  if (Math.abs(nowS - t) > SIGNATURE_TOLERANCE_S) return { ok: false, reason: "expired" };
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "mismatch" };
  return { ok: true };
}
