import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { conversations, sessions, subjects, subscriptions, users } from "@/db/schema";
import { AuthError, deleteAccount, login, register, updatePreferences } from "@/server/auth/account";
import { revokeSession, validateSessionToken } from "@/server/auth/session";
import { getEntitlement, PremiumRequiredError, requirePremium } from "@/server/billing/entitlement";
import { hit, RULES } from "@/server/security/rate-limit";
import { createTestDb } from "../helpers/db";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());

const base = { password: "Secret-Awa-2026", firstName: "Awa", level: "3e", country: "BF", consent: true };

describe("inscription", () => {
  it("crée l'utilisateur, l'essai de 4 jours, les matières par défaut et une session", async () => {
    const before = Date.now();
    const { user, session } = await register(db, { ...base, identifier: "awa@exemple.com" });
    expect(user.email).toBe("awa@exemple.com");
    expect(user.phone).toBeNull();
    expect(user.passwordHash).not.toContain("Secret");

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id));
    expect(sub.status).toBe("trial");
    const days = (sub.trialEndsAt.getTime() - before) / 86_400_000;
    expect(days).toBeGreaterThan(3.99);
    expect(days).toBeLessThanOrEqual(4.01);

    const subs = await db.select().from(subjects).where(eq(subjects.userId, user.id));
    expect(subs.length).toBe(6);

    const valid = await validateSessionToken(db, session.token);
    expect(valid?.user.id).toBe(user.id);
  });

  it("accepte un numéro de téléphone national comme identifiant", async () => {
    const { user } = await register(db, { ...base, identifier: "70 12 34 56" });
    expect(user.phone).toBe("+22670123456");
    expect(user.email).toBeNull();
  });

  it("refuse un identifiant déjà utilisé, un mot de passe court et l'absence de consentement", async () => {
    await expect(register(db, { ...base, identifier: "awa@exemple.com" })).rejects.toMatchObject({ code: "identifier_taken" });
    await expect(register(db, { ...base, identifier: "+226 70 12 34 56" })).rejects.toMatchObject({ code: "identifier_taken" });
    await expect(register(db, { ...base, identifier: "b@exemple.com", password: "court" })).rejects.toMatchObject({ code: "password_too_short" });
    await expect(register(db, { ...base, identifier: "c@exemple.com", consent: false })).rejects.toMatchObject({ code: "consent_required" });
    await expect(register(db, { ...base, identifier: "pas un identifiant" })).rejects.toBeInstanceOf(AuthError);
  });
});

describe("connexion et sessions", () => {
  it("connecte avec e-mail ou téléphone (différentes écritures) et refuse un mauvais mot de passe", async () => {
    const a = await login(db, "AWA@exemple.com", base.password);
    expect(a.user.email).toBe("awa@exemple.com");
    const b = await login(db, "0022670123456", base.password);
    expect(b.user.phone).toBe("+22670123456");
    await expect(login(db, "awa@exemple.com", "mauvais")).rejects.toMatchObject({ code: "invalid_credentials" });
    await expect(login(db, "inconnu@exemple.com", base.password)).rejects.toMatchObject({ code: "invalid_credentials" });
  });

  it("stocke uniquement le haché du jeton et révoque proprement", async () => {
    const { session, user } = await login(db, "awa@exemple.com", base.password);
    const rows = await db.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(rows.some((r) => r.tokenHash === session.token)).toBe(false);
    expect(rows.every((r) => r.tokenHash.length === 64)).toBe(true);
    await revokeSession(db, session.token);
    expect(await validateSessionToken(db, session.token)).toBeNull();
  });

  it("rejette un jeton falsifié ou expiré", async () => {
    expect(await validateSessionToken(db, "jeton-invente-xxxxxxxxxxxxxxxxxxxxxxxx")).toBeNull();
    const { session, user } = await login(db, "awa@exemple.com", base.password);
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.userId, user.id));
    expect(await validateSessionToken(db, session.token)).toBeNull();
  });
});

describe("droits d'accès", () => {
  it("un nouvel inscrit est en essai et peut utiliser le premium ; une fois l'essai échu, c'est bloqué", async () => {
    const { user } = await register(db, { ...base, identifier: "essai@exemple.com" });
    expect((await getEntitlement(db, user.id)).status).toBe("trial");
    await expect(requirePremium(db, user.id)).resolves.toBeTruthy();

    await db.update(subscriptions).set({ trialEndsAt: new Date(Date.now() - 60_000) }).where(eq(subscriptions.userId, user.id));
    expect((await getEntitlement(db, user.id)).status).toBe("expired");
    await expect(requirePremium(db, user.id)).rejects.toBeInstanceOf(PremiumRequiredError);
  });

  it("un utilisateur sans ligne d'abonnement n'a aucun accès premium", async () => {
    const { user } = await register(db, { ...base, identifier: "sansabo@exemple.com" });
    await db.delete(subscriptions).where(eq(subscriptions.userId, user.id));
    expect((await getEntitlement(db, user.id)).canUsePremium).toBe(false);
  });
});

describe("limitation des tentatives", () => {
  it("bloque après la limite puis réinitialise à la fenêtre suivante", async () => {
    const rule = { limit: 3, windowS: 60 };
    const t0 = new Date("2026-10-14T10:00:00Z");
    expect((await hit(db, "login:test", rule, t0)).allowed).toBe(true);
    expect((await hit(db, "login:test", rule, t0)).allowed).toBe(true);
    expect((await hit(db, "login:test", rule, t0)).allowed).toBe(true);
    const blocked = await hit(db, "login:test", rule, t0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterS).toBeGreaterThan(0);
    expect((await hit(db, "login:test", rule, new Date("2026-10-14T10:01:00Z"))).allowed).toBe(true);
    expect(RULES.login.limit).toBeLessThanOrEqual(10);
  });
});

describe("cloisonnement et suppression", () => {
  it("les données d'un utilisateur ne sont jamais visibles par un autre et disparaissent avec le compte", async () => {
    const a = await register(db, { ...base, identifier: "a@exemple.com" });
    const b = await register(db, { ...base, identifier: "b@exemple.com" });
    await db.insert(conversations).values({ userId: a.user.id, title: "Pythagore" });

    const seenByB = await db.select().from(conversations).where(eq(conversations.userId, b.user.id));
    expect(seenByB.length).toBe(0);

    await deleteAccount(db, a.user.id);
    expect((await db.select().from(users).where(eq(users.id, a.user.id))).length).toBe(0);
    expect((await db.select().from(conversations).where(eq(conversations.userId, a.user.id))).length).toBe(0);
    expect((await db.select().from(sessions).where(eq(sessions.userId, a.user.id))).length).toBe(0);
    expect(await validateSessionToken(db, a.session.token)).toBeNull();
  });

  it("met à jour les préférences en validant les valeurs", async () => {
    const { user } = await register(db, { ...base, identifier: "prefs@exemple.com" });
    const u = await updatePreferences(db, user.id, { uiLocale: "en", answerLocale: "mos", theme: "dark", level: "niveau-invalide", firstName: "  Aïcha  " });
    expect(u.uiLocale).toBe("en");
    expect(u.answerLocale).toBe("mos");
    expect(u.theme).toBe("dark");
    expect(u.level).toBe("3e");
    expect(u.firstName).toBe("Aïcha");
  });
});
