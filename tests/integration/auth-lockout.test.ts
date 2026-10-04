import { beforeEach, describe, expect, it } from "vitest";
import { clearFailures, isLocked, MAX_FAILURES, registerFailure } from "@/lib/auth/lockout";
import { prisma } from "@/lib/db";
import { configure, resetDatabase } from "./helpers";

async function staffWithSessions() {
  const user = await prisma.staffUser.create({ data: { email: "verrou@test.invalid", displayName: "Verrou", role: "ADMIN" } });
  const expiresAt = new Date(Date.now() + 3600_000);
  await prisma.staffSession.createMany({
    data: [
      { tokenHash: "a".repeat(64), userId: user.id, mfaVerifiedAt: new Date(), expiresAt },
      { tokenHash: "b".repeat(64), userId: user.id, mfaVerifiedAt: null, expiresAt },
    ],
  });
  return user;
}

const reload = (id: string) => prisma.staffUser.findUniqueOrThrow({ where: { id } });
const openSessions = (userId: string) => prisma.staffSession.count({ where: { userId, revokedAt: null } });

describe("verrouillage des comptes après des échecs répétés", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure();
  });

  it("verrouille au seuil, sans fermer les sessions pour des échecs de mot de passe", async () => {
    const user = await staffWithSessions();
    for (let i = 1; i < MAX_FAILURES; i++) {
      expect(await registerFailure(await reload(user.id), "203.0.113.9", "password")).toBe(false);
    }
    expect((await reload(user.id)).failedLoginCount).toBe(MAX_FAILURES - 1);
    expect(await registerFailure(await reload(user.id), "203.0.113.9", "password")).toBe(true);
    const locked = await reload(user.id);
    expect(isLocked(locked)).toBe(true);
    expect(locked.failedLoginCount).toBe(0);
    // Un tiers qui ne connaît pas le mot de passe ne doit pas pouvoir déconnecter l'administrateur.
    expect(await openSessions(user.id)).toBe(2);
    expect(await prisma.auditLog.count({ where: { action: "AUTH_LOCKED", targetId: user.id } })).toBe(1);
  });

  it("ferme toutes les sessions quand les échecs portent sur le second facteur", async () => {
    const user = await staffWithSessions();
    for (let i = 0; i < MAX_FAILURES; i++) await registerFailure(await reload(user.id), null, "mfa");
    expect(isLocked(await reload(user.id))).toBe(true);
    expect(await openSessions(user.id)).toBe(0);
  });

  it("les échecs de mot de passe et de code se cumulent jusqu'à une authentification complète", async () => {
    const user = await staffWithSessions();
    for (let i = 0; i < 6; i++) await registerFailure(await reload(user.id), null, "password");
    for (let i = 0; i < 3; i++) await registerFailure(await reload(user.id), null, "mfa");
    expect((await reload(user.id)).failedLoginCount).toBe(9);
    await clearFailures(user.id, { lastLoginAt: new Date() });
    const cleared = await reload(user.id);
    expect(cleared.failedLoginCount).toBe(0);
    expect(isLocked(cleared)).toBe(false);
    expect(cleared.lastLoginAt).not.toBeNull();
  });
});
