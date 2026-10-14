"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { LOCALE_COOKIE, THEME_COOKIE, isLocale } from "@/i18n/config";
import { hashKey, hit, ipKey, RULES } from "@/server/security/rate-limit";
import { audit } from "@/server/security/audit";
import { AuthError, deleteAccount, login, register, updatePreferences, type AuthErrorCode } from "./account";
import { clientIp, getCurrentUser, sessionCookieOptions } from "./current";
import { revokeSession, SESSION_COOKIE } from "./session";

export interface AuthFormState {
  error?: AuthErrorCode | "unknown";
  fields?: Record<string, string>;
}

const registerSchema = z.object({
  firstName: z.string().min(1).max(60),
  identifier: z.string().min(3).max(254),
  password: z.string().min(1).max(128),
  level: z.string().max(20),
  country: z.string().length(2),
  consent: z.literal("on").optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1).max(254),
  password: z.string().min(1).max(128),
  next: z.string().optional(),
});

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/accueil";
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  const fields = { firstName: String(formData.get("firstName") ?? ""), identifier: String(formData.get("identifier") ?? ""), level: String(formData.get("level") ?? ""), country: String(formData.get("country") ?? "") };
  if (!parsed.success) return { error: "invalid_identifier", fields };
  const db = await getDb();
  const ip = await clientIp();
  const rl = await hit(db, `register:${ipKey(ip)}`, RULES.register);
  if (!rl.allowed) return { error: "rate_limited", fields };
  try {
    const ua = (await headers()).get("user-agent");
    const { user, session } = await register(db, { ...parsed.data, consent: parsed.data.consent === "on", userAgent: ua });
    await setSessionCookie(session.token, session.expiresAt);
    const store = await cookies();
    store.set(LOCALE_COOKIE, user.uiLocale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  } catch (e) {
    if (e instanceof AuthError) return { error: e.code, fields };
    console.error("[register]", e);
    return { error: "unknown", fields };
  }
  redirect("/accueil");
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const fields = { identifier: String(formData.get("identifier") ?? "") };
  if (!parsed.success) return { error: "invalid_credentials", fields };
  const db = await getDb();
  const ip = await clientIp();
  const idKey = hashKey(parsed.data.identifier);
  const rl = await hit(db, `login:${ipKey(ip)}:${idKey}`, RULES.login);
  if (!rl.allowed) return { error: "rate_limited", fields };
  const rlId = await hit(db, `login:id:${idKey}`, RULES.loginIdentifier);
  if (!rlId.allowed) return { error: "rate_limited", fields };
  try {
    const ua = (await headers()).get("user-agent");
    const { user, session } = await login(db, parsed.data.identifier, parsed.data.password, ua);
    await setSessionCookie(session.token, session.expiresAt);
    const store = await cookies();
    store.set(LOCALE_COOKIE, user.uiLocale, { path: "/", maxAge: 31536000, sameSite: "lax" });
    store.set(THEME_COOKIE, user.theme, { path: "/", maxAge: 31536000, sameSite: "lax" });
  } catch (e) {
    if (e instanceof AuthError) return { error: e.code, fields };
    console.error("[login]", e);
    return { error: "unknown", fields };
  }
  redirect(safeNext(parsed.data.next));
}

export async function logoutAction() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    const current = await getCurrentUser();
    await revokeSession(db, token);
    await audit(db, "auth.logout", current?.user.id ?? null);
  }
  store.delete(SESSION_COOKIE);
  redirect("/connexion");
}

const prefsSchema = z.object({
  uiLocale: z.string().optional(),
  questionLocale: z.string().optional(),
  answerLocale: z.string().optional(),
  alsoFrench: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  firstName: z.string().max(60).optional(),
  level: z.string().max(20).optional(),
  country: z.string().length(2).optional(),
});

export async function updatePreferencesAction(input: z.input<typeof prefsSchema>) {
  const current = await getCurrentUser();
  if (!current) return { ok: false as const, error: "unauthenticated" };
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  const data = parsed.data;
  if (data.uiLocale && !isLocale(data.uiLocale)) delete data.uiLocale;
  if (data.questionLocale && data.questionLocale !== "auto" && !isLocale(data.questionLocale)) delete data.questionLocale;
  if (data.answerLocale && !isLocale(data.answerLocale)) delete data.answerLocale;
  const db = await getDb();
  const user = await updatePreferences(db, current.user.id, data);
  const store = await cookies();
  store.set(LOCALE_COOKIE, user.uiLocale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  if (data.theme) store.set(THEME_COOKIE, data.theme, { path: "/", maxAge: 31536000, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteAccountAction(formData: FormData) {
  const current = await getCurrentUser();
  if (!current) redirect("/connexion");
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "SUPPRIMER") {
    redirect("/profil?delete=confirm");
  }
  const db = await getDb();
  await deleteAccount(db, current.user.id);
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/bienvenue?deleted=1");
}
