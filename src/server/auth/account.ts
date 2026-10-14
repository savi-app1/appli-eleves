import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { documents, subjects, submissions, subscriptions, users, type User } from "@/db/schema";
import { trialEndDate } from "@/server/billing/entitlement";
import { audit } from "@/server/security/audit";
import { getStorage } from "@/server/storage";
import { parseIdentifier, type Identifier } from "./identifier";
import { hashPassword, passwordPolicyError, verifyPassword } from "./password";
import { createSession, revokeAllUserSessions } from "./session";

export type AuthErrorCode =
  | "invalid_identifier"
  | "password_too_short"
  | "password_too_long"
  | "identifier_taken"
  | "invalid_credentials"
  | "first_name_required"
  | "consent_required"
  | "rate_limited";

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
  }
}

export const LEVELS = ["primaire", "6e", "5e", "4e", "3e", "2nde", "1ere", "tle", "superieur", "concours"] as const;
export type Level = (typeof LEVELS)[number];

const DEFAULT_SUBJECTS = [
  { name: "Mathématiques", emoji: "📐" },
  { name: "Français", emoji: "📝" },
  { name: "Physique-Chimie", emoji: "⚗️" },
  { name: "SVT", emoji: "🌱" },
  { name: "Histoire-Géographie", emoji: "🌍" },
  { name: "Anglais", emoji: "🇬🇧" },
];

export interface RegisterInput {
  identifier: string;
  password: string;
  firstName: string;
  level: string;
  country: string;
  consent: boolean;
  userAgent?: string | null;
}

async function findByIdentifier(db: Db, id: Identifier): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(id.kind === "email" ? eq(users.email, id.value) : eq(users.phone, id.value))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Inscription : crée l'utilisateur, son abonnement d'essai (date calculée côté serveur),
 * ses matières par défaut et une session — le tout dans une transaction.
 */
export async function register(db: Db, input: RegisterInput) {
  const identifier = parseIdentifier(input.identifier, input.country);
  if (!identifier) throw new AuthError("invalid_identifier");
  const pwErr = passwordPolicyError(input.password);
  if (pwErr) throw new AuthError(pwErr);
  const firstName = input.firstName.trim().slice(0, 60);
  if (firstName.length < 1) throw new AuthError("first_name_required");
  if (!input.consent) throw new AuthError("consent_required");
  const level = (LEVELS as readonly string[]).includes(input.level) ? input.level : "3e";
  const country = /^[A-Z]{2}$/.test(input.country) ? input.country : "BF";

  if (await findByIdentifier(db, identifier)) throw new AuthError("identifier_taken");

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  const user = await db.transaction(async (tx) => {
    const [u] = await tx
      .insert(users)
      .values({
        email: identifier.kind === "email" ? identifier.value : null,
        phone: identifier.kind === "phone" ? identifier.value : null,
        passwordHash,
        firstName,
        level,
        country,
        consentAt: now,
      })
      .returning();
    await tx.insert(subscriptions).values({ userId: u.id, status: "trial", trialEndsAt: trialEndDate(now) });
    await tx.insert(subjects).values(DEFAULT_SUBJECTS.map((s) => ({ ...s, userId: u.id })));
    return u;
  });

  const session = await createSession(db, user.id, input.userAgent);
  await audit(db, "auth.register", user.id, { kind: identifier.kind, level, country });
  return { user, session };
}

export async function login(db: Db, rawIdentifier: string, password: string, userAgent?: string | null) {
  const identifier = parseIdentifier(rawIdentifier);
  // On vérifie toujours un mot de passe (même sur identifiant inconnu) pour un temps de réponse constant.
  const user = identifier ? await findByIdentifier(db, identifier) : null;
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AuthError("invalid_credentials");
  const session = await createSession(db, user.id, userAgent);
  await audit(db, "auth.login", user.id, { kind: identifier?.kind });
  return { user, session };
}

export async function changePassword(db: Db, userId: string, current: string, next: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !(await verifyPassword(current, user.passwordHash))) throw new AuthError("invalid_credentials");
  const pwErr = passwordPolicyError(next);
  if (pwErr) throw new AuthError(pwErr);
  await db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, userId));
  await revokeAllUserSessions(db, userId);
  await audit(db, "auth.password_changed", userId);
}

/** Suppression définitive : les tables liées sont en ON DELETE CASCADE ; l'audit garde une trace anonymisée. */
/**
 * Suppression définitive : fichiers importés effacés du stockage (au mieux : un fichier déjà absent n'empêche rien),
 * puis toutes les données de l'élève par cascade (conversations, documents, quiz, paiements, sessions…).
 */
export async function deleteAccount(db: Db, userId: string) {
  await audit(db, "account.delete", null, { userHash: userId.slice(0, 8) });
  const docs = await db.select({ key: documents.storageKey }).from(documents).where(eq(documents.userId, userId));
  const subs = await db.select({ key: submissions.storageKey }).from(submissions).where(eq(submissions.userId, userId));
  const storage = getStorage();
  const keys = [...docs, ...subs].map((r) => r.key).filter((k): k is string => Boolean(k));
  await Promise.all(keys.map((k) => storage.delete(k).catch(() => undefined)));
  await db.delete(users).where(eq(users.id, userId));
}

export interface PreferencesInput {
  uiLocale?: string;
  questionLocale?: string;
  answerLocale?: string;
  alsoFrench?: boolean;
  theme?: "light" | "dark" | "system";
  firstName?: string;
  level?: string;
  country?: string;
}

export async function updatePreferences(db: Db, userId: string, input: PreferencesInput) {
  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (input.uiLocale) patch.uiLocale = input.uiLocale;
  if (input.questionLocale) patch.questionLocale = input.questionLocale;
  if (input.answerLocale) patch.answerLocale = input.answerLocale;
  if (typeof input.alsoFrench === "boolean") patch.alsoFrench = input.alsoFrench;
  if (input.theme) patch.theme = input.theme;
  if (input.firstName?.trim()) patch.firstName = input.firstName.trim().slice(0, 60);
  if (input.level && (LEVELS as readonly string[]).includes(input.level)) patch.level = input.level;
  if (input.country && /^[A-Z]{2}$/.test(input.country)) patch.country = input.country;
  const [u] = await db.update(users).set(patch).where(eq(users.id, userId)).returning();
  return u;
}

// Hachage factice (mot de passe aléatoire) utilisé pour égaliser le temps de réponse des connexions échouées.
const DUMMY_HASH = "scrypt$131072$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
