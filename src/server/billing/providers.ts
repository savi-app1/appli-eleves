import { SIGNATURE_HEADER, verifySignature } from "./signature";

/**
 * Prestataires de paiement.
 *
 * Règles :
 * - aucun paiement n'est jamais simulé en production : le prestataire `sandbox` refuse de démarrer si APP_ENV=production ;
 * - l'accès Premium n'est activé qu'à partir d'un événement vérifié (signature) ou d'une confirmation manuelle tracée ;
 * - ajouter un prestataire réel (CinetPay, PayDunya, FedaPay, Wave…) = un fichier qui implémente `PaymentProvider`
 *   (création de la session de paiement + vérification de la notification), rien d'autre à changer.
 */

export type Plan = "monthly" | "yearly";

export type AppEnv = "development" | "test" | "preview" | "production";

export function appEnv(): AppEnv {
  const raw = process.env.APP_ENV;
  if (raw === "development" || raw === "test" || raw === "preview" || raw === "production") return raw;
  if (process.env.NODE_ENV === "test") return "test";
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export interface CheckoutRequest {
  reference: string;
  plan: Plan;
  amount: number;
  currency: string;
  /** URL absolue de retour après paiement (page « vérification en cours »). */
  returnUrl: string;
  /** Origine de l'application (pour construire des URL internes). */
  origin: string;
}

export interface CheckoutResult {
  /** URL vers laquelle envoyer l'élève (externe ou interne). */
  url: string;
}

export interface PaymentEvent {
  /** Référence SAVI (SAVI-XXXXXXXX) transmise au prestataire lors du paiement. */
  reference: string;
  /** Identifiant de la transaction chez le prestataire. */
  providerRef: string;
  status: "confirmed" | "failed" | "pending";
  amount: number;
  currency: string;
  /** Extrait non personnel conservé pour audit. */
  raw?: Record<string, unknown>;
}

export class InvalidWebhookError extends Error {
  readonly code = "invalid_webhook";
  constructor(public readonly reason: string) {
    super(`invalid_webhook:${reason}`);
  }
}

export interface PaymentProvider {
  readonly id: string;
  /** Vrai si la confirmation arrive automatiquement (webhook) ; faux si un humain doit confirmer. */
  readonly automaticConfirmation: boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  /** Analyse et vérifie une notification entrante. Lève InvalidWebhookError si la signature est invalide. */
  parseWebhook(input: { headers: Headers; rawBody: string }): Promise<PaymentEvent>;
}

export class PaymentsDisabledError extends Error {
  readonly code = "payments_disabled";
  constructor() {
    super("payments_disabled");
  }
}

/* ------------------------------------------------------------------ lien de paiement fourni (confirmation manuelle) */

function linkProvider(url: string): PaymentProvider {
  return {
    id: "link",
    automaticConfirmation: false,
    async createCheckout(req) {
      // L'élève voit d'abord une page d'instructions (montant, référence à indiquer, bouton vers le lien fourni).
      void url;
      return { url: `/abonnement/instructions?ref=${encodeURIComponent(req.reference)}` };
    },
    async parseWebhook() {
      throw new InvalidWebhookError("no_webhook_for_link_provider");
    },
  };
}

export function paymentLinkUrl(): string | null {
  return process.env.PAYMENT_LINK_URL?.trim() || null;
}

/* ------------------------------------------------------------------ webhook signé générique */

function parseGenericBody(rawBody: string): PaymentEvent {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw new InvalidWebhookError("bad_json");
  }
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  const providerRef = typeof body.transaction_id === "string" ? body.transaction_id.trim() : "";
  const statusRaw = typeof body.status === "string" ? body.status.toLowerCase() : "";
  const amount = Number(body.amount);
  const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "XOF";
  if (!reference || !providerRef || !Number.isFinite(amount)) throw new InvalidWebhookError("missing_fields");
  const status: PaymentEvent["status"] =
    statusRaw === "success" || statusRaw === "confirmed" || statusRaw === "paid" || statusRaw === "accepted"
      ? "confirmed"
      : statusRaw === "failed" || statusRaw === "cancelled" || statusRaw === "refused"
        ? "failed"
        : "pending";
  return { reference, providerRef, status, amount, currency, raw: { status: statusRaw, transaction_id: providerRef, amount, currency } };
}

function webhookProvider(secret: string, checkoutTemplate: string): PaymentProvider {
  return {
    id: "webhook",
    automaticConfirmation: true,
    async createCheckout(req) {
      const url = checkoutTemplate
        .replaceAll("{reference}", encodeURIComponent(req.reference))
        .replaceAll("{amount}", String(req.amount))
        .replaceAll("{currency}", req.currency)
        .replaceAll("{plan}", req.plan)
        .replaceAll("{return_url}", encodeURIComponent(req.returnUrl));
      return { url };
    },
    async parseWebhook({ headers, rawBody }) {
      const check = verifySignature(secret, rawBody, headers.get(SIGNATURE_HEADER));
      if (!check.ok) throw new InvalidWebhookError(check.reason);
      return parseGenericBody(rawBody);
    },
  };
}

/* ------------------------------------------------------------------ bac à sable (jamais en production) */

export class SandboxForbiddenError extends Error {
  constructor() {
    super("Le prestataire de paiement « sandbox » est interdit en production.");
  }
}

function sandboxProvider(): PaymentProvider {
  if (appEnv() === "production") throw new SandboxForbiddenError();
  return {
    id: "sandbox",
    automaticConfirmation: true,
    async createCheckout(req) {
      return { url: `/abonnement/sandbox?ref=${encodeURIComponent(req.reference)}` };
    },
    async parseWebhook({ headers, rawBody }) {
      const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
      if (!secret) throw new InvalidWebhookError("no_secret");
      const check = verifySignature(secret, rawBody, headers.get(SIGNATURE_HEADER));
      if (!check.ok) throw new InvalidWebhookError(check.reason);
      return parseGenericBody(rawBody);
    },
  };
}

/* ------------------------------------------------------------------ sélection */

export type ProviderConfig =
  | { enabled: false; reason: "disabled" | "misconfigured" | "sandbox_forbidden"; id: string }
  | { enabled: true; provider: PaymentProvider };

/** Lit la configuration sans lever d'exception (pour l'affichage). */
export function paymentProviderConfig(): ProviderConfig {
  const id = (process.env.PAYMENT_PROVIDER ?? "disabled").trim().toLowerCase();
  try {
    switch (id) {
      case "link": {
        const url = paymentLinkUrl();
        if (!url || !/^https:\/\//i.test(url)) return { enabled: false, reason: "misconfigured", id };
        return { enabled: true, provider: linkProvider(url) };
      }
      case "webhook": {
        const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
        const template = process.env.PAYMENT_CHECKOUT_URL?.trim();
        if (!secret || secret.length < 16 || !template || !/^https:\/\//i.test(template)) return { enabled: false, reason: "misconfigured", id };
        return { enabled: true, provider: webhookProvider(secret, template) };
      }
      case "sandbox":
        return { enabled: true, provider: sandboxProvider() };
      default:
        return { enabled: false, reason: "disabled", id };
    }
  } catch (e) {
    if (e instanceof SandboxForbiddenError) {
      console.error("[paiement]", e.message);
      return { enabled: false, reason: "sandbox_forbidden", id };
    }
    throw e;
  }
}

/** Prestataire actif, ou PaymentsDisabledError. */
export function getPaymentProvider(): PaymentProvider {
  const cfg = paymentProviderConfig();
  if (!cfg.enabled) throw new PaymentsDisabledError();
  return cfg.provider;
}
