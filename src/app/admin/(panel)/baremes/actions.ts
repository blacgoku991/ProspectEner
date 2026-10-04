"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ENGINE_VERSION, type RuleSetData, validateRuleSetData } from "@/engine";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { requestContext } from "@/lib/request-context";
import { checksumOf, getPublishedRuleSet } from "@/lib/rulesets";

export interface DraftState {
  error?: string;
  errors?: string[];
  ok?: string;
}

const versionSchema = z
  .string()
  .trim()
  .regex(/^\d{4}\.\d{2}-\d{1,3}$/, "Format attendu : AAAA.MM-n (ex. 2027.01-1)");

export async function createDraftAction(_prev: DraftState, formData: FormData): Promise<DraftState> {
  const ctx = await requireAdmin();
  const parsed = versionSchema.safeParse(formData.get("version"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (await prisma.ruleSet.findUnique({ where: { version: parsed.data } })) return { error: "Cette version existe déjà." };
  const published = await getPublishedRuleSet();
  const data = structuredClone(published.data);
  data.meta.changelog = "";
  const created = await prisma.ruleSet.create({
    data: {
      version: parsed.data,
      status: "DRAFT",
      data: data as unknown as Prisma.InputJsonValue,
      checksum: checksumOf(data),
      engineVersion: ENGINE_VERSION,
      basedOnId: published.id,
      createdById: ctx.user.id,
      notes: `Brouillon créé à partir de la version ${published.version}`,
    },
  });
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "RULESET_DRAFT_SAVED", targetType: "RuleSet", targetId: created.id, ip, metadata: { version: created.version, op: "create" } });
  redirect(`/admin/baremes/${created.id}`);
}

async function loadDraft(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await prisma.ruleSet.findUnique({ where: { id } });
  return row && row.status === "DRAFT" ? row : null;
}

async function saveDraftData(id: string, data: RuleSetData, actor: { id: string; email: string }, op: string): Promise<DraftState> {
  const v = validateRuleSetData(data);
  if (!v.ok) return { error: "Le barème contient des erreurs : il n'a pas été enregistré.", errors: v.errors.slice(0, 20) };
  await prisma.ruleSet.update({ where: { id }, data: { data: v.data as unknown as Prisma.InputJsonValue, checksum: checksumOf(v.data), engineVersion: ENGINE_VERSION } });
  const { ip } = await requestContext();
  await audit({ actor, action: "RULESET_DRAFT_SAVED", targetType: "RuleSet", targetId: id, ip, metadata: { op } });
  revalidatePath(`/admin/baremes/${id}`);
  return { ok: "Brouillon enregistré et validé." };
}

/** Édition avancée : JSON complet du barème. */
export async function saveDraftJsonAction(_prev: DraftState, formData: FormData): Promise<DraftState> {
  const ctx = await requireAdmin();
  const draft = await loadDraft(String(formData.get("id")));
  if (!draft) return { error: "Seul un brouillon peut être modifié." };
  const raw = String(formData.get("json") ?? "");
  if (raw.length > 400_000) return { error: "Contenu trop volumineux." };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { error: "JSON invalide." };
  }
  return saveDraftData(draft.id, data as RuleSetData, ctx.user, "json");
}

/** Édition structurée des plafonds de ressources. */
export async function saveCeilingsAction(_prev: DraftState, formData: FormData): Promise<DraftState> {
  const ctx = await requireAdmin();
  const draft = await loadDraft(String(formData.get("id")));
  if (!draft) return { error: "Seul un brouillon peut être modifié." };
  const data = structuredClone(draft.data) as unknown as RuleSetData;
  const num = (k: string) => Number(String(formData.get(k) ?? "").replace(/\s/g, ""));
  for (const zone of ["IDF", "HORS_IDF"] as const) {
    for (let i = 0; i < 5; i++) {
      data.incomeCeilings[zone].bySize[i] = [num(`${zone}-${i}-0`), num(`${zone}-${i}-1`), num(`${zone}-${i}-2`)];
    }
    data.incomeCeilings[zone].extraPerson = [num(`${zone}-x-0`), num(`${zone}-x-1`), num(`${zone}-x-2`)];
  }
  data.incomeCeilings.year = num("year");
  data.incomeCeilings.validFrom = String(formData.get("validFrom") ?? "");
  data.incomeCeilings.validUntil = String(formData.get("validUntil") ?? "") || null;
  data.incomeCeilings.verification.verifiedAt = String(formData.get("verifiedAt") ?? "");
  return saveDraftData(draft.id, data, ctx.user, "ceilings");
}

/** Édition structurée de l'état de chaque dispositif (ouverture, vérification, validité). */
export async function saveDispositifsAction(_prev: DraftState, formData: FormData): Promise<DraftState> {
  const ctx = await requireAdmin();
  const draft = await loadDraft(String(formData.get("id")));
  if (!draft) return { error: "Seul un brouillon peut être modifié." };
  const data = structuredClone(draft.data) as unknown as RuleSetData;
  for (const key of ["MPR_GESTE", "MPR_AMPLEUR", "CEE", "ECO_PTZ"] as const) {
    const d = data.dispositifs[key];
    d.enabled = formData.get(`${key}-enabled`) === "on";
    d.availability = z.enum(["OPEN", "SUSPENDED", "UNKNOWN"]).catch("UNKNOWN").parse(formData.get(`${key}-availability`));
    const note = String(formData.get(`${key}-availabilityNote`) ?? "").trim();
    d.availabilityNote = note || undefined;
    d.verification.status = z.enum(["VERIFIED", "PARTIAL", "UNVERIFIED"]).catch("UNVERIFIED").parse(formData.get(`${key}-verification`));
    d.verification.verifiedAt = String(formData.get(`${key}-verifiedAt`) ?? "");
    const vnotes = String(formData.get(`${key}-verificationNotes`) ?? "").trim();
    d.verification.notes = vnotes || undefined;
    d.validFrom = String(formData.get(`${key}-validFrom`) ?? "");
    d.validUntil = String(formData.get(`${key}-validUntil`) ?? "") || null;
  }
  data.meta.label = String(formData.get("label") ?? "").trim();
  data.meta.changelog = String(formData.get("changelog") ?? "").trim();
  return saveDraftData(draft.id, data, ctx.user, "dispositifs");
}

export async function publishDraftAction(_prev: DraftState, formData: FormData): Promise<DraftState> {
  const ctx = await requireAdmin();
  const draft = await loadDraft(String(formData.get("id")));
  if (!draft) return { error: "Seul un brouillon peut être publié." };
  if (formData.get("sourcesChecked") !== "on") {
    return { error: "Confirmez avoir vérifié chaque règle sur les sources officielles citées avant de publier." };
  }
  const note = String(formData.get("publicationNote") ?? "").trim();
  if (note.length < 10) return { error: "Indiquez une note de publication (sources consultées, date, changements)." };
  const v = validateRuleSetData(draft.data);
  if (!v.ok) return { error: "Le brouillon contient des erreurs.", errors: v.errors.slice(0, 20) };
  if (!v.data.meta.changelog) return { error: "Renseignez le résumé des changements (onglet Dispositifs)." };
  const { ip } = await requestContext();
  await prisma.$transaction(async (tx) => {
    await tx.ruleSet.updateMany({ where: { status: "PUBLISHED" }, data: { status: "ARCHIVED", archivedAt: new Date() } });
    await tx.ruleSet.update({
      where: { id: draft.id },
      data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: ctx.user.id, publicationNote: note, checksum: checksumOf(v.data), engineVersion: ENGINE_VERSION },
    });
    await audit({ actor: ctx.user, action: "RULESET_PUBLISHED", targetType: "RuleSet", targetId: draft.id, ip, metadata: { version: draft.version } }, tx);
  });
  revalidatePath("/admin/baremes");
  redirect(`/admin/baremes/${draft.id}`);
}

export async function deleteDraftAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const draft = await loadDraft(String(formData.get("id")));
  if (!draft) return;
  await prisma.ruleSet.delete({ where: { id: draft.id } });
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "RULESET_DRAFT_SAVED", targetType: "RuleSet", targetId: draft.id, ip, metadata: { op: "delete", version: draft.version } });
  redirect("/admin/baremes");
}
