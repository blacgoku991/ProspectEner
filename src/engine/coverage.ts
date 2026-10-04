import type { DispositifCommonRules, RuleSetData } from "./ruleset-schema";
import type { DispositifId, WorkCategory, WorkItem } from "./types";
import { WORK_ITEMS } from "./works";

export const DISPOSITIF_INFO: Record<DispositifId, { name: string; kind: "Subvention" | "Prime" | "Prêt"; provider: string }> = {
  MPR_GESTE: { name: "MaPrimeRénov' par geste", kind: "Subvention", provider: "Anah (État)" },
  MPR_AMPLEUR: { name: "MaPrimeRénov' rénovation d'ampleur", kind: "Subvention", provider: "Anah (État)" },
  CEE: { name: "Primes énergie (CEE)", kind: "Prime", provider: "Fournisseurs d'énergie, dispositif encadré par l'État" },
  ECO_PTZ: { name: "Éco-prêt à taux zéro", kind: "Prêt", provider: "Banques conventionnées par l'État" },
};

export interface CategoryCoverage {
  id: DispositifId;
  name: string;
  kind: string;
  covered: string[];
  review: string[];
  excluded: { label: string; reason: string }[];
}

/** Ce que chaque dispositif couvre pour une famille de travaux, d'après le jeu de règles. */
export function coverageForCategory(rules: RuleSetData, category: WorkCategory): CategoryCoverage[] {
  const items = (Object.keys(WORK_ITEMS) as WorkItem[]).filter((w) => WORK_ITEMS[w].category === category && !WORK_ITEMS[w].undetermined);
  const entries = Object.entries(rules.dispositifs) as [DispositifId, DispositifCommonRules & { enabled: boolean }][];
  return entries
    .filter(([, d]) => d.enabled)
    .map(([id, d]) => ({
      id,
      name: DISPOSITIF_INFO[id].name,
      kind: DISPOSITIF_INFO[id].kind,
      covered: items.filter((i) => d.eligibleWorks.includes(i)).map((i) => WORK_ITEMS[i].label),
      review: items.filter((i) => d.reviewWorks.some((r) => r.item === i)).map((i) => WORK_ITEMS[i].label),
      excluded: items
        .map((i) => ({ i, e: d.excludedWorks.find((x) => x.item === i) }))
        .filter((x): x is { i: WorkItem; e: { item: WorkItem; reason: string } } => Boolean(x.e))
        .map(({ i, e }) => ({ label: WORK_ITEMS[i].label, reason: e.reason })),
    }))
    .filter((c) => c.covered.length + c.review.length + c.excluded.length > 0);
}
