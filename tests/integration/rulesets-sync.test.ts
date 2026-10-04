import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_RULESET, RULESET_2026_10 } from "@/engine";
import { prisma } from "@/lib/db";
import { checksumOf, getPublishedRuleSet, getRuleSetByVersion, syncEmbeddedRuleSet } from "@/lib/rulesets";
import { saveSettings } from "@/lib/settings";
import { resetDatabase, TEST_SETTINGS } from "./helpers";

/** Version 2026.10-1 publiée, comme en production avant la mise à jour. */
async function publishV1(publishedById: string | null) {
  return prisma.ruleSet.create({
    data: {
      version: RULESET_2026_10.version,
      status: "PUBLISHED",
      data: JSON.parse(JSON.stringify(RULESET_2026_10.data)),
      checksum: checksumOf(RULESET_2026_10.data),
      engineVersion: "1.0.0",
      publishedAt: new Date(),
      publishedById,
    },
  });
}

describe("synchronisation du jeu de règles embarqué", () => {
  beforeEach(async () => {
    await resetDatabase();
    await saveSettings(TEST_SETTINGS, null);
  });

  it("publie le jeu embarqué à la première installation", async () => {
    expect(await syncEmbeddedRuleSet()).toEqual({ action: "PUBLISHED", version: DEFAULT_RULESET.version });
    expect((await getPublishedRuleSet()).version).toBe(DEFAULT_RULESET.version);
  });

  it("remplace une version embarquée publiée automatiquement et jamais relue", async () => {
    const v1 = await publishV1(null);
    expect(await syncEmbeddedRuleSet()).toEqual({ action: "UPGRADED", version: DEFAULT_RULESET.version });

    const published = await getPublishedRuleSet();
    expect(published.version).toBe(DEFAULT_RULESET.version);
    const row = await prisma.ruleSet.findUniqueOrThrow({ where: { version: DEFAULT_RULESET.version } });
    expect(row.basedOnId).toBe(v1.id);
    expect(row.publishedById).toBeNull();
    expect(row.publicationNote).toContain("Relecture directe des sources officielles requise");

    // L'ancienne version reste lisible pour les demandes déjà enregistrées avec elle.
    expect((await prisma.ruleSet.findUniqueOrThrow({ where: { id: v1.id } })).status).toBe("ARCHIVED");
    expect((await getRuleSetByVersion(RULESET_2026_10.version))?.version).toBe(RULESET_2026_10.version);
    expect(await prisma.auditLog.count({ where: { action: "RULESET_PUBLISHED", targetId: published.id } })).toBe(1);
    expect(await prisma.ruleSet.count({ where: { status: "PUBLISHED" } })).toBe(1);
  });

  it("ajoute un brouillon quand une relecture humaine des règles est enregistrée", async () => {
    await saveSettings({ ...TEST_SETTINGS, launch: { ...TEST_SETTINGS.launch, rulesReviewedAt: "2026-10-04T09:00:00.000Z", rulesReviewedBy: "relecteur" } }, null);
    await publishV1(null);
    expect(await syncEmbeddedRuleSet()).toEqual({ action: "DRAFT", version: DEFAULT_RULESET.version });
    expect((await getPublishedRuleSet()).version).toBe(RULESET_2026_10.version);
    expect((await prisma.ruleSet.findUniqueOrThrow({ where: { version: DEFAULT_RULESET.version } })).status).toBe("DRAFT");
    // Un brouillon n'est jamais servi comme barème d'une demande.
    expect(await getRuleSetByVersion(DEFAULT_RULESET.version)).toBeNull();
  });

  it("ajoute un brouillon quand le barème publié l'a été par une personne", async () => {
    await publishV1(randomUUID());
    expect((await syncEmbeddedRuleSet()).action).toBe("DRAFT");
    expect((await getPublishedRuleSet()).version).toBe(RULESET_2026_10.version);
  });

  it("est idempotente et ne modifie jamais un brouillon existant", async () => {
    await saveSettings({ ...TEST_SETTINGS, launch: { ...TEST_SETTINGS.launch, rulesReviewedAt: "2026-10-04T09:00:00.000Z", rulesReviewedBy: "relecteur" } }, null);
    await publishV1(null);
    await syncEmbeddedRuleSet();
    const draft = await prisma.ruleSet.update({ where: { version: DEFAULT_RULESET.version }, data: { notes: "modifié par l'équipe" } });
    expect(await syncEmbeddedRuleSet()).toEqual({ action: "UNCHANGED", version: DEFAULT_RULESET.version });
    const after = await prisma.ruleSet.findUniqueOrThrow({ where: { id: draft.id } });
    expect(after.notes).toBe("modifié par l'équipe");
    expect(after.status).toBe("DRAFT");
    expect(await prisma.ruleSet.count()).toBe(2);
  });
});
