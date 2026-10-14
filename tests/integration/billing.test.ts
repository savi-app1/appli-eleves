import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { auditLog, payments, subscriptions } from "@/db/schema";
import { deleteAccount, register } from "@/server/auth/account";
import { getEntitlement } from "@/server/billing/entitlement";
import { applyPaymentEvent, confirmPaymentManually, declarePayment, getOwnPayment, listPaymentsForAdmin, startCheckout } from "@/server/billing/payments";
import { signPayload, SIGNATURE_HEADER } from "@/server/billing/signature";
import { createTestDb } from "../helpers/db";

let db: Db;
let close: () => Promise<void>;

// La route HTTP ouvre la base via getDb() : on la fait pointer sur la base de test.
vi.mock("@/db/client", () => ({ getDb: async () => db }));
const base = { password: "Secret-Awa-2026", firstName: "Awa", level: "3e", country: "BF", consent: true };
const secret = "secret-webhook-de-test-tres-long";

beforeAll(async () => {
  process.env.PAYMENT_PROVIDER = "sandbox";
  process.env.APP_ENV = "test";
  process.env.PAYMENT_WEBHOOK_SECRET = secret;
  ({ db, close } = await createTestDb());
});
afterAll(() => close());

async function expireTrial(userId: string) {
  await db.update(subscriptions).set({ trialEndsAt: new Date(Date.now() - 86_400_000) }).where(eq(subscriptions.userId, userId));
}

describe("paiement et activation du Premium", () => {
  it("crée un paiement en attente et renvoie l'URL de paiement", async () => {
    const { user } = await register(db, { ...base, identifier: "pay1@exemple.com" });
    await expireTrial(user.id);
    expect((await getEntitlement(db, user.id)).canUsePremium).toBe(false);

    const { payment, url } = await startCheckout(db, user, "monthly", "https://savi.test");
    expect(payment.status).toBe("pending");
    expect(payment.amount).toBe(1000);
    expect(payment.reference).toMatch(/^SAVI-/);
    expect(url).toContain(`/abonnement/sandbox?ref=${payment.reference}`);

    // Un second clic dans la foulée réutilise la même tentative.
    const again = await startCheckout(db, user, "monthly", "https://savi.test");
    expect(again.payment.id).toBe(payment.id);
  });

  it("active 30 jours de Premium sur événement confirmé, de façon idempotente", async () => {
    const { user } = await register(db, { ...base, identifier: "pay2@exemple.com" });
    await expireTrial(user.id);
    const { payment } = await startCheckout(db, user, "monthly", "https://savi.test");
    const now = new Date();

    const res = await applyPaymentEvent(db, "sandbox", { reference: payment.reference, providerRef: "TX-1", status: "confirmed", amount: 1000, currency: "XOF" }, null, now);
    expect(res.outcome).toBe("confirmed");
    const e1 = await getEntitlement(db, user.id, now);
    expect(e1.status).toBe("premium");
    expect(e1.premiumUntil!.getTime()).toBe(now.getTime() + 30 * 86_400_000);

    const replay = await applyPaymentEvent(db, "sandbox", { reference: payment.reference, providerRef: "TX-1", status: "confirmed", amount: 1000, currency: "XOF" }, null, now);
    expect(replay.outcome).toBe("already_confirmed");
    const e2 = await getEntitlement(db, user.id, now);
    expect(e2.premiumUntil!.getTime()).toBe(e1.premiumUntil!.getTime());

    const [row] = await db.select().from(payments).where(eq(payments.id, payment.id));
    expect(row.status).toBe("confirmed");
    expect(row.providerRef).toBe("TX-1");
    expect(row.periodEnd!.getTime()).toBe(e1.premiumUntil!.getTime());
  });

  it("prolonge un abonnement encore actif (annuel) au lieu de repartir de zéro", async () => {
    const { user } = await register(db, { ...base, identifier: "pay3@exemple.com" });
    const now = new Date();
    const p1 = (await startCheckout(db, user, "monthly", "https://savi.test")).payment;
    await applyPaymentEvent(db, "sandbox", { reference: p1.reference, providerRef: "TX-A", status: "confirmed", amount: 1000, currency: "XOF" }, null, now);
    const p2 = (await startCheckout(db, user, "yearly", "https://savi.test")).payment;
    await applyPaymentEvent(db, "sandbox", { reference: p2.reference, providerRef: "TX-B", status: "confirmed", amount: 10000, currency: "XOF" }, null, now);
    const e = await getEntitlement(db, user.id, now);
    expect(e.premiumUntil!.getTime()).toBe(now.getTime() + (30 + 365) * 86_400_000);
  });

  it("refuse un montant ou une devise différents et n'active rien", async () => {
    const { user } = await register(db, { ...base, identifier: "pay4@exemple.com" });
    await expireTrial(user.id);
    const { payment } = await startCheckout(db, user, "yearly", "https://savi.test");
    const res = await applyPaymentEvent(db, "sandbox", { reference: payment.reference, providerRef: "TX-2", status: "confirmed", amount: 1000, currency: "XOF" });
    expect(res.outcome).toBe("failed");
    expect((await getEntitlement(db, user.id)).canUsePremium).toBe(false);
    const own = await getOwnPayment(db, user.id, payment.reference);
    expect(own?.status).toBe("failed");
    expect(own?.failureReason).toBe("amount_mismatch");
  });

  it("ignore une référence inconnue ou un autre prestataire", async () => {
    expect((await applyPaymentEvent(db, "sandbox", { reference: "SAVI-ZZZZZZZZ", providerRef: "X", status: "confirmed", amount: 1000, currency: "XOF" })).outcome).toBe("unknown_reference");
    const { user } = await register(db, { ...base, identifier: "pay5@exemple.com" });
    const { payment } = await startCheckout(db, user, "monthly", "https://savi.test");
    expect((await applyPaymentEvent(db, "webhook", { reference: payment.reference, providerRef: "X", status: "confirmed", amount: 1000, currency: "XOF" })).outcome).toBe("unknown_reference");
  });

  it("confirmation manuelle par un administrateur : activation + journal d'audit", async () => {
    const { user } = await register(db, { ...base, identifier: "pay6@exemple.com" });
    const { user: admin } = await register(db, { ...base, identifier: "admin@exemple.com" });
    await expireTrial(user.id);
    const { payment } = await startCheckout(db, user, "monthly", "https://savi.test");
    await declarePayment(db, user.id, payment.reference, "MP123456");

    const pending = await listPaymentsForAdmin(db, "pending");
    const row = pending.find((p) => p.reference === payment.reference)!;
    expect(row.payerNote).toBe("MP123456");
    expect(row.maskedIdentifier).toBe("p***@exemple.com");
    expect(row).not.toHaveProperty("email");

    const res = await confirmPaymentManually(db, admin.id, payment.reference, "MP123456");
    expect(res.outcome).toBe("confirmed");
    expect((await getEntitlement(db, user.id)).status).toBe("premium");
    const logs = await db.select().from(auditLog).where(eq(auditLog.action, "payment.confirmed"));
    const log = logs.find((l) => (l.meta as { reference: string }).reference === payment.reference)!;
    expect(log.userId).toBe(user.id);
    expect(log.meta).toMatchObject({ manual: true, by: admin.id });
  });

  it("le webhook HTTP refuse une signature invalide et accepte une signature valide", async () => {
    const { POST } = await import("@/app/api/paiements/webhook/[provider]/route");
    const { user } = await register(db, { ...base, identifier: "pay7@exemple.com" });
    await expireTrial(user.id);
    const { payment } = await startCheckout(db, user, "monthly", "https://savi.test");
    const body = JSON.stringify({ reference: payment.reference, transaction_id: "TX-HTTP", status: "success", amount: 1000, currency: "XOF" });

    const bad = await POST(new Request("https://savi.test/api/paiements/webhook/sandbox", { method: "POST", body, headers: { [SIGNATURE_HEADER]: signPayload("mauvais-secret-mais-long-aussi", body) } }), { params: Promise.resolve({ provider: "sandbox" }) });
    expect(bad.status).toBe(401);
    expect((await getEntitlement(db, user.id)).canUsePremium).toBe(false);

    const unknown = await POST(new Request("https://savi.test/api/paiements/webhook/autre", { method: "POST", body }), { params: Promise.resolve({ provider: "autre" }) });
    expect(unknown.status).toBe(404);

    const good = await POST(new Request("https://savi.test/api/paiements/webhook/sandbox", { method: "POST", body, headers: { [SIGNATURE_HEADER]: signPayload(secret, body) } }), { params: Promise.resolve({ provider: "sandbox" }) });
    expect(good.status).toBe(200);
    expect(await good.json()).toEqual({ ok: true, outcome: "confirmed" });
    expect((await getEntitlement(db, user.id)).status).toBe("premium");
  });

  it("la suppression du compte conserve la trace comptable anonymisée", async () => {
    const { user } = await register(db, { ...base, identifier: "pay8@exemple.com" });
    const { payment } = await startCheckout(db, user, "monthly", "https://savi.test");
    await applyPaymentEvent(db, "sandbox", { reference: payment.reference, providerRef: "TX-DEL", status: "confirmed", amount: 1000, currency: "XOF" });
    await deleteAccount(db, user.id);
    const [row] = await db.select().from(payments).where(eq(payments.id, payment.id));
    expect(row).toBeDefined();
    expect(row.userId).toBeNull();
    expect(row.status).toBe("confirmed");
  });
});
