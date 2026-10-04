import { beforeEach, describe, expect, it } from "vitest";
import { buildRequestWhere } from "@/lib/admin/requests";
import { requestScope } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateTotpSecret, totpCode, currentStep, verifyTotp } from "@/lib/auth/totp";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { createContactRequest } from "@/lib/requests/create";
import { applyRetention } from "@/lib/retention";
import { getSettings } from "@/lib/settings";
import { configure, freshIp, resetDatabase, simulationPayload, TEST_SETTINGS } from "./helpers";

const months = (n: number) => new Date(Date.now() - n * 30.5 * 24 * 3600 * 1000);

async function newRequest() {
  const res = await createContactRequest(await simulationPayload(), { ip: freshIp(), userAgent: "vitest" });
  if (!res.ok) throw new Error(`création impossible : ${res.code}`);
  return res;
}

describe("politique de conservation", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure();
  });

  it("anonymise les demandes échues, annulées, et purge les preuves en fin de durée", async () => {
    const recent = await newRequest();
    const old = await newRequest();
    const oldButActive = await newRequest();
    const cancelled = await newRequest();
    const veryOld = await newRequest();
    await prisma.contactRequest.update({ where: { id: old.requestId }, data: { submittedAt: months(37) } });
    await prisma.contactRequest.update({ where: { id: oldButActive.requestId }, data: { submittedAt: months(37), lastProspectContactAt: months(2) } });
    await prisma.contactRequest.update({ where: { id: cancelled.requestId }, data: { status: "CONTACT_ANNULE", cancelledAt: months(2) } });
    await prisma.contactRequest.update({ where: { id: veryOld.requestId }, data: { submittedAt: months(40), anonymizedAt: months(3) } });
    await prisma.auditLog.create({ data: { action: "AUTH_LOGIN_SUCCESS", createdAt: months(13) } });
    await prisma.auditLog.create({ data: { action: "AUTH_LOGIN_SUCCESS" } });

    const report = await applyRetention(await getSettings());
    expect(report.expiredAnonymized).toBe(1);
    expect(report.cancelledAnonymized).toBe(1);
    expect(report.proofsPurged).toBeGreaterThanOrEqual(1);
    expect(report.auditLogsDeleted).toBe(1);

    const get = (id: string) => prisma.contactRequest.findUniqueOrThrow({ where: { id } });
    expect((await get(recent.requestId)).anonymizedAt).toBeNull();
    expect((await get(old.requestId)).lastName).toBeNull();
    expect((await get(oldButActive.requestId)).lastName).toBe("Durand");
    expect((await get(cancelled.requestId)).phone).toBeNull();
    const purged = await get(veryOld.requestId);
    expect(purged.phoneHash).toBeNull();
    expect(purged.proofPurgedAt).not.toBeNull();
    expect(await prisma.auditLog.count()).toBe(1);
  });
});

describe("contrôle d'accès aux demandes", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure();
  });

  it("un collaborateur ne voit que ses demandes (et les non assignées si autorisé)", async () => {
    const [a, b, c] = await Promise.all([newRequest(), newRequest(), newRequest()]);
    const alice = await prisma.staffUser.create({ data: { email: "alice@test.invalid", displayName: "Alice", role: "COLLABORATOR" } });
    const bob = await prisma.staffUser.create({ data: { email: "bob@test.invalid", displayName: "Bob", role: "COLLABORATOR" } });
    await prisma.contactRequest.update({ where: { id: a.requestId }, data: { assignedToId: alice.id } });
    await prisma.contactRequest.update({ where: { id: b.requestId }, data: { assignedToId: bob.id } });

    const visible = async (user: { id: string; role: "ADMIN" | "COLLABORATOR" }, see: boolean) => {
      const settings = { ...TEST_SETTINGS, security: { ...TEST_SETTINGS.security, collaboratorsSeeUnassigned: see } };
      const rows = await prisma.contactRequest.findMany({ where: requestScope(user, settings), select: { id: true } });
      return rows.map((r) => r.id).sort();
    };
    expect(await visible(alice, true)).toEqual([a.requestId, c.requestId].sort());
    expect(await visible(alice, false)).toEqual([a.requestId]);
    expect(await visible({ id: "00000000-0000-0000-0000-000000000000", role: "ADMIN" }, false)).toHaveLength(3);
    // Accès direct à la fiche de Bob par Alice : introuvable dans son périmètre.
    const found = await prisma.contactRequest.findFirst({ where: { id: b.requestId, ...requestScope(alice, TEST_SETTINGS) } });
    expect(found).toBeNull();
  });

  it("filtre les rappels dont le délai est dépassé", async () => {
    const r = await newRequest();
    await prisma.contactRequest.update({ where: { id: r.requestId }, data: { callbackDeadline: new Date(Date.now() - 3600_000) } });
    const admin = { id: "00000000-0000-0000-0000-000000000000", role: "ADMIN" as const };
    const overdue = await prisma.contactRequest.count({ where: buildRequestWhere({ deadline: "overdue" }, admin, TEST_SETTINGS) });
    expect(overdue).toBe(1);
  });
});

describe("primitives de sécurité", () => {
  it("hachage des mots de passe (scrypt) et vérification", async () => {
    const h = await hashPassword("Correct-Horse-Battery-42");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Correct-Horse-Battery-42", h)).toBe(true);
    expect(await verifyPassword("mauvais", h)).toBe(false);
    expect(await verifyPassword("x", null)).toBe(false);
  });

  it("TOTP : code valide une seule fois (anti-rejeu)", () => {
    const secret = generateTotpSecret();
    const code = totpCode(secret, currentStep());
    const step = verifyTotp(secret, code);
    expect(step).not.toBeNull();
    expect(verifyTotp(secret, code, { lastUsedStep: step })).toBeNull();
    expect(verifyTotp(secret, "000000x")).toBeNull();
  });

  it("vecteurs de test RFC 6238 (SHA-1)", () => {
    // Secret ASCII « 12345678901234567890 » en base32.
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(totpCode(secret, Math.floor(59 / 30))).toBe("287082");
    expect(totpCode(secret, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpCode(secret, Math.floor(1234567890 / 30))).toBe("005924");
  });

  it("chiffrement AES-256-GCM authentifié", () => {
    const c = encrypt("secret");
    expect(decrypt(c)).toBe("secret");
    const tampered = c.slice(0, -2) + (c.endsWith("A") ? "BB" : "AA");
    expect(() => decrypt(tampered)).toThrow();
  });
});
