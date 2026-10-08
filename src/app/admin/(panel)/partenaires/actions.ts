"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guards";
import { parisToday } from "@/lib/business-days";
import { prisma } from "@/lib/db";
import { type PartnerCriteria, parsePartnerCriteria } from "@/lib/leads/partners";
import { getPartner, partnerDisplayName, samePartnerName } from "@/lib/leads/partners-db";
import { transmitRequestedLeads } from "@/lib/leads/requested-partner";
import { rateLimit } from "@/lib/ratelimit";
import { requestContext } from "@/lib/request-context";
import { type PartnerFormValues, parsePartnerForm } from "./form";
import { partnerNameInUse } from "./queries";
import { partnerFileSlug } from "./slug";

export interface PartnerState {
  error?: string;
  ok?: string;
  /** Saisie renvoyée au formulaire, pour ne rien perdre après une erreur. */
  values?: PartnerFormValues;
}

const isUniqueViolation = (err: unknown) => Boolean(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002");
const DUPLICATE = "Une entreprise porte déjà ce nom : choisissez une autre dénomination ou modifiez la fiche existante.";
const NAME_LOCKED =
  "Des demandes nomment déjà cette entreprise ou lui ont été confiées : sa dénomination ne peut plus changer, car la personne a lu ce nom. Pour une autre entreprise, créez une nouvelle fiche. Les précisions et les critères restent modifiables.";

/**
 * Les entreprises actives sont citées dans les pages légales et la check-list de mise en ligne :
 * tout le site est revalidé, comme pour les paramètres.
 */
function refresh() {
  revalidatePath("/", "layout");
}

/** Champs modifiés, pour le journal (aucune donnée de demande). */
function changedFields(
  before: { name: string; details: string | null; active: boolean; criteria: PartnerCriteria },
  after: { name: string; details: string | null; active: boolean; criteria: PartnerCriteria },
): string[] {
  const fields: string[] = [];
  if (before.name !== after.name) fields.push("name");
  if (before.details !== after.details) fields.push("details");
  if (before.active !== after.active) fields.push("active");
  if (JSON.stringify(before.criteria) !== JSON.stringify(after.criteria)) fields.push("criteria");
  return fields;
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

/** Création (sans identifiant) ou modification d'une entreprise partenaire. */
export async function savePartnerAction(_prev: PartnerState, formData: FormData): Promise<PartnerState> {
  const ctx = await requireAdmin();
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? z.uuid().safeParse(rawId) : null;
  if (id && !id.success) return { error: "Entreprise introuvable." };

  const parsed = parsePartnerForm(formData);
  if (!parsed.ok) return { error: parsed.error, values: parsed.values };
  const { name, details, active, criteria } = parsed.data;

  const existing = id ? await getPartner(id.data) : null;
  if (id && !existing) return { error: "Entreprise introuvable : elle a peut-être été supprimée." };

  // Une demande ou un rendez-vous enregistre le nom lu par la personne : une fiche déjà utilisée ne
  // peut pas être reprise pour une autre entreprise (la casse et les espaces peuvent être corrigés).
  if (existing && !samePartnerName(existing.name, name) && (await partnerNameInUse(existing))) {
    return { error: NAME_LOCKED, values: { ...parsed.values, name: existing.name } };
  }

  // Ni la dénomination ni le nom affiché ne doivent pouvoir être confondus avec ceux d'une autre
  // entreprise (casse ignorée) : rendez-vous et pages légales reprennent ces noms.
  const displayName = partnerDisplayName({ name, details });
  const others = await prisma.partner.findMany({ where: id ? { id: { not: id.data } } : undefined, select: { name: true, details: true } });
  const clash = others.find((o) => [o.name, partnerDisplayName(o)].some((taken) => samePartnerName(taken, name) || samePartnerName(taken, displayName)));
  if (clash) {
    return {
      error: `Ce nom peut être confondu avec l'entreprise « ${partnerDisplayName(clash)} » : choisissez une autre dénomination ou d'autres précisions, ou modifiez la fiche existante.`,
      values: parsed.values,
    };
  }

  const data = { name, details, active, criteria: json(criteria) };
  let partnerId: string;
  try {
    partnerId = existing
      ? (await prisma.partner.update({ where: { id: existing.id }, data, select: { id: true } })).id
      : (await prisma.partner.create({ data, select: { id: true } })).id;
  } catch (err) {
    if (isUniqueViolation(err)) return { error: DUPLICATE, values: parsed.values };
    throw err;
  }

  // Journal : nom de l'entreprise, champs modifiés et critères (aucune donnée de demande).
  const after = { name, details, active, criteria };
  const fields = existing ? changedFields(existing, after) : ["name", "details", "active", "criteria"];
  const { ip } = await requestContext();
  await audit({
    actor: ctx.user,
    action: "SETTINGS_UPDATED",
    targetType: "Partner",
    targetId: partnerId,
    ip,
    metadata: json({
      section: "partners",
      op: existing ? "update" : "create",
      name: displayName,
      active,
      changed: fields,
      ...(existing && fields.includes("name") ? { nameBefore: existing.name } : {}),
      ...(existing && fields.includes("details") ? { detailsBefore: existing.details } : {}),
      ...(fields.includes("criteria") ? { criteriaBefore: existing ? existing.criteria : null, criteriaAfter: criteria } : {}),
    }),
  });
  refresh();
  if (!existing) redirect("/admin/partenaires");
  // Pas de valeurs renvoyées : le formulaire reprend la fiche enregistrée, rechargée par la revalidation.
  return { ok: "Modifications enregistrées." };
}

/** Active ou désactive une entreprise (une entreprise désactivée n'est plus nommée et ne reçoit plus de rendez-vous). */
export async function togglePartnerAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const row = await prisma.partner.findUniqueOrThrow({ where: { id }, select: { active: true, name: true, details: true } });
  await prisma.partner.update({ where: { id }, data: { active: !row.active } });
  const { ip } = await requestContext();
  await audit({
    actor: ctx.user,
    action: "SETTINGS_UPDATED",
    targetType: "Partner",
    targetId: id,
    ip,
    metadata: { section: "partners", op: row.active ? "deactivate" : "activate", name: partnerDisplayName(row), changed: ["active"], active: !row.active },
  });
  refresh();
}

/** Supprime la fiche de l'entreprise. Les demandes et les rendez-vous déjà confiés ne sont pas modifiés. */
export async function deletePartnerAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const row = await prisma.partner.findUnique({ where: { id }, select: { name: true, details: true, active: true, criteria: true } });
  const { count } = await prisma.partner.deleteMany({ where: { id } });
  if (row && count > 0) {
    const { ip } = await requestContext();
    await audit({
      actor: ctx.user,
      action: "SETTINGS_UPDATED",
      targetType: "Partner",
      targetId: id,
      ip,
      // Nom et critères conservés au journal : l'identifiant reste rattaché à une entreprise.
      metadata: json({ section: "partners", op: "delete", name: partnerDisplayName(row), active: row.active, criteriaBefore: parsePartnerCriteria(row.criteria) }),
    });
  }
  refresh();
  redirect("/admin/partenaires");
}

export interface TransmitResult {
  error?: string;
  /** Fichier des demandes effectivement transmises. */
  csv?: string;
  filename?: string;
  /** Demandes transmises par cette action. */
  count?: number;
  /** Demandes présentées mais plus transmissibles (déjà transmises, closes, opposition, délai dépassé). */
  skipped?: number;
}

const transmitInput = z.object({ partnerId: z.uuid(), ids: z.array(z.uuid()).min(1).max(10_000) });

/**
 * Transmission confirmée des nouvelles demandes qui nomment l'entreprise (« Je transmets ces N
 * demandes à… ») : réservée aux administrateurs. Seules les demandes présentées avant la
 * confirmation, et encore transmissibles, sont marquées comme transmises et exportées.
 */
export async function transmitRequestedAction(partnerId: string, ids: string[]): Promise<TransmitResult> {
  const ctx = await requireAdmin();
  const input = transmitInput.safeParse({ partnerId, ids });
  if (!input.success) return { error: "Demande invalide : rechargez la page puis recommencez." };
  const partner = await getPartner(input.data.partnerId);
  if (!partner) return { error: "Entreprise introuvable : elle a peut-être été supprimée." };
  if (!partner.active) return { error: "Entreprise désactivée : réactivez-la avant de lui transmettre des demandes." };

  const rl = await rateLimit("partner-export", ctx.user.id, 20, 3600);
  if (!rl.allowed) return { error: "Trop d'exports. Réessayez plus tard." };

  const requested = new Set(input.data.ids).size;
  const result = await transmitRequestedLeads({ partner, ids: input.data.ids, actorId: ctx.user.id });
  const { ip } = await requestContext();
  // Métadonnées techniques uniquement : nombres de lignes, jamais de coordonnées.
  await audit({
    actor: ctx.user,
    action: "EXPORT_CSV",
    targetType: "Partner",
    targetId: partner.id,
    ip,
    metadata: { type: "demandes", op: "transmit", partner: partnerDisplayName(partner), requested, transmitted: result.count },
  });
  revalidatePath("/admin", "layout");
  if (result.count === 0) {
    return {
      error: "Aucune de ces demandes n'est plus à transmettre (déjà transmise, close, à vérifier, en opposition ou délai de rappel dépassé).",
      skipped: requested,
    };
  }
  return {
    csv: result.csv,
    filename: `demandes-${partnerFileSlug(partner.name)}-${parisToday()}.csv`,
    count: result.count,
    skipped: requested - result.count,
  };
}
