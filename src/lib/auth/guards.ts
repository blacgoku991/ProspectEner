import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { Prisma, StaffUser } from "@/generated/prisma/client";
import { audit } from "../audit";
import { prisma } from "../db";
import { requestContext } from "../request-context";
import { getSettings } from "../settings";
import type { SiteSettings } from "../settings-schema";
import { readSession, type SessionWithUser } from "./session";

export const getCurrentSession = cache(async (): Promise<SessionWithUser | null> => readSession());

export function mfaRequiredFor(user: Pick<StaffUser, "role">, settings: SiteSettings): boolean {
  return user.role === "ADMIN" || settings.security.requireMfaForCollaborators;
}

export interface StaffContext extends SessionWithUser {
  settings: SiteSettings;
}

/**
 * Exige une session entièrement authentifiée (mot de passe + second facteur si requis).
 * À appeler dans CHAQUE page, action serveur et route de l'administration.
 */
export async function requireStaff(): Promise<StaffContext> {
  const s = await getCurrentSession();
  if (!s) redirect("/admin/connexion");
  const settings = await getSettings();
  if (!s.session.mfaVerifiedAt) {
    if (s.user.mfaEnabledAt) redirect("/admin/mfa");
    redirect("/admin/mfa/configuration");
  }
  if (mfaRequiredFor(s.user, settings) && !s.user.mfaEnabledAt) redirect("/admin/mfa/configuration");
  return { ...s, settings };
}

export async function requireAdmin(): Promise<StaffContext> {
  const ctx = await requireStaff();
  if (ctx.user.role !== "ADMIN") {
    const { ip } = await requestContext();
    await audit({ actor: ctx.user, action: "ACCESS_DENIED", targetType: "ADMIN_AREA", ip });
    notFound();
  }
  return ctx;
}

/** Session en attente du second facteur (pages de vérification / d'enrôlement). */
export async function requirePendingSession(): Promise<SessionWithUser> {
  const s = await getCurrentSession();
  if (!s) redirect("/admin/connexion");
  return s;
}

export function canExport(user: Pick<StaffUser, "role" | "canExport">): boolean {
  return user.role === "ADMIN" || user.canExport;
}

/** Périmètre des demandes visibles : tout pour un administrateur ; demandes assignées (et non assignées si autorisé) pour un collaborateur. */
export function requestScope(user: Pick<StaffUser, "id" | "role">, settings: SiteSettings): Prisma.ContactRequestWhereInput {
  if (user.role === "ADMIN") return {};
  return {
    OR: [{ assignedToId: user.id }, ...(settings.security.collaboratorsSeeUnassigned ? [{ assignedToId: null }] : [])],
  };
}

/** Charge une demande si l'utilisateur y a accès ; sinon 404 et trace dans le journal. */
export async function getAccessibleRequestId(ctx: StaffContext, id: string): Promise<string> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const found = await prisma.contactRequest.findFirst({ where: { id, ...requestScope(ctx.user, ctx.settings) }, select: { id: true } });
  if (!found) {
    const { ip } = await requestContext();
    await audit({ actor: ctx.user, action: "ACCESS_DENIED", targetType: "ContactRequest", targetId: id, ip });
    notFound();
  }
  return found.id;
}
