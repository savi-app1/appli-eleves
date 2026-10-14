import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { sessions, users, type User } from "@/db/schema";

export const SESSION_COOKIE = "savi_session";
export const SESSION_DAYS = 30;
const REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // on prolonge si < 15 jours restants

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken() {
  return randomBytes(32).toString("base64url");
}

export async function createSession(db: Db, userId: string, userAgent?: string | null) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt, userAgent: userAgent?.slice(0, 255) ?? null });
  return { token, expiresAt };
}

export interface SessionValidation {
  user: User;
  session: { id: string; expiresAt: Date };
  /** true si l'expiration a été prolongée (le cookie doit être réémis) */
  refreshed: boolean;
}

export async function validateSessionToken(db: Db, token: string): Promise<SessionValidation | null> {
  if (!token || token.length < 20) return null;
  const tokenHash = hashToken(token);
  const now = new Date();
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  let expiresAt = row.session.expiresAt;
  let refreshed = false;
  if (expiresAt.getTime() - now.getTime() < REFRESH_THRESHOLD_MS) {
    expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
    refreshed = true;
  }
  await db.update(sessions).set({ lastUsedAt: now, expiresAt }).where(eq(sessions.id, row.session.id));
  return { user: row.user, session: { id: row.session.id, expiresAt }, refreshed };
}

export async function revokeSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function revokeAllUserSessions(db: Db, userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function purgeExpiredSessions(db: Db) {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
