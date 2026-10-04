import "server-only";
import { cookies } from "next/headers";
import type { StaffSession, StaffUser } from "@/generated/prisma/client";
import { prisma } from "../db";
import { hashIp, randomToken, sha256Hex } from "../crypto";
import { isProduction } from "../env";

/** Inactivité maximale d'une session authentifiée. */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
/** Durée de vie absolue d'une session. */
export const SESSION_ABSOLUTE_MS = 12 * 3600 * 1000;
/** Session en attente du second facteur. */
export const SESSION_PENDING_MS = 10 * 60 * 1000;

export function sessionCookieName(): string {
  return isProduction() ? "__Host-pe_admin" : "pe_admin";
}

export interface SessionWithUser {
  session: StaffSession;
  user: StaffUser;
}

async function setCookie(token: string, expires: Date) {
  (await cookies()).set(sessionCookieName(), token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    expires,
  });
}

export async function createSession(
  userId: string,
  opts: { fullyAuthenticated: boolean; ip: string | null; userAgent: string | null },
): Promise<void> {
  const token = randomToken(32);
  const now = Date.now();
  const expiresAt = new Date(now + (opts.fullyAuthenticated ? SESSION_ABSOLUTE_MS : SESSION_PENDING_MS));
  await prisma.staffSession.create({
    data: {
      tokenHash: sha256Hex(token),
      userId,
      mfaVerifiedAt: opts.fullyAuthenticated ? new Date(now) : null,
      expiresAt,
      ipHash: hashIp(opts.ip),
      userAgent: opts.userAgent,
    },
  });
  await setCookie(token, expiresAt);
}

/** Après validation du second facteur : nouvelle session (rotation du jeton), l'ancienne est révoquée. */
export async function upgradeSession(current: StaffSession, opts: { ip: string | null; userAgent: string | null }): Promise<void> {
  await prisma.staffSession.update({ where: { id: current.id }, data: { revokedAt: new Date() } });
  await createSession(current.userId, { fullyAuthenticated: true, ...opts });
}

export async function readSession(): Promise<SessionWithUser | null> {
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token || token.length > 100) return null;
  const s = await prisma.staffSession.findUnique({ where: { tokenHash: sha256Hex(token) }, include: { user: true } });
  if (!s) return null;
  const now = Date.now();
  if (s.revokedAt || s.expiresAt.getTime() <= now || !s.user.isActive) return null;
  if (s.mfaVerifiedAt && now - s.lastSeenAt.getTime() > SESSION_IDLE_MS) {
    await prisma.staffSession.update({ where: { id: s.id }, data: { revokedAt: new Date() } });
    return null;
  }
  if (now - s.lastSeenAt.getTime() > 60_000) {
    await prisma.staffSession.update({ where: { id: s.id }, data: { lastSeenAt: new Date(now) } });
  }
  const { user, ...session } = s;
  return { session, user };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(sessionCookieName())?.value;
  if (token) {
    await prisma.staffSession.updateMany({ where: { tokenHash: sha256Hex(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  store.delete(sessionCookieName());
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const res = await prisma.staffSession.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
  return res.count;
}
