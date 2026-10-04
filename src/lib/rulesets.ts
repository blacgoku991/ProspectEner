import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { DEFAULT_RULESET, ENGINE_VERSION, type RuleSet, validateRuleSetData } from "@/engine";
import { prisma } from "./db";
import { sha256Hex } from "./crypto";

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
