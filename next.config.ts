import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * En-têtes de sécurité appliqués à toutes les réponses.
 * La CSP est volontairement stricte ; elle sera ajustée si un service externe
 * (prestataire de paiement, suivi d'erreurs) doit être chargé côté client.
 */
const allowEmbed = process.env.SAVI_ALLOW_EMBED === "1"; // prévisualisation dans un cadre (sandbox) uniquement

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Protection contre le détournement de clic (clickjacking), désactivable seulement pour la prévisualisation.
  ...(allowEmbed ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Application authentifiée : rendu dynamique classique (pas de Cache Components)
  // pour garder un modèle simple et prévisible côté sécurité.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Autorise la prévisualisation du serveur de développement derrière un proxy (sandbox, tunnel).
  allowedDevOrigins: ["*.e2b.app", "**.e2b.app"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
