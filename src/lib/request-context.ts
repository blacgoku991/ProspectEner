import "server-only";
import { headers } from "next/headers";
import { env } from "./env";

/**
 * Adresse IP du client, en ne faisant confiance qu'au nombre configuré de proxys
 * (TRUSTED_PROXY_HOPS) pour l'en-tête X-Forwarded-For.
 */
export function clientIpFromHeaders(h: Headers): string | null {
  const hops = env().TRUSTED_PROXY_HOPS;
  const xff = h.get("x-forwarded-for");
  if (xff && hops > 0) {
    const list = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const candidate = list[Math.max(0, list.length - hops)];
    if (candidate) return candidate.slice(0, 64);
  }
  return h.get("x-real-ip")?.slice(0, 64) ?? null;
}

export function userAgentFromHeaders(h: Headers): string | null {
  const ua = h.get("user-agent");
  return ua ? ua.slice(0, 200) : null;
}

export async function requestContext(): Promise<{ ip: string | null; userAgent: string | null; origin: string | null }> {
  const h = await headers();
  return { ip: clientIpFromHeaders(h), userAgent: userAgentFromHeaders(h), origin: h.get("origin") };
}

/** Vérifie que la requête provient du site lui-même (protection CSRF des routes API publiques). */
export function isSameOrigin(h: Headers): boolean {
  const origin = h.get("origin");
  if (!origin) return h.get("sec-fetch-site") === "same-origin";
  try {
    const appHost = new URL(env().APP_URL).host;
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const o = new URL(origin).host;
    return o === appHost || (host !== null && o === host);
  } catch {
    return false;
  }
}
