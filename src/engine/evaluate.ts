import { evaluateCee } from "./dispositifs/cee";
import type { EvalContext } from "./dispositifs/common";
import { evaluateEcoPtz } from "./dispositifs/ecoptz";
import { evaluateMprAmpleur, evaluateMprGeste } from "./dispositifs/maprimerenov";
import { incomeZoneForTerritory } from "./income";
import type { RuleSet } from "./ruleset-schema";
import { resolveTerritory } from "./territory";
import {
  type Answers,
  type DispositifResult,
  ENGINE_VERSION,
  type Evaluation,
  type OverallOutcome,
  type Territory,
  type WorkItem,
} from "./types";
import { selectedWorkItems } from "./works";

export const HEADLINES: Record<OverallOutcome, string> = {
  POTENTIALLY_ELIGIBLE:
    "Votre projet pourrait correspondre à certaines aides à la rénovation énergétique. Une vérification complémentaire est nécessaire avant toute confirmation.",
  NEEDS_REVIEW: "Certaines informations doivent être vérifiées pour évaluer votre situation.",
  NOT_ELIGIBLE:
    "Selon vos réponses, les critères des dispositifs évalués par ce simulateur ne semblent pas remplis.",
  OUT_OF_SCOPE:
    "Votre situation est hors du périmètre de ce simulateur : une étude complémentaire est nécessaire pour l'évaluer.",
};

/** Messages du test d'éligibilité seul : le projet est précisé ensuite avec un conseiller. */
export const PROFILE_HEADLINES: Record<OverallOutcome, string> = {
  POTENTIALLY_ELIGIBLE:
    "Votre situation pourrait vous ouvrir droit à certaines aides à la rénovation énergétique, selon les travaux envisagés. Une vérification est nécessaire avant toute confirmation.",
  NEEDS_REVIEW: "Certaines informations doivent être vérifiées pour confirmer votre éligibilité.",
  NOT_ELIGIBLE: "Selon vos réponses, les conditions des aides évaluées par ce simulateur ne semblent pas remplies.",
  OUT_OF_SCOPE: HEADLINES.OUT_OF_SCOPE,
};

const TERRITORY_NOTICES: Partial<Record<Territory, string>> = {
  DROM: "Les aides à la rénovation en outre-mer obéissent à des règles spécifiques qui ne sont pas couvertes par ce simulateur.",
  COM: "Les collectivités d'outre-mer disposent de règles propres qui ne sont pas couvertes par ce simulateur.",
  HORS_FRANCE: "Ce simulateur ne couvre que les logements situés en France.",
  INCONNU: "Le territoire n'a pas pu être déterminé à partir du code postal indiqué.",
};

export function overallOutcome(results: DispositifResult[]): OverallOutcome {
  const shown = results.filter((r) => r.status !== "NOT_CONCERNED");
  if (shown.some((r) => r.status === "POTENTIALLY_ELIGIBLE")) return "POTENTIALLY_ELIGIBLE";
  if (shown.some((r) => r.status === "NEEDS_REVIEW")) return "NEEDS_REVIEW";
  if (shown.length === 0 || shown.every((r) => r.status === "OUT_OF_SCOPE")) return "OUT_OF_SCOPE";
  return "NOT_ELIGIBLE";
}

/**
 * Évalue les réponses avec un jeu de règles donné, à une date de référence (AAAA-MM-JJ).
 * Fonction pure et déterministe : mêmes entrées → même résultat.
 */
export function evaluate(answers: Answers, ruleSet: RuleSet, referenceDate: string): Evaluation {
  const rules = ruleSet.data;
  const { territory, departement } = resolveTerritory({
    postalCode: answers.postalCode,
    communeInsee: answers.communeInsee,
    departement: answers.departement,
  });
  // Test d'éligibilité seul : chaque dispositif est évalué pour tous les travaux qu'il couvre
  // (« ce foyer peut-il être aidé par ce dispositif ? »), le projet étant précisé ensuite.
  const profile = answers.scope === "PROFILE";
  const selectedWorks = profile ? [] : selectedWorkItems(answers);
  const ctxFor = (eligibleWorks: WorkItem[]): EvalContext => ({
    answers,
    territory,
    referenceDate,
    selectedWorks: profile ? [...eligibleWorks] : selectedWorks,
    profile,
  });

  const results: DispositifResult[] = [];
  const d = rules.dispositifs;
  if (d.MPR_GESTE.enabled) results.push(evaluateMprGeste(ctxFor(d.MPR_GESTE.eligibleWorks), d.MPR_GESTE));
  if (d.MPR_AMPLEUR.enabled) results.push(evaluateMprAmpleur(ctxFor(d.MPR_AMPLEUR.eligibleWorks), d.MPR_AMPLEUR));
  if (d.CEE.enabled) results.push(evaluateCee(ctxFor(d.CEE.eligibleWorks), d.CEE));
  if (d.ECO_PTZ.enabled) results.push(evaluateEcoPtz(ctxFor(d.ECO_PTZ.eligibleWorks), d.ECO_PTZ));

  const outcome = overallOutcome(results);
  const notices: string[] = [];
  const territoryNotice = TERRITORY_NOTICES[territory];
  if (territoryNotice) notices.push(territoryNotice);
  if (selectedWorks.includes("AUTRE_PROJET")) {
    notices.push("Les projets autres que ceux proposés ne sont pas évalués par ce simulateur.");
  }
  notices.push(...rules.notices);

  return {
    engineVersion: ENGINE_VERSION,
    ruleSetVersion: ruleSet.version,
    referenceDate,
    territory,
    departement,
    incomeZone: incomeZoneForTerritory(territory),
    ...(profile ? { scope: "PROFILE" as const } : {}),
    selectedWorks,
    outcome,
    headline: profile ? PROFILE_HEADLINES[outcome] : HEADLINES[outcome],
    results,
    notices,
  };
}
