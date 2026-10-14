import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (ex-middleware) : contrôles OPTIMISTES et en-têtes de sécurité.
 * La vérification réelle de la session (en base) est faite par les pages/actions via `getCurrentUser()`.
 */
const SESSION_COOKIE = "savi_session";
const PUBLIC_PATHS = new Set(["/", "/bienvenue", "/connexion", "/inscription", "/manifest.webmanifest", "/sw.js", "/hors-ligne", "/mentions-legales", "/confidentialite", "/conditions"]);
const AUTH_ONLY_PATHS = new Set(["/connexion", "/inscription", "/bienvenue"]);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && !PUBLIC_PATHS.has(pathname) && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = pathname !== "/accueil" ? `?next=${encodeURIComponent(pathname + search)}` : "";
    return NextResponse.redirect(url);
  }
  if (hasSession && AUTH_ONLY_PATHS.has(pathname) && !request.nextUrl.searchParams.has("deleted")) {
    const url = request.nextUrl.clone();
    url.pathname = "/accueil";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Politique de sécurité du contenu avec nonce par requête. Appliquée en production (vérifiée : tous les scripts
  // rendus par Next.js portent le nonce) ; en mode « rapport seul » en développement (outils de Next.js).
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV !== "production";
  const allowEmbed = process.env.SAVI_ALLOW_EMBED === "1";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    allowEmbed ? "frame-ancestors *" : "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isDev || allowEmbed ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js lit le nonce dans l'en-tête CSP de la *requête* pour l'appliquer à ses balises <script> : indispensable quand
  // le proxy s'exécute à part du serveur (fonction edge chez l'hébergeur) et pas dans le même processus.
  requestHeaders.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(isDev ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", csp);
  // Les environnements autres que la production ne doivent pas être indexés.
  if ((process.env.APP_ENV ?? (isDev ? "development" : "production")) !== "production") response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: [
    // Tout sauf les ressources statiques
    "/((?!_next/static|_next/image|icons/|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico|txt|xml)$).*)",
  ],
};
