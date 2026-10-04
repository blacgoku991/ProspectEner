"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guards";
import { revokeAllSessions } from "@/lib/auth/session";
import { hashToken, randomToken } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { requestContext } from "@/lib/request-context";

export interface TeamState {
  error?: string;
  ok?: string;
  link?: string;
}

function setupData() {
  const token = randomToken(32);
  return {
    token,
    data: { setupTokenHash: hashToken(token), setupTokenExpiresAt: new Date(Date.now() + 72 * 3600 * 1000) },
  };
}

const linkFor = (token: string) => `${env().APP_URL.replace(/\/$/, "")}/admin/activation#token=${token}`;

async function activeAdminCount(excludeId?: string) {
  return prisma.staffUser.count({ where: { role: "ADMIN", isActive: true, ...(excludeId ? { id: { not: excludeId } } : {}) } });
}

export async function createUserAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const ctx = await requireAdmin();
  const parsed = z
    .object({
      email: z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide.")),
      displayName: z.string().trim().min(2, "Nom requis.").max(80),
      role: z.enum(["ADMIN", "COLLABORATOR"]),
      canExport: z.boolean(),
    })
    .safeParse({
      email: formData.get("email"),
      displayName: formData.get("displayName"),
      role: formData.get("role"),
      canExport: formData.get("canExport") === "on",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (await prisma.staffUser.findUnique({ where: { email: parsed.data.email } })) return { error: "Un compte existe déjà avec cette adresse." };
  const { token, data } = setupData();
  const user = await prisma.staffUser.create({ data: { ...parsed.data, ...data } });
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "USER_CREATED", targetType: "StaffUser", targetId: user.id, ip, metadata: { role: user.role, canExport: user.canExport } });
  revalidatePath("/admin/equipe");
  return { ok: `Compte créé pour ${user.email}. Transmettez ce lien personnel (valable 72 h, à usage unique) par un canal sûr :`, link: linkFor(token) };
}

export async function resetAccessAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const ctx = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  if (id === ctx.user.id) return { error: "Utilisez « Mon compte » pour modifier vos propres accès." };
  const { token, data } = setupData();
  await prisma.staffUser.update({
    where: { id },
    data: { ...data, passwordHash: null, mfaSecretEnc: null, mfaEnabledAt: null, mfaLastUsedStep: null, recoveryCodeHashes: [], failedLoginCount: 0, lockedUntil: null },
  });
  await revokeAllSessions(id);
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "USER_SETUP_LINK", targetType: "StaffUser", targetId: id, ip, metadata: { op: "reset" } });
  await audit({ actor: ctx.user, action: "AUTH_MFA_RESET", targetType: "StaffUser", targetId: id, ip });
  revalidatePath("/admin/equipe");
  return { ok: "Accès réinitialisés (mot de passe et double authentification). Nouveau lien d'activation :", link: linkFor(token) };
}

export async function updateUserAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const ctx = await requireAdmin();
  const parsed = z
    .object({ id: z.uuid(), role: z.enum(["ADMIN", "COLLABORATOR"]), canExport: z.boolean(), isActive: z.boolean() })
    .safeParse({ id: formData.get("id"), role: formData.get("role"), canExport: formData.get("canExport") === "on", isActive: formData.get("isActive") === "on" });
  if (!parsed.success) return { error: "Données invalides." };
  const { id, role, canExport, isActive } = parsed.data;
  if (id === ctx.user.id && (role !== "ADMIN" || !isActive)) return { error: "Vous ne pouvez pas retirer vos propres droits d'administration." };
  const target = await prisma.staffUser.findUniqueOrThrow({ where: { id } });
  if (target.role === "ADMIN" && (role !== "ADMIN" || !isActive) && (await activeAdminCount(id)) === 0) {
    return { error: "Au moins un administrateur actif est nécessaire." };
  }
  await prisma.staffUser.update({ where: { id }, data: { role, canExport, isActive } });
  if (!isActive || role !== target.role) await revokeAllSessions(id);
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "USER_UPDATED", targetType: "StaffUser", targetId: id, ip, metadata: { role, canExport, isActive } });
  revalidatePath("/admin/equipe");
  return { ok: "Compte mis à jour." };
}
