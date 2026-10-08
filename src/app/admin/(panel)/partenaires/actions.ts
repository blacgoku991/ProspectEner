"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { requestContext } from "@/lib/request-context";
import { type PartnerFormValues, parsePartnerForm } from "./form";

export interface PartnerState {
  error?: string;
  ok?: string;
  /** Saisie renvoyée au formulaire, pour ne rien perdre après une erreur. */
  values?: PartnerFormValues;
}

const isUniqueViolation = (err: unknown) => Boolean(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002");
const DUPLICATE = "Une entreprise porte déjà ce nom : choisissez une autre dénomination ou modifiez la fiche existante.";

/**
 * Les entreprises actives sont citées dans les pages légales et la check-list de mise en ligne :
 * tout le site est revalidé, comme pour les paramètres.
 */
function refresh() {
  revalidatePath("/", "layout");
}

/** Création (sans identifiant) ou modification d'une entreprise partenaire. */
export async function savePartnerAction(_prev: PartnerState, formData: FormData): Promise<PartnerState> {
  const ctx = await requireAdmin();
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? z.uuid().safeParse(rawId) : null;
  if (id && !id.success) return { error: "Entreprise introuvable." };

  const parsed = parsePartnerForm(formData);
  if (!parsed.ok) return { error: parsed.error, values: parsed.values };
  const { name, details, active, criteria } = parsed.data;

  const duplicate = await prisma.partner.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(id ? { id: { not: id.data } } : {}) },
    select: { id: true },
  });
  if (duplicate) return { error: DUPLICATE, values: parsed.values };

  const data = { name, details, active, criteria: criteria as unknown as Prisma.InputJsonValue };
  let partnerId: string;
  try {
    if (id) {
      const found = await prisma.partner.findUnique({ where: { id: id.data }, select: { id: true } });
      if (!found) return { error: "Entreprise introuvable : elle a peut-être été supprimée." };
      partnerId = (await prisma.partner.update({ where: { id: id.data }, data, select: { id: true } })).id;
    } else {
      partnerId = (await prisma.partner.create({ data, select: { id: true } })).id;
    }
  } catch (err) {
    if (isUniqueViolation(err)) return { error: DUPLICATE, values: parsed.values };
    throw err;
  }

  // Métadonnées techniques uniquement : aucune donnée de demande.
  const { ip } = await requestContext();
  await audit({
    actor: ctx.user,
    action: "SETTINGS_UPDATED",
    targetType: "Partner",
    targetId: partnerId,
    ip,
    metadata: { section: "partners", op: id ? "update" : "create", active },
  });
  refresh();
  if (!id) redirect("/admin/partenaires");
  // Pas de valeurs renvoyées : le formulaire reprend la fiche enregistrée, rechargée par la revalidation.
  return { ok: "Modifications enregistrées." };
}

/** Active ou désactive une entreprise (une entreprise désactivée ne reçoit plus de rendez-vous). */
export async function togglePartnerAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const row = await prisma.partner.findUniqueOrThrow({ where: { id }, select: { active: true } });
  await prisma.partner.update({ where: { id }, data: { active: !row.active } });
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "SETTINGS_UPDATED", targetType: "Partner", targetId: id, ip, metadata: { section: "partners", op: row.active ? "deactivate" : "activate" } });
  refresh();
}

/** Supprime la fiche de l'entreprise. Les demandes et les rendez-vous déjà confiés ne sont pas modifiés. */
export async function deletePartnerAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const { count } = await prisma.partner.deleteMany({ where: { id } });
  if (count > 0) {
    const { ip } = await requestContext();
    await audit({ actor: ctx.user, action: "SETTINGS_UPDATED", targetType: "Partner", targetId: id, ip, metadata: { section: "partners", op: "delete" } });
  }
  refresh();
  redirect("/admin/partenaires");
}
