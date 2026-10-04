/**
 * Génère src/data/communes-par-code-postal.json à partir du jeu de données officiel
 * « Découpage administratif » (Etalab, paquet npm @etalab/decoupage-administratif).
 * Usage : npm run data:communes
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

interface Commune {
  code: string;
  nom: string;
  departement?: string;
  type: string;
  codesPostaux?: string[];
}

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("@etalab/decoupage-administratif/package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
const communes = JSON.parse(
  readFileSync(path.join(path.dirname(pkgPath), "data", "communes.json"), "utf8"),
) as Commune[];

const byPostalCode = new Map<string, [string, string, string][]>();
const withArrondissements = new Set<string>();

for (const c of communes) {
  if (c.type !== "commune-actuelle" && c.type !== "arrondissement-municipal") continue;
  if (!c.departement) continue;
  for (const cp of c.codesPostaux ?? []) {
    const list = byPostalCode.get(cp) ?? [];
    list.push([c.code, c.nom, c.departement]);
    byPostalCode.set(cp, list);
    if (c.type === "arrondissement-municipal") withArrondissements.add(cp);
  }
}

// Paris, Lyon, Marseille : on propose l'arrondissement plutôt que la commune globale.
const PLM = new Set(["75056", "69123", "13055"]);
const out: Record<string, [string, string, string][]> = {};
for (const [cp, list] of [...byPostalCode.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const filtered = withArrondissements.has(cp) ? list.filter(([code]) => !PLM.has(code)) : list;
  out[cp] = filtered.sort((a, b) => a[1].localeCompare(b[1], "fr"));
}

// Format compact : une ligne par commune « codePostal;codeInsee;nom;département ».
const lines: string[] = [];
for (const [cp, list] of Object.entries(out)) for (const [insee, nom, dep] of list) lines.push(`${cp};${insee};${nom};${dep}`);
const target = path.join(process.cwd(), "src", "data", "communes.ts");
writeFileSync(
  target,
  `// Fichier généré par scripts/build-communes.ts — ne pas modifier à la main.\n` +
    `export const COMMUNES_SOURCE = ${JSON.stringify(`@etalab/decoupage-administratif@${pkg.version}`)};\n` +
    `export const COMMUNES_DATA = ${JSON.stringify(lines.join("\n"))};\n`,
);
console.log(`${Object.keys(out).length} codes postaux (${lines.length} communes) écrits dans ${target}`);
