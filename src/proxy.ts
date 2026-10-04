import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxy (ex-middleware) :
 * - pose une Content-Security-Policy stricte avec nonce par requête ;
 * - redirige vers la connexion les accès à /admin sans cookie de session
 *   (premier filtre uniquement : chaque page et action revérifie la session côté serveur).
 */

const PUBLIC_ADMIN_PATHS = ["/admin/connexion", "/admin/activation"];

export function proxy(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const httpsApp = (process.env.APP_URL ?? "").startsWith("https://");
  const nonce = btoa(crypto.randomUUID());
  const turnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}${turnstile ? " https://challenges.cloudflare.com" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
    `frame-src ${turnstile ? "https://challenges.cloudflare.com" : "'none'"}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
    ...(isProd && httpsApp ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    const cookieName = isProd ? "__Host-pe_admin" : "pe_admin";
    if (!request.cookies.get(cookieName)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/connexion";
      url.search = "";
      if (pathname !== "/admin" && /^\/admin\/[\w/-]{1,200}$/.test(pathname)) url.searchParams.set("suite", pathname);
      return NextResponse.redirect(url);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
