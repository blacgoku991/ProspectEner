import { compareDates, parseIsoDate } from "../construction";
import type { CeeRules } from "../ruleset-schema";
import type { CurrentHeating, DispositifResult } from "../types";
import { workLabel } from "../works";
import {
  ageCriterion,
  applyAvailability,
  buildResult,
  deriveStatus,
  type EvalContext,
  isNonNull,
  occupancyCriterion,
  priorAidCriterion,
  residenceCriterion,
  rgeCriterion,
  ruleValidityIssue,
  splitWorks,
  territoryCriterion,
  timingCriteria,
  worksCriterion,
} from "./common";

const HEATING_LABELS: Record<CurrentHeating, string> = {
  CHAUDIERE_GAZ: "chaudière au gaz",
  CHAUDIERE_FIOUL: "chaudière au fioul",
  CHAUDIERE_CHARBON: "chaudière au charbon",
  ELECTRIQUE: "chauffage électrique",
  BOIS: "chauffage au bois",
  PAC: "pompe à chaleur",
  RESEAU_CHALEUR: "réseau de chaleur",
  AUTRE: "autre chauffage",
  INCONNU: "chauffage non précisé",
};

function coupDePouceNotes(ctx: EvalContext, rules: CeeRules, covered: string[]): string[] {
  const cdp = rules.coupDePouceChauffage;
  if (!cdp.enabled) return [];
  if (cdp.validUntil && compareDates(parseIsoDate(ctx.referenceDate), parseIsoDate(cdp.validUntil)) > 0) return [];
  const targets = ctx.selectedWorks.filter((w) => covered.includes(w) && cdp.eligibleTargets.includes(w));
  if (targets.length === 0) return [];
  const heating = ctx.answers.currentHeating;
  const targetText = targets.map((t) => workLabel(t).toLowerCase()).join(", ");
  const notes: string[] = [];
  if (!heating || heating === "INCONNU") {
    notes.push(
      `Une bonification « Coup de pouce Chauffage » peut s'appliquer au remplacement d'un équipement de chauffage éligible (${cdp.replacedHeating
        .map((h) => HEATING_LABELS[h])
        .join(", ")}) : le chauffage actuel doit être précisé.`,
    );
  } else if (cdp.replacedHeating.includes(heating)) {
    if (cdp.requiresPrincipalResidence && ctx.answers.residence !== "PRINCIPALE") {
      notes.push("La bonification « Coup de pouce Chauffage » est réservée aux résidences principales.");
    } else {
      notes.push(
        `Bonification « Coup de pouce Chauffage » potentiellement applicable : remplacement d'une ${HEATING_LABELS[heating]} par : ${targetText}. Le montant dépend de l'offre de chaque fournisseur d'énergie signataire.`,
      );
    }
  }
  if (cdp.note) notes.push(cdp.note);
  return notes;
}

export function evaluateCee(ctx: EvalContext, rules: CeeRules): DispositifResult {
  const name = "les primes CEE";
  const territory = territoryCriterion(ctx, rules);
  const split = splitWorks(ctx.selectedWorks, rules);

  const criteria = [
    territory,
    occupancyCriterion(ctx, rules),
    residenceCriterion(ctx, rules, rules.secondaryResidence),
    ageCriterion(ctx, rules.minAgeYears),
    worksCriterion(split, name),
    ...timingCriteria(ctx, rules, name),
    rgeCriterion(ctx, rules),
    priorAidCriterion(ctx, "CEE", "une prime CEE"),
  ].filter(isNonNull);

  const derived = deriveStatus({ territoryOk: territory.status === "MET", split, criteria });
  const { status, disabledReason } = applyAvailability(derived, rules, ruleValidityIssue(rules, ctx.referenceDate));

  const remaining = [...rules.conditionsToVerify];
  const occ = ctx.answers.occupancy;
  if (occ && rules.occupancyNotes[occ]) remaining.push(rules.occupancyNotes[occ] as string);
  if (rules.requiresRge && ctx.answers.contractor !== "RGE") {
    remaining.push("Les travaux devront être réalisés par une entreprise qualifiée RGE pour les travaux concernés.");
  }

  const notes = [...rules.notes];
  if (status === "POTENTIALLY_ELIGIBLE" || status === "NEEDS_REVIEW") {
    notes.push(...coupDePouceNotes(ctx, rules, split.covered));
  }

  return buildResult(
    { id: "CEE", name: "Primes énergie (certificats d'économies d'énergie)", aidKind: "PRIME", provider: "Fournisseurs d'énergie (dispositif CEE encadré par l'État)" },
    rules,
    { status, disabledReason, criteria, split, remainingConditions: remaining, notes },
  );
}
