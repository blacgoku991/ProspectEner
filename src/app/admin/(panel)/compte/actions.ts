"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { newPasswordError } from "@/lib/auth/password-check";
import { revokeAllSessions } from "@/lib/auth/session";
import { generateRecoveryCodes, hashRecoveryCode, verifyTotp } from "@/lib/auth/totp";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { requestContext } from "@/lib/request-context";

export interface AccountState {
  error?: string;
  ok?: string;
  codes?: string[];
}

export async function changePasswordAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const ctx = await requireStaff();
  const rl = await rateLimit("password-change", ctx.user.id, 5, 900);
  if (!rl.allowed) return { error: "Trop de tentatives. Réessayez plus tard." };
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const user = await prisma.staffUser.findUniqueOrThrow({ where: { id: ctx.user.id } });
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Mot de passe actuel incorrect." };
  if (next !== confirm) return { error: "Les deux nouveaux mots de passe ne correspondent pas." };
  if (next === current) return { error: "Le nouveau mot de passe doit être différent de l'actuel." };
  const problem = await newPasswordError(next, user.email);
  if (problem) return { error: problem };
  await prisma.staffUser.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() } });
  const revoked = await revokeAllSessions(user.id, ctx.session.id);
  const { ip } = await requestContext();
  await audit({ actor: user, action: "AUTH_PASSWORD_CHANGED", targetType: "StaffUser", targetId: user.id, ip, metadata: { otherSessionsRevoked: revoked } });
  return { ok: "Mot de passe modifié. Vos autres sessions ont été fermées." };
}

export async function regenerateCodesAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const ctx = await requireStaff();
  const user = await prisma.staffUser.findUniqueOrThrow({ where: { id: ctx.user.id } });
  if (!user.mfaSecretEnc || !user.mfaEnabledAt) return { error: "La double authentification n'est pas active." };
  const rl = await rateLimit("mfa", user.id, 8, 600);
  if (!rl.allowed) return { error: "Trop de tentatives." };
  const step = verifyTotp(decrypt(user.mfaSecretEnc), String(formData.get("code") ?? ""), { lastUsedStep: user.mfaLastUsedStep });
  if (step === null) return { error: "Code invalide." };
  const codes = generateRecoveryCodes();
  await prisma.staffUser.update({ where: { id: user.id }, data: { recoveryCodeHashes: codes.map(hashRecoveryCode), mfaLastUsedStep: BigInt(step) } });
  const { ip } = await requestContext();
  await audit({ actor: user, action: "AUTH_MFA_ENROLLED", targetType: "StaffUser", targetId: user.id, ip, metadata: { op: "recovery_codes_regenerated" } });
  return { ok: "Nouveaux codes générés (les anciens ne fonctionnent plus) :", codes };
}

export async function revokeSessionAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = z.uuid().parse(formData.get("id"));
  if (id === ctx.session.id) return;
  await prisma.staffSession.updateMany({ where: { id, userId: ctx.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "AUTH_SESSION_REVOKED", targetType: "StaffSession", targetId: id, ip });
  revalidatePath("/admin/compte");
}
