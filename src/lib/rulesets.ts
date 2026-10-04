import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { DEFAULT_RULESET, EMBEDDED_RULESETS, ENGINE_VERSION, type RuleSet, validateRuleSetData } from "@/engine";
import { audit } from "./audit";
import { prisma } from "./db";
import { sha256Hex } from "./crypto";
import { getSettings } from "./settings";

export function checksumOf(data: unknown): string {
  return sha256Hex(JSON.stringify(data));
}

function toRuleSet(row: { version: string; data: unknown }): RuleSet {
  const v = validateRuleSetData(row.data);
  if (!v.ok) throw new Error(`Jeu de règles ${row.version} invalide : ${v.errors.slice(0, 3).join(" ; ")}`);
  return { version: row.version, data: v.data };
}

/**
 * Jeu de règles publié. Si la base n'en contient aucun (première installation),
 * le jeu embarqué est publié automatiquement — il reste soumis à la check-list de mise en ligne.
 */
export async function getPublishedRuleSet(): Promise<RuleSet & { id: string }> {
  const row = await prisma.ruleSet.findFirst({ where: { status: "PUBLISHED" } });
  if (row) return { id: row.id, ...toRuleSet(row) };
  const created = await ensureDefaultRuleSet();
  return { id: created.id, ...toRuleSet(created) };
}

/** Jeu de règles par version (publié ou archivé — jamais un brouillon). */
export async function getRuleSetByVersion(version: string): Promise<(RuleSet & { id: string }) | null> {
  const row = await prisma.ruleSet.findUnique({ where: { version } });
  if (!row || row.status === "DRAFT") return null;
  return { id: row.id, ...toRuleSet(row) };
}

export async function ensureDefaultRuleSet() {
  const existing = await prisma.ruleSet.findUnique({ where: { version: DEFAULT_RULESET.version } });
  if (existing) {
    if (existing.status !== "PUBLISHED") {
      const published = await prisma.ruleSet.findFirst({ where: { status: "PUBLISHED" } });
      if (published) return published;
    }
    return existing;
  }
  try {
    return await prisma.ruleSet.create({
      data: {
        version: DEFAULT_RULESET.version,
        status: "PUBLISHED",
        data: DEFAULT_RULESET.data as unknown as Prisma.InputJsonValue,
        checksum: checksumOf(DEFAULT_RULESET.data),
        engineVersion: ENGINE_VERSION,
        notes: "Jeu de règles initial embarqué (vérification documentaire du 4 octobre 2026).",
        publishedAt: new Date(),
        publicationNote:
          "Publication initiale automatique. Règles établies par recherche documentaire indirecte : relecture directe des sources officielles requise avant mise en production.",
      },
    });
  } catch {
    // Création concurrente : relire.
    const row = await prisma.ruleSet.findFirst({ where: { status: "PUBLISHED" } });
    if (!row) throw new Error("Impossible d'initialiser le jeu de règles.");
    return row;
  }
}

export type EmbeddedSyncAction = "PUBLISHED" | "UPGRADED" | "DRAFT" | "UNCHANGED";

/**
 * Synchronise le jeu de règles embarqué le plus récent avec la base (initialisation et déploiements).
 *
 * - Aucun barème publié : le jeu embarqué est publié (première installation).
 * - Le barème publié est une version embarquée plus ancienne, publiée automatiquement, et aucune
 *   relecture humaine des règles n'est enregistrée : il est remplacé (il n'a jamais été validé par une personne).
 * - Sinon, la nouvelle version est ajoutée comme brouillon : elle sera prévisualisée puis publiée
 *   depuis l'administration. Un brouillon déjà présent n'est jamais modifié.
 */
export async function syncEmbeddedRuleSet(): Promise<{ action: EmbeddedSyncAction; version: string }> {
  const target = DEFAULT_RULESET;
  const published = await prisma.ruleSet.findFirst({ where: { status: "PUBLISHED" } });
  if (!published) {
    const row = await ensureDefaultRuleSet();
    return { action: "PUBLISHED", version: row.version };
  }
  if (published.version === target.version) return { action: "UNCHANGED", version: target.version };
  const existing = await prisma.ruleSet.findUnique({ where: { version: target.version } });
  if (existing) return { action: "UNCHANGED", version: target.version };

  const order = EMBEDDED_RULESETS.map((r) => r.version as string);
  const olderEmbedded = order.includes(published.version) && order.indexOf(published.version) < order.indexOf(target.version);
  const settings = await getSettings();
  const data = target.data as unknown as Prisma.InputJsonValue;
  const common = {
    version: target.version,
    data,
    checksum: checksumOf(target.data),
    engineVersion: ENGINE_VERSION,
    basedOnId: published.id,
    notes: `Barème embarqué ${target.version}. ${target.data.meta.changelog}`.slice(0, 4000),
  };

  if (olderEmbedded && published.publishedById === null && !settings.launch.rulesReviewedAt) {
    await prisma.$transaction(async (tx) => {
      await tx.ruleSet.updateMany({ where: { status: "PUBLISHED" }, data: { status: "ARCHIVED", archivedAt: new Date() } });
      const row = await tx.ruleSet.create({
        data: {
          ...common,
          status: "PUBLISHED",
          publishedAt: new Date(),
          publicationNote: `Mise à jour automatique depuis ${published.version} : aucune relecture humaine des règles n'était encore enregistrée. Relecture directe des sources officielles requise avant la mise en production.`,
        },
      });
      await audit(
        { action: "RULESET_PUBLISHED", targetType: "RuleSet", targetId: row.id, metadata: { via: "system", mode: "embedded-upgrade", from: published.version, to: target.version } },
        tx,
      );
    });
    return { action: "UPGRADED", version: target.version };
  }

  const draft = await prisma.ruleSet.create({ data: { ...common, status: "DRAFT" } });
  await audit({ action: "RULESET_DRAFT_SAVED", targetType: "RuleSet", targetId: draft.id, metadata: { via: "system", mode: "embedded-draft", version: target.version } });
  return { action: "DRAFT", version: target.version };
}
