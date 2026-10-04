import "server-only";
import { prisma } from "./db";
import { hmacHex } from "./crypto";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  resetAt: Date;
}

/**
 * Limiteur à fenêtre fixe stocké en base (fonctionne avec plusieurs instances serveur).
 * La clé est hachée : aucune IP ni adresse e-mail n'est stockée en clair.
 */
export async function rateLimit(scope: string, identifier: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const key = `${scope}:${hmacHex("ratelimit", identifier).slice(0, 40)}`;
  const rows = await prisma.$queryRaw<{ count: number; expiresAt: Date }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart", "expiresAt")
    VALUES (${key}, 1, now(), now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= now() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimitBucket"."expiresAt" <= now() THEN now() ELSE "RateLimitBucket"."windowStart" END,
      "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= now() THEN now() + make_interval(secs => ${windowSeconds}) ELSE "RateLimitBucket"."expiresAt" END
    RETURNING "count", "expiresAt"`;
  const row = rows[0];
  const count = Number(row?.count ?? 1);
  return { allowed: count <= limit, count, resetAt: row?.expiresAt ?? new Date(Date.now() + windowSeconds * 1000) };
}

export async function purgeExpiredRateLimits(): Promise<number> {
  const res = await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return res.count;
}
