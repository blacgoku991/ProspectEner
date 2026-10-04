import "server-only";
import type { StaffUser } from "@/generated/prisma/client";
import { audit } from "../audit";
import { prisma } from "../db";
import { revokeAllSessions } from "./session";

/** Échecs consécutifs (mot de passe ou second facteur) avant verrouillage temporaire du compte. */
export const MAX_FAILURES = 10;
export const LOCK_MINUTES = 15;

export const isLocked = (user: Pick<StaffUser, "lockedUntil">, now = Date.now()) => Boolean(user.lockedUntil && user.lockedUntil.getTime() > now);

/**
 * Échec d'authentification (mot de passe ou second facteur). Le compteur n'est remis à zéro qu'après
 * une authentification complète : se reconnecter avec le bon mot de passe ne permet pas d'enchaîner
 * les essais de codes. Au seuil, le compte est verrouillé ; si c'est le second facteur qui échoue
 * (mot de passe connu de l'auteur des essais), toutes les sessions du compte sont aussi fermées.
 * Renvoie vrai si le compte vient d'être verrouillé.
 */
export async function registerFailure(user: StaffUser, ip: string | null, factor: "password" | "mfa"): Promise<boolean> {
  const failures = user.failedLoginCount + 1;
  const lock = failures >= MAX_FAILURES;
  await prisma.staffUser.update({
    where: { id: user.id },
    data: { failedLoginCount: lock ? 0 : failures, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil },
  });
  if (lock) {
    if (factor === "mfa") await revokeAllSessions(user.id);
    await audit({ actor: user, action: "AUTH_LOCKED", targetType: "StaffUser", targetId: user.id, ip, metadata: { factor } });
  }
  return lock;
}

/** Authentification complète : remise à zéro du compteur d'échecs. */
export async function clearFailures(userId: string, extra: { lastLoginAt?: Date } = {}): Promise<void> {
  await prisma.staffUser.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null, ...extra } });
}
