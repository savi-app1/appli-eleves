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

/**
 * Préréglage de déploiement « netlify-preview » (environnement de validation hébergé sur Netlify, sans secret) :
 * les variables non sensibles sont figées dans le bundle au moment du build, car Netlify ne transmet pas
 * les variables de netlify.toml aux fonctions à l'exécution.
 */
const deployPreset = process.env.SAVI_DEPLOY_PRESET;
const presetEnv: Record<string, string> =
  deployPreset === "netlify-preview"
    ? {
        APP_ENV: "preview",
        // AI_PROVIDER volontairement absent : détection à l'exécution (clé injectée par l'hébergeur ou définie dans son interface).
        PAYMENT_PROVIDER: "sandbox",
        STORAGE_PROVIDER: "netlify-blobs",
        ADMIN_IDENTIFIERS: process.env.ADMIN_IDENTIFIERS ?? "admin.savi@exemple.com,admin.e2e@exemple.com",
        OCR_TIMEOUT_MS: "8000",
        DATABASE_POOL_MAX: "2",
        TRIAL_DAYS: "4",
        // Diagnostic (noms de variables seulement, jamais de valeurs) exposé par /api/sante hors production.
        SAVI_BUILD_INFO: JSON.stringify({
          context: process.env.CONTEXT ?? null,
          builtAt: new Date().toISOString(),
          envKeys: Object.keys(process.env)
            .filter((k) => /DATABASE|NEON|SUPABASE|^NETLIFY_|^DEPLOY_|^SITE_NAME$|^ANTHROPIC_|^OPENAI_|^GEMINI_/.test(k))
            .sort(),
        }),
      }
    : {};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: presetEnv,
  // Fichiers à embarquer dans les fonctions serverless (OCR local) ; PGlite exclu hors développement.
  outputFileTracingIncludes: deployPreset
    ? {
        // migrations SQL exécutées au premier démarrage (src/db/client.ts → migratePostgres)
        "/**": ["./drizzle/**/*"],
        "/api/corrections": ["./.data/tessdata/**/*", "./node_modules/tesseract.js/**/*", "./node_modules/tesseract.js-core/**/*"],
        "/api/documents": ["./.data/tessdata/**/*", "./node_modules/tesseract.js/**/*", "./node_modules/tesseract.js-core/**/*"],
      }
    : undefined,
  outputFileTracingExcludes: deployPreset ? { "*": ["./node_modules/@electric-sql/pglite/**/*"] } : undefined,
  // Image Docker (VPS) : sortie autonome. Non activé par défaut pour garder `next start` et Vercel inchangés.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  // Application authentifiée : rendu dynamique classique (pas de Cache Components)
  // pour garder un modèle simple et prévisible côté sécurité.
  cacheComponents: false,
  // Paquets natifs / WASM à ne pas regrouper dans le bundle serveur.
  // Paquets exécutés tels quels côté serveur (workers, WebAssembly, binaires) : ne pas les regrouper avec le bundler.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "tesseract.js", "unpdf"],
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
