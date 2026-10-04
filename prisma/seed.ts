/**
 * Initialisation : synchronise le jeu de règles embarqué (voir syncEmbeddedRuleSet),
 * et crée les paramètres par défaut (vides : aucune identité n'est inventée).
 * Aucune donnée de démonstration n'est créée ici.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { syncEmbeddedRuleSet } from "../src/lib/rulesets";
import { DEFAULT_SETTINGS } from "../src/lib/settings-schema";

async function main() {
  const sync = await syncEmbeddedRuleSet();
  const MESSAGES = {
    PUBLISHED: "publié (première installation)",
    UPGRADED: "publié en remplacement d'une version embarquée jamais relue",
    DRAFT: "ajouté comme brouillon, à prévisualiser puis publier dans l'administration",
    UNCHANGED: "déjà présent",
  } as const;
  console.log(`Jeu de règles embarqué ${sync.version} : ${MESSAGES[sync.action]}.`);
  const existing = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!existing) {
    await prisma.siteSettings.create({ data: { id: 1, data: DEFAULT_SETTINGS } });
    console.log("Paramètres par défaut créés (à compléter dans l'administration).");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
