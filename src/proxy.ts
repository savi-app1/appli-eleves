import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (ex-middleware) : contrôles OPTIMISTES et en-têtes de sécurité.
 * La vérification réelle de la session (en base) est faite par les pages/actions via `getCurrentUser()`.
 */
const SESSION_COOKIE = "savi_session";
const PUBLIC_PATHS = new Set(["/", "/bienvenue", "/connexion", "/inscription", "/manifest.webmanifest", "/mentions-legales", "/confidentialite", "/conditions"]);
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

  // Politique de sécurité du contenu avec nonce (mode « rapport seul » jusqu'à vérification en navigateur à l'étape 6).
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy-Report-Only", csp);
  return response;
}

export const config = {
  matcher: [
    // Tout sauf les ressources statiques
    "/((?!_next/static|_next/image|icons/|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico|txt|xml)$).*)",
  ],
};
