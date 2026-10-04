import type { EcoPtzRules } from "../ruleset-schema";
import type { DispositifResult } from "../types";
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

export function evaluateEcoPtz(ctx: EvalContext, rules: EcoPtzRules): DispositifResult {
  const name = "l'éco-prêt à taux zéro";
  const territory = territoryCriterion(ctx, rules);
  const split = splitWorks(ctx.selectedWorks, rules);

  const criteria = [
    territory,
    occupancyCriterion(ctx, rules),
    residenceCriterion(ctx, rules),
    ageCriterion(ctx, rules.minAgeYears),
    worksCriterion(split, name),
    ...timingCriteria(ctx, rules, name),
    rgeCriterion(ctx, rules),
    priorAidCriterion(ctx, "ECO_PTZ", "un éco-prêt à taux zéro"),
  ].filter(isNonNull);

  const derived = deriveStatus({ territoryOk: territory.status === "MET", split, criteria });
  const { status, disabledReason } = applyAvailability(derived, rules, ruleValidityIssue(rules, ctx.referenceDate));

  const remaining = [...rules.conditionsToVerify];
  const occ = ctx.answers.occupancy;
  if (occ && rules.occupancyNotes[occ]) remaining.push(rules.occupancyNotes[occ] as string);
  if (rules.requiresRge && ctx.answers.contractor !== "RGE") {
    remaining.push("Les travaux devront être réalisés par une entreprise qualifiée RGE pour les travaux concernés.");
  }

  return buildResult(
    { id: "ECO_PTZ", name: "Éco-prêt à taux zéro (éco-PTZ)", aidKind: "PRET", provider: "Banques ayant signé une convention avec l'État" },
    rules,
    { status, disabledReason, criteria, split, remainingConditions: remaining, notes: rules.notes },
  );
}
