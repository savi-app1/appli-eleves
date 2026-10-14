"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireUser } from "@/server/auth/current";
import { requireAdmin } from "./admin";
import { applyPaymentEvent, confirmPaymentManually, declarePayment, failPaymentManually, getOwnPayment, isReference, parsePlan, startCheckout } from "./payments";
import { appEnv, paymentProviderConfig } from "./providers";

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

function isNextRedirect(err: unknown) {
  return typeof (err as { digest?: string })?.digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

/** Origine publique de l'application : NEXT_PUBLIC_APP_URL sinon l'hôte de la requête. */
async function requestOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured && !/localhost|127\.0\.0\.1/.test(configured)) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Démarre un paiement pour la formule choisie et envoie l'élève vers la page de paiement. */
export async function startCheckoutAction(fd: FormData) {
  const { user } = await requireUser();
  const plan = parsePlan(str(fd, "plan"));
  if (!plan) redirect("/abonnement?erreur=invalid");
  const db = await getDb();
  let url: string;
  try {
    const origin = await requestOrigin();
    ({ url } = await startCheckout(db, user, plan, origin));
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    const code = (err as { code?: string })?.code;
    if (code === "payments_disabled") redirect("/abonnement?erreur=payments_disabled");
    if (code === "rate_limited") redirect("/abonnement?erreur=rate_limited");
    console.error("[paiement] démarrage impossible", err);
    redirect("/abonnement?erreur=unknown");
  }
  redirect(url);
}

/** L'élève indique qu'il a payé via le lien fourni (numéro de transaction facultatif). */
export async function declarePaymentAction(fd: FormData) {
  const { user } = await requireUser();
  const reference = str(fd, "reference");
  if (!isReference(reference)) redirect("/abonnement?erreur=invalid");
  const db = await getDb();
  await declarePayment(db, user.id, reference, str(fd, "note"));
  revalidatePath("/abonnement");
  redirect(`/abonnement/retour?ref=${encodeURIComponent(reference)}`);
}

/**
 * Bac à sable : simule la notification du prestataire. Refusé hors environnement de test/prévisualisation
 * et si le prestataire configuré n'est pas `sandbox`. N'existe jamais en production.
 */
export async function sandboxPayAction(fd: FormData) {
  const { user } = await requireUser();
  const cfg = paymentProviderConfig();
  if (appEnv() === "production" || !cfg.enabled || cfg.provider.id !== "sandbox") redirect("/abonnement?erreur=payments_disabled");
  const reference = str(fd, "reference");
  if (!isReference(reference)) redirect("/abonnement?erreur=invalid");
  const db = await getDb();
  const payment = await getOwnPayment(db, user.id, reference);
  if (!payment) redirect("/abonnement?erreur=invalid");
  const outcome = str(fd, "outcome") === "failed" ? "failed" : "confirmed";
  await applyPaymentEvent(db, "sandbox", {
    reference,
    providerRef: `SBX-${Date.now().toString(36).toUpperCase()}`,
    status: outcome,
    amount: payment.amount,
    currency: payment.currency,
    raw: { sandbox: true, status: outcome },
  });
  revalidatePath("/abonnement");
  redirect(`/abonnement/retour?ref=${encodeURIComponent(reference)}`);
}

/* ---------- Administration des paiements ---------- */

export async function adminConfirmPaymentAction(fd: FormData) {
  const { user } = await requireAdmin();
  const reference = str(fd, "reference");
  const providerRef = str(fd, "providerRef").slice(0, 80);
  if (!isReference(reference) || providerRef.length < 4) redirect("/admin/paiements?erreur=invalid");
  const db = await getDb();
  const res = await confirmPaymentManually(db, user.id, reference, providerRef);
  revalidatePath("/admin/paiements");
  redirect(`/admin/paiements?resultat=${res.outcome}`);
}

export async function adminFailPaymentAction(fd: FormData) {
  const { user } = await requireAdmin();
  const reference = str(fd, "reference");
  if (!isReference(reference)) redirect("/admin/paiements?erreur=invalid");
  const db = await getDb();
  const res = await failPaymentManually(db, user.id, reference, str(fd, "reason") || "admin_rejected");
  revalidatePath("/admin/paiements");
  redirect(`/admin/paiements?resultat=${res.outcome}`);
}
