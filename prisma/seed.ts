/**
 * Initialisation : publie le jeu de règles embarqué s'il n'existe aucun barème publié,
 * et crée les paramètres par défaut (vides : aucune identité n'est inventée).
 * Aucune donnée de démonstration n'est créée ici.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { ensureDefaultRuleSet } from "../src/lib/rulesets";
import { DEFAULT_SETTINGS } from "../src/lib/settings-schema";

async function main() {
  const ruleSet = await ensureDefaultRuleSet();
  console.log(`Jeu de règles : ${ruleSet.version} (${ruleSet.status})`);
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
