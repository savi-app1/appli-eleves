import { describe, expect, it } from "vitest";
import { computeEntitlement, trialEndDate, TRIAL_DAYS } from "@/server/billing/entitlement";

const now = new Date("2026-10-14T09:00:00Z");

describe("droits d'accès (essai / premium / expiré) calculés côté serveur", () => {
  it("l'essai dure TRIAL_DAYS jours à partir de l'inscription", () => {
    expect(TRIAL_DAYS).toBe(4);
    expect(trialEndDate(now).toISOString()).toBe("2026-10-18T09:00:00.000Z");
  });

  it("essai actif : jours restants arrondis au supérieur", () => {
    const e = computeEntitlement({ status: "trial", trialEndsAt: new Date("2026-10-16T12:00:00Z"), currentPeriodEnd: null }, now);
    expect(e.status).toBe("trial");
    expect(e.canUsePremium).toBe(true);
    expect(e.daysLeft).toBe(3);
  });

  it("essai expiré : accès premium bloqué", () => {
    const e = computeEntitlement({ status: "trial", trialEndsAt: new Date("2026-10-14T08:59:59Z"), currentPeriodEnd: null }, now);
    expect(e.status).toBe("expired");
    expect(e.canUsePremium).toBe(false);
    expect(e.daysLeft).toBe(0);
  });

  it("abonnement actif prime sur l'essai", () => {
    const e = computeEntitlement({ status: "active", trialEndsAt: new Date("2026-10-01T00:00:00Z"), currentPeriodEnd: new Date("2026-11-14T09:00:00Z") }, now);
    expect(e.status).toBe("premium");
    expect(e.daysLeft).toBe(31);
  });

  it("abonnement « actif » mais période échue → expiré (pas d'accès par défaut)", () => {
    const e = computeEntitlement({ status: "active", trialEndsAt: new Date("2026-10-01T00:00:00Z"), currentPeriodEnd: new Date("2026-10-13T00:00:00Z") }, now);
    expect(e.status).toBe("expired");
    expect(e.canUsePremium).toBe(false);
  });

  it("statut annulé sans période payée → expiré", () => {
    const e = computeEntitlement({ status: "cancelled", trialEndsAt: new Date("2026-10-01T00:00:00Z"), currentPeriodEnd: null }, now);
    expect(e.canUsePremium).toBe(false);
  });
});
