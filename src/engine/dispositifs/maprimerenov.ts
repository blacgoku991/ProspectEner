import { INCOME_CATEGORY_LABELS } from "../income";
import type { MprAmpleurRules, MprGesteRules } from "../ruleset-schema";
import type { CriterionResult, DispositifResult, IncomeCategory } from "../types";
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

function incomeCriterion(ctx: EvalContext, eligible: IncomeCategory[]): CriterionResult {
  const income = ctx.answers.income;
  const base = { id: "revenus", label: "Niveau de revenus du ménage", answerKeys: ["householdSize", "income"] as const };
  if (!income || income === "INCONNU" || !ctx.answers.householdSize) {
    return {
      ...base,
      answerKeys: [...base.answerKeys],
      status: "UNKNOWN",
      detail: "Le revenu fiscal de référence du ménage doit être vérifié (avis d'imposition).",
    };
  }
  if (eligible.includes(income)) {
    return {
      ...base,
      answerKeys: [...base.answerKeys],
      status: "MET",
      detail: `Tranche déclarée : ${INCOME_CATEGORY_LABELS[income].toLowerCase()} — catégorie couverte par le dispositif.`,
    };
  }
  return {
    ...base,
    answerKeys: [...base.answerKeys],
    status: "NOT_MET",
    detail: `Tranche déclarée : ${INCOME_CATEGORY_LABELS[income].toLowerCase()} — catégorie non couverte par ce dispositif selon les règles vérifiées.`,
  };
}

function remainingCommon(ctx: EvalContext, rules: MprGesteRules | MprAmpleurRules): string[] {
  const out = [...rules.conditionsToVerify];
  const occ = ctx.answers.occupancy;
  if (occ && rules.occupancyNotes[occ]) out.push(rules.occupancyNotes[occ] as string);
  if (rules.requiresRge && ctx.answers.contractor !== "RGE") {
    out.push("Les travaux devront être réalisés par une entreprise qualifiée RGE pour les travaux concernés.");
  }
  if (ctx.answers.priorAidStatus === "INCONNU") {
    out.push("Vérifier si une aide a déjà été obtenue pour le logement ou pour les mêmes travaux.");
  }
  return out;
}

// ─── MaPrimeRénov' par geste ────────────────────────────────────────────────

export function evaluateMprGeste(ctx: EvalContext, rules: MprGesteRules): DispositifResult {
  const name = "MaPrimeRénov' par geste";
  const territory = territoryCriterion(ctx, rules);
  const split = splitWorks(ctx.selectedWorks, rules);

  // Restrictions liées au DPE pour certains travaux.
  let dpeCriterion: CriterionResult | null = null;
  for (const restriction of rules.dpeRestrictions) {
    const concerned = split.covered.filter((w) => restriction.works.includes(w));
    if (concerned.length === 0) continue;
    const dpe = ctx.answers.dpe;
    if (dpe && dpe !== "INCONNU" && restriction.excludedDpe.includes(dpe)) {
      split.covered = split.covered.filter((w) => !concerned.includes(w));
      concerned.forEach((item) => split.excluded.push({ item, reason: restriction.reason }));
    } else if (!dpe || dpe === "INCONNU") {
      dpeCriterion = {
        id: "dpe",
        label: "Classe énergétique (DPE)",
        status: "UNKNOWN",
        detail: `${restriction.reason} La classe DPE du logement doit être connue.`,
        answerKeys: ["dpe"],
      };
    }
  }

  // Ancienneté du logement, avec dérogations éventuelles.
  let age = ageCriterion(ctx, rules.minAgeYears);
  if (age.status !== "MET") {
    for (const ex of rules.ageExceptions) {
      const heating = ctx.answers.currentHeating;
      const exWorks = split.covered.filter((w) => ex.works.includes(w));
      if (!heating || !ex.currentHeating.includes(heating) || exWorks.length === 0) continue;
      const exAge = ageCriterion(ctx, ex.minAgeYears);
      if (exAge.status === "NOT_MET") continue;
      const others = split.covered.filter((w) => !ex.works.includes(w));
      if (exAge.status === "MET") {
        others.forEach((item) =>
          split.excluded.push({ item, reason: `logement achevé depuis moins de ${rules.minAgeYears} ans.` }),
        );
        split.covered = exWorks;
      }
      age = {
        ...exAge,
        label: `Ancienneté du logement (dérogation : ${ex.label})`,
        detail: `${exAge.detail} Dérogation applicable : ${ex.label}.${
          others.length ? ` Les autres travaux (${others.map(workLabel).join(", ")}) restent soumis au seuil de ${rules.minAgeYears} ans.` : ""
        }`,
      };
      break;
    }
  }

  // Test d'éligibilité seul : le chauffage actuel n'est pas connu, la dérogation reste à vérifier.
  if (ctx.profile && age.status === "NOT_MET") {
    const ex = rules.ageExceptions.find((e) => ageCriterion(ctx, e.minAgeYears).status !== "NOT_MET");
    if (ex) {
      age = {
        ...age,
        status: "UNKNOWN",
        label: `Ancienneté du logement (dérogation possible : ${ex.label})`,
        detail: `Logement achevé depuis moins de ${rules.minAgeYears} ans : l'aide n'est possible que par dérogation, en cas de ${ex.label}. À vérifier avec la personne.`,
      };
    }
  }

  const criteria = [
    territory,
    occupancyCriterion(ctx, rules),
    residenceCriterion(ctx, rules),
    age,
    incomeCriterion(ctx, rules.eligibleIncomeCategories),
    worksCriterion(split, name),
    dpeCriterion,
    ...timingCriteria(ctx, rules, name),
    rgeCriterion(ctx, rules),
    priorAidCriterion(ctx, "MPR_GESTE", "MaPrimeRénov'"),
  ].filter(isNonNull);

  const derived = deriveStatus({ territoryOk: territory.status === "MET", split, criteria });
  const { status, disabledReason } = applyAvailability(derived, rules, ruleValidityIssue(rules, ctx.referenceDate));

  return buildResult(
    { id: "MPR_GESTE", name, aidKind: "SUBVENTION", provider: "Anah (État)" },
    rules,
    { status, disabledReason, criteria, split, remainingConditions: remainingCommon(ctx, rules), notes: rules.notes },
  );
}

// ─── MaPrimeRénov' rénovation d'ampleur ─────────────────────────────────────

export function evaluateMprAmpleur(ctx: EvalContext, rules: MprAmpleurRules): DispositifResult {
  const name = "MaPrimeRénov' rénovation d'ampleur";
  const territory = territoryCriterion(ctx, rules);
  const split = splitWorks(ctx.selectedWorks, rules);

  const dpe = ctx.answers.dpe;
  const dpeCriterion: CriterionResult = {
    id: "dpe",
    label: `Classe énergétique avant travaux (${rules.eligibleDpe.join(", ")})`,
    status: !dpe || dpe === "INCONNU" ? "UNKNOWN" : rules.eligibleDpe.includes(dpe) ? "MET" : "NOT_MET",
    detail:
      !dpe || dpe === "INCONNU"
        ? "La classe énergétique du logement n'est pas connue : un audit énergétique permettra de la déterminer."
        : rules.eligibleDpe.includes(dpe)
          ? `Classe ${dpe} déclarée : compatible avec le parcours de rénovation d'ampleur.`
          : `Classe ${dpe} déclarée : le parcours est réservé aux logements classés ${rules.eligibleDpe.join(", ")}.`,
    answerKeys: ["dpe"],
  };

  const housing = ctx.answers.housingType;
  const housingCriterion: CriterionResult | null =
    housing && !rules.housingTypes.includes(housing)
      ? {
          id: "type_logement",
          label: "Type de logement",
          status: "NOT_MET",
          detail: "Ce type de logement n'est pas couvert par le parcours individuel de rénovation d'ampleur.",
          answerKeys: ["housingType"],
        }
      : null;

  const criteria = [
    territory,
    occupancyCriterion(ctx, rules),
    residenceCriterion(ctx, rules),
    housingCriterion,
    ageCriterion(ctx, rules.minAgeYears),
    incomeCriterion(ctx, rules.eligibleIncomeCategories),
    worksCriterion(split, name),
    dpeCriterion,
    ...timingCriteria(ctx, rules, name),
    rgeCriterion(ctx, rules),
    priorAidCriterion(ctx, "MPR_AMPLEUR", "MaPrimeRénov'"),
  ].filter(isNonNull);

  const derived = deriveStatus({ territoryOk: territory.status === "MET", split, criteria });
  const { status, disabledReason } = applyAvailability(derived, rules, ruleValidityIssue(rules, ctx.referenceDate));

  return buildResult(
    { id: "MPR_AMPLEUR", name, aidKind: "SUBVENTION", provider: "Anah (État)" },
    rules,
    { status, disabledReason, criteria, split, remainingConditions: remainingCommon(ctx, rules), notes: rules.notes },
  );
}
