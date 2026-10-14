import { describe, expect, it } from "vitest";
import { signPayload, verifySignature } from "@/server/billing/signature";
import { isReference, maskIdentifier, newReference, nextPeriodEnd } from "@/server/billing/payments";
import { appEnv, paymentProviderConfig } from "@/server/billing/providers";

const secret = "s3cr3t-de-test-suffisamment-long";

describe("signature des notifications de paiement", () => {
  it("accepte une signature valide et récente", () => {
    const body = JSON.stringify({ reference: "SAVI-ABCDEFGH", status: "success" });
    const header = signPayload(secret, body);
    expect(verifySignature(secret, body, header)).toEqual({ ok: true });
  });

  it("refuse un corps modifié, un mauvais secret, un en-tête absent ou mal formé", () => {
    const body = JSON.stringify({ reference: "SAVI-ABCDEFGH", amount: 1000 });
    const header = signPayload(secret, body);
    expect(verifySignature(secret, body.replace("1000", "1"), header)).toEqual({ ok: false, reason: "mismatch" });
    expect(verifySignature("autre-secret-tres-long-aussi", body, header)).toEqual({ ok: false, reason: "mismatch" });
    expect(verifySignature(secret, body, null)).toEqual({ ok: false, reason: "missing" });
    expect(verifySignature(secret, body, "t=abc,v1=zz")).toEqual({ ok: false, reason: "malformed" });
  });

  it("refuse une signature trop ancienne (rejeu)", () => {
    const body = "{}";
    const old = Math.floor(Date.now() / 1000) - 3600;
    expect(verifySignature(secret, body, signPayload(secret, body, old))).toEqual({ ok: false, reason: "expired" });
  });
});

describe("références et périodes", () => {
  it("génère des références lisibles et uniques", () => {
    const refs = new Set(Array.from({ length: 200 }, () => newReference()));
    expect(refs.size).toBe(200);
    for (const r of refs) expect(isReference(r)).toBe(true);
    expect(isReference("SAVI-0OI1AAAA")).toBe(false);
    expect(isReference("savi-abcdefgh")).toBe(false);
  });

  it("prolonge la période payée restante, sinon part de maintenant", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    const fromNow = nextPeriodEnd({ status: "trial", currentPeriodEnd: null }, "monthly", now);
    expect(fromNow.toISOString()).toBe("2026-11-13T12:00:00.000Z");
    const stillPaid = nextPeriodEnd({ status: "active", currentPeriodEnd: new Date("2026-12-01T00:00:00Z") }, "yearly", now);
    expect(stillPaid.toISOString()).toBe("2027-12-01T00:00:00.000Z");
    const expired = nextPeriodEnd({ status: "active", currentPeriodEnd: new Date("2026-01-01T00:00:00Z") }, "monthly", now);
    expect(expired.toISOString()).toBe("2026-11-13T12:00:00.000Z");
  });

  it("masque les identifiants pour la vue administrateur", () => {
    expect(maskIdentifier("awa@exemple.com", null)).toBe("a***@exemple.com");
    expect(maskIdentifier(null, "+22670112233")).toBe("+22670****33");
    expect(maskIdentifier(null, null)).toBeNull();
  });
});

describe("configuration du prestataire", () => {
  it("est désactivé par défaut et refuse une configuration incomplète", () => {
    const saved = { ...process.env };
    try {
      delete process.env.PAYMENT_PROVIDER;
      expect(paymentProviderConfig()).toMatchObject({ enabled: false, reason: "disabled" });
      process.env.PAYMENT_PROVIDER = "link";
      delete process.env.PAYMENT_LINK_URL;
      expect(paymentProviderConfig()).toMatchObject({ enabled: false, reason: "misconfigured" });
      process.env.PAYMENT_LINK_URL = "http://pas-https.example";
      expect(paymentProviderConfig()).toMatchObject({ enabled: false, reason: "misconfigured" });
      process.env.PAYMENT_LINK_URL = "https://pay.example/savi";
      expect(paymentProviderConfig()).toMatchObject({ enabled: true });
      process.env.PAYMENT_PROVIDER = "webhook";
      process.env.PAYMENT_WEBHOOK_SECRET = "court";
      process.env.PAYMENT_CHECKOUT_URL = "https://pay.example/checkout?ref={reference}";
      expect(paymentProviderConfig()).toMatchObject({ enabled: false, reason: "misconfigured" });
      process.env.PAYMENT_WEBHOOK_SECRET = secret;
      expect(paymentProviderConfig()).toMatchObject({ enabled: true });
    } finally {
      process.env = saved;
    }
  });

  it("interdit le bac à sable en production", () => {
    const saved = { ...process.env };
    try {
      process.env.PAYMENT_PROVIDER = "sandbox";
      process.env.APP_ENV = "production";
      expect(appEnv()).toBe("production");
      expect(paymentProviderConfig()).toMatchObject({ enabled: false, reason: "sandbox_forbidden" });
      process.env.APP_ENV = "preview";
      expect(paymentProviderConfig()).toMatchObject({ enabled: true });
    } finally {
      process.env = saved;
    }
  });
});
