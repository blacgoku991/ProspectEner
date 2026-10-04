import { checkMinimumAge, compareDates, parseIsoDate } from "../construction";
import type { DispositifCommonRules } from "../ruleset-schema";
import { WORK_ITEMS, workLabel } from "../works";
import type {
  Answers,
  CriterionResult,
  DispositifResult,
  DispositifStatus,
  PriorAidKind,
  ResultHighlight,
  Territory,
  WorkItem,
} from "../types";

export interface EvalContext {
  answers: Answers;
  territory: Territory;
  referenceDate: string;
  /** Travaux évalués : ceux du visiteur, ou (test d'éligibilité seul) tous ceux que couvre le dispositif. */
  selectedWorks: WorkItem[];
  /** Test d'éligibilité seul : le projet n'est pas encore précisé. */
  profile?: boolean;
}

export const OCCUPANCY_LABELS = {
  PROPRIETAIRE_OCCUPANT: "propriétaire occupant",
  PROPRIETAIRE_BAILLEUR: "propriétaire bailleur",
  LOCATAIRE: "locataire",
  AUTRE: "autre situation (usufruit, occupation à titre gratuit, SCI…)",
} as const;

// ─── Critères communs ───────────────────────────────────────────────────────

export function territoryCriterion(ctx: EvalContext, rules: DispositifCommonRules): CriterionResult {
  const covered = (rules.territories as string[]).includes(ctx.territory);
  return {
    id: "territoire",
    label: "Territoire couvert par le simulateur",
    status: covered ? "MET" : "NOT_MET",
    detail: covered
      ? "Le logement est situé dans un territoire évalué par ce simulateur."
      : "Ce territoire n'est pas évalué par ce simulateur pour ce dispositif (règles spécifiques non couvertes).",
    answerKeys: ["postalCode", "communeInsee"],
  };
}

export function occupancyCriterion(ctx: EvalContext, rules: DispositifCommonRules): CriterionResult {
  const occ = ctx.answers.occupancy;
  if (!occ) {
    return { id: "statut", label: "Statut d'occupation", status: "UNKNOWN", detail: "Statut d'occupation non renseigné.", answerKeys: ["occupancy"] };
  }
  if (rules.eligibleOccupancies.includes(occ)) {
    return {
      id: "statut",
      label: "Statut d'occupation",
      status: "MET",
      detail: `Le statut « ${OCCUPANCY_LABELS[occ]} » fait partie des bénéficiaires prévus.`,
      answerKeys: ["occupancy"],
    };
  }
  if (rules.reviewOccupancies.includes(occ)) {
    return {
      id: "statut",
      label: "Statut d'occupation",
      status: "UNKNOWN",
      detail: `Le statut « ${OCCUPANCY_LABELS[occ]} » peut ouvrir droit au dispositif dans certains cas : une vérification est nécessaire.`,
      answerKeys: ["occupancy"],
    };
  }
  return {
    id: "statut",
    label: "Statut d'occupation",
    status: "NOT_MET",
    detail: `Ce dispositif n'est pas ouvert au statut « ${OCCUPANCY_LABELS[occ]} » selon les règles vérifiées.`,
    answerKeys: ["occupancy"],
  };
}

export function residenceCriterion(
  ctx: EvalContext,
  rules: DispositifCommonRules,
  secondaryPolicy: "ELIGIBLE" | "REVIEW" | "NOT_ELIGIBLE" = "NOT_ELIGIBLE",
): CriterionResult | null {
  const { residence, occupancy } = ctx.answers;
  const isBailleur = occupancy === "PROPRIETAIRE_BAILLEUR";
  const label = isBailleur ? "Logement loué comme résidence principale" : "Résidence principale";
  if (!rules.requiresPrincipalResidence) {
    if (residence === "PRINCIPALE" || residence === undefined) return null;
    if (secondaryPolicy === "ELIGIBLE") return null;
    if (secondaryPolicy === "REVIEW") {
      return {
        id: "residence",
        label: "Usage du logement",
        status: "UNKNOWN",
        detail: "Pour une résidence secondaire ou un logement non loué à titre principal, les conditions doivent être vérifiées au cas par cas.",
        answerKeys: ["residence"],
      };
    }
  }
  if (!residence) {
    return { id: "residence", label, status: "UNKNOWN", detail: "Usage du logement non renseigné.", answerKeys: ["residence"] };
  }
  if (residence === "PRINCIPALE") {
    return {
      id: "residence",
      label,
      status: "MET",
      detail: isBailleur
        ? "Le logement est loué (ou destiné à être loué) comme résidence principale."
        : "Le logement est votre résidence principale.",
      answerKeys: ["residence"],
    };
  }
  return {
    id: "residence",
    label,
    status: "NOT_MET",
    detail: isBailleur
      ? "Le dispositif exige que le logement soit loué comme résidence principale du locataire."
      : "Le dispositif est réservé aux résidences principales.",
    answerKeys: ["residence"],
  };
}

export function ageCriterion(ctx: EvalContext, minYears: number, id = "anciennete"): CriterionResult {
  const status = checkMinimumAge(ctx.answers.construction, minYears, ctx.referenceDate);
  const ref = parseIsoDate(ctx.referenceDate);
  const pivot = ref.year - minYears;
  const details: Record<typeof status, string> = {
    MET: `Le logement a été achevé il y a au moins ${minYears} ans.`,
    NOT_MET: `Le logement doit avoir été achevé depuis au moins ${minYears} ans (avant ${pivot} environ).`,
    UNKNOWN:
      ctx.answers.construction && ctx.answers.construction.kind !== "UNKNOWN"
        ? `La date exacte d'achèvement est nécessaire : le logement doit avoir au moins ${minYears} ans à la date de la demande (seuil en ${pivot}).`
        : `L'ancienneté du logement (au moins ${minYears} ans) doit être vérifiée.`,
    NOT_APPLICABLE: "",
  };
  return {
    id,
    label: `Logement achevé depuis au moins ${minYears} ans`,
    status,
    detail: details[status],
    answerKeys: ["construction"],
  };
}

export function timingCriteria(ctx: EvalContext, rules: DispositifCommonRules, dispositifName: string): CriterionResult[] {
  const out: CriterionResult[] = [];
  const started = ctx.answers.worksStarted;
  if (rules.worksMustNotHaveStarted) {
    const exception = rules.worksStartedExceptionNote;
    out.push({
      id: "travaux_non_commences",
      label: "Travaux non commencés",
      status: started === "NON" ? "MET" : started === "OUI" ? (exception ? "UNKNOWN" : "NOT_MET") : "UNKNOWN",
      detail:
        started === "NON"
          ? "Les travaux n'ont pas commencé."
          : started === "OUI"
            ? `Pour ${dispositifName}, la demande doit en principe intervenir avant le début des travaux.${exception ? ` ${exception}` : ""}`
            : "Il faut confirmer que les travaux n'ont pas commencé.",
      answerKeys: ["worksStarted"],
    });
  }
  if (rules.quoteMustNotBeSigned) {
    const signed = ctx.answers.quoteSigned;
    const grace = rules.quoteSignedGraceDays;
    const base = { id: "devis_non_signe", label: "Aide sollicitée avant l'engagement (signature du devis)", answerKeys: ["quoteSigned", "quoteSignedRecency"] as (keyof Answers)[] };
    if (signed === "NON") {
      out.push({ ...base, status: "MET", detail: "Le devis n'est pas encore signé : l'offre doit être acceptée avant sa signature." });
    } else if (signed === "OUI" && grace !== null) {
      const recency = ctx.answers.quoteSignedRecency;
      if (recency === "RECENT" && started !== "OUI") {
        out.push({
          ...base,
          status: "UNKNOWN",
          detail: `Le devis vient d'être signé : pour ${dispositifName}, l'offre peut encore être formalisée au plus tard ${grace} jours après la signature et avant le début des travaux. Démarche à engager rapidement.`,
        });
      } else if (recency === "OLD") {
        out.push({
          ...base,
          status: "NOT_MET",
          detail: `Le devis a été signé il y a plus de ${grace} jours : pour ${dispositifName}, l'aide devait être sollicitée avant (ou au plus tard ${grace} jours après) la signature.`,
        });
      } else {
        out.push({
          ...base,
          status: "UNKNOWN",
          detail: `La date de signature du devis doit être vérifiée : l'aide ne reste possible que dans les ${grace} jours suivant la signature et avant le début des travaux.`,
        });
      }
    } else if (signed === "OUI") {
      out.push({ ...base, status: "NOT_MET", detail: `Pour ${dispositifName}, l'aide doit être sollicitée avant la signature du devis.` });
    } else {
      out.push({ ...base, status: "UNKNOWN", detail: "Il faut vérifier si un devis a déjà été signé." });
    }
  }
  return out;
}

export function rgeCriterion(ctx: EvalContext, rules: DispositifCommonRules): CriterionResult | null {
  if (!rules.requiresRge) return null;
  const c = ctx.answers.contractor;
  if (c === "RGE") {
    return {
      id: "rge",
      label: "Entreprise qualifiée RGE",
      status: "MET",
      detail: "Vous indiquez que l'entreprise choisie est qualifiée RGE pour ces travaux (qualification à vérifier à la date du devis).",
      answerKeys: ["contractor"],
    };
  }
  if (c === "NON_RGE") {
    return {
      id: "rge",
      label: "Entreprise qualifiée RGE",
      status: "UNKNOWN",
      detail: "L'entreprise indiquée n'est pas RGE : l'aide n'est possible qu'avec une entreprise qualifiée RGE pour les travaux concernés.",
      answerKeys: ["contractor"],
    };
  }
  return null; // non choisie ou inconnue → rappelé dans les conditions restant à vérifier
}

const PRIOR_AID_FOR: Record<string, PriorAidKind> = {
  MPR_GESTE: "MAPRIMERENOV",
  MPR_AMPLEUR: "MAPRIMERENOV",
  CEE: "CEE",
  ECO_PTZ: "ECO_PTZ",
};

export function priorAidCriterion(ctx: EvalContext, dispositifId: string, dispositifName: string): CriterionResult | null {
  const kind = PRIOR_AID_FOR[dispositifId];
  if (!kind || ctx.answers.priorAidStatus !== "OUI") return null;
  if (!(ctx.answers.priorAids ?? []).includes(kind)) return null;
  return {
    id: "aide_anterieure",
    label: "Absence de demande antérieure pour les mêmes travaux",
    status: "UNKNOWN",
    detail: `Vous indiquez avoir déjà demandé ou obtenu ${dispositifName} : une même aide ne peut pas financer deux fois les mêmes travaux, et des plafonds pluriannuels peuvent s'appliquer.`,
    answerKeys: ["priorAidStatus", "priorAids"],
  };
}

// ─── Répartition des travaux ────────────────────────────────────────────────

export interface WorksSplit {
  covered: WorkItem[];
  excluded: { item: WorkItem; reason: string }[];
  /** Travaux dont la prise en charge reste à préciser ou à vérifier. */
  undetermined: { item: WorkItem; reason: string }[];
  unrelated: WorkItem[];
}

export function splitWorks(selected: WorkItem[], rules: DispositifCommonRules): WorksSplit {
  const coveredCategories = new Set(
    [...rules.eligibleWorks, ...rules.reviewWorks.map((r) => r.item)].map((w) => WORK_ITEMS[w].category),
  );
  const split: WorksSplit = { covered: [], excluded: [], undetermined: [], unrelated: [] };
  for (const item of selected) {
    const exclusion = rules.excludedWorks.find((e) => e.item === item);
    const review = rules.reviewWorks.find((r) => r.item === item);
    if (rules.eligibleWorks.includes(item)) split.covered.push(item);
    else if (exclusion) split.excluded.push({ item, reason: exclusion.reason });
    else if (review) split.undetermined.push({ item, reason: review.reason });
    else if (WORK_ITEMS[item].undetermined && coveredCategories.has(WORK_ITEMS[item].category)) {
      split.undetermined.push({ item, reason: "Le type exact de travaux reste à préciser." });
    } else split.unrelated.push(item);
  }
  return split;
}

const WORK_ANSWER_KEYS: (keyof Answers)[] = [
  "works",
  "insulationItems",
  "heatPumpType",
  "heatingTarget",
  "hotWaterTarget",
  "ventilationTarget",
  "oilTankRemoval",
];

export function worksCriterion(split: WorksSplit, dispositifName: string): CriterionResult {
  const excludedText = split.excluded.map((e) => `${workLabel(e.item)} : ${e.reason}`);
  const reviewText = split.undetermined.map((u) => `${workLabel(u.item)} : ${u.reason}`);
  if (split.covered.length > 0) {
    const extra = [...excludedText, ...reviewText];
    return {
      id: "travaux",
      label: "Travaux couverts par le dispositif",
      status: "MET",
      detail: `Travaux concernés : ${split.covered.map(workLabel).join(", ")}.${extra.length ? ` Autres travaux : ${extra.join(" ")}` : ""}`,
      answerKeys: WORK_ANSWER_KEYS,
    };
  }
  if (split.undetermined.length > 0) {
    return {
      id: "travaux",
      label: "Travaux couverts par le dispositif",
      status: "UNKNOWN",
      detail: [...reviewText, ...excludedText].join(" ") || `Le type exact de travaux reste à préciser pour ${dispositifName}.`,
      answerKeys: WORK_ANSWER_KEYS,
    };
  }
  return {
    id: "travaux",
    label: "Travaux couverts par le dispositif",
    status: "NOT_MET",
    detail: excludedText.join(" ") || `Les travaux indiqués ne relèvent pas de ${dispositifName}.`,
    answerKeys: WORK_ANSWER_KEYS,
  };
}

// ─── Validité des règles ────────────────────────────────────────────────────

/** Raison de désactiver la conclusion (règle non vérifiée, barème expiré…), ou null. */
export function ruleValidityIssue(rules: DispositifCommonRules, referenceDate: string): string | null {
  const ref = parseIsoDate(referenceDate);
  if (rules.verification.status === "UNVERIFIED") {
    return "Les règles actuelles de ce dispositif n'ont pas pu être vérifiées sur une source officielle : aucune conclusion n'est donnée.";
  }
  if (compareDates(ref, parseIsoDate(rules.validFrom)) < 0) {
    return "Les règles enregistrées pour ce dispositif ne sont pas encore applicables à la date de la simulation.";
  }
  if (rules.validUntil && compareDates(ref, parseIsoDate(rules.validUntil)) > 0) {
    return "La période de validité des règles enregistrées est dépassée : elles doivent être revérifiées avant toute conclusion.";
  }
  return null;
}

// ─── Synthèse ───────────────────────────────────────────────────────────────

export function deriveStatus(params: {
  territoryOk: boolean;
  split: WorksSplit;
  criteria: CriterionResult[];
}): DispositifStatus {
  const { territoryOk, split, criteria } = params;
  if (!territoryOk) return "OUT_OF_SCOPE";
  if (split.covered.length === 0 && split.undetermined.length === 0) {
    return split.excluded.length > 0 ? "NOT_ELIGIBLE" : "NOT_CONCERNED";
  }
  if (criteria.some((c) => c.status === "NOT_MET")) return "NOT_ELIGIBLE";
  if (criteria.some((c) => c.status === "UNKNOWN")) return "NEEDS_REVIEW";
  return "POTENTIALLY_ELIGIBLE";
}

export function applyAvailability(
  status: DispositifStatus,
  rules: DispositifCommonRules,
  validityIssue: string | null,
): { status: DispositifStatus; disabledReason?: string } {
  if (status === "OUT_OF_SCOPE" || status === "NOT_CONCERNED") return { status };
  if (validityIssue) return { status: "NEEDS_REVIEW", disabledReason: validityIssue };
  if (rules.availability === "SUSPENDED" && status === "POTENTIALLY_ELIGIBLE") {
    return {
      status: "NEEDS_REVIEW",
      disabledReason: rules.availabilityNote ?? "Le dépôt de nouvelles demandes est actuellement suspendu pour ce dispositif.",
    };
  }
  if (rules.availability === "UNKNOWN" && status === "POTENTIALLY_ELIGIBLE") {
    return {
      status: "NEEDS_REVIEW",
      disabledReason: rules.availabilityNote ?? "L'ouverture actuelle du dispositif n'a pas pu être confirmée.",
    };
  }
  return { status };
}

export const SUMMARIES: Record<DispositifStatus, string> = {
  POTENTIALLY_ELIGIBLE: "Votre situation semble compatible avec les critères principaux de ce dispositif, sous réserve des conditions restant à vérifier.",
  NOT_ELIGIBLE: "Selon les réponses fournies, au moins un critère de ce dispositif ne semble pas rempli.",
  NEEDS_REVIEW: "Des informations complémentaires ou une vérification sont nécessaires pour conclure.",
  OUT_OF_SCOPE: "Ce cas est hors du périmètre du simulateur : il n'est pas évalué ici.",
  NOT_CONCERNED: "Ce dispositif ne concerne pas les travaux que vous avez sélectionnés.",
};

export function buildResult(
  base: Pick<DispositifResult, "id" | "name" | "aidKind" | "provider">,
  rules: DispositifCommonRules,
  params: {
    status: DispositifStatus;
    disabledReason?: string;
    criteria: CriterionResult[];
    split: WorksSplit;
    remainingConditions: string[];
    notes: string[];
    highlights?: ResultHighlight[];
  },
): DispositifResult {
  const uncovered = [
    ...params.split.excluded.map((e) => e.item),
    ...params.split.undetermined.map((u) => u.item),
    ...params.split.unrelated,
  ];
  const remaining = [...params.remainingConditions];
  const verificationNote =
    rules.verification.status === "PARTIAL" && rules.verification.notes
      ? `Point non confirmé lors de la dernière vérification des règles : ${rules.verification.notes}`
      : undefined;
  return {
    ...base,
    status: params.status,
    summary: params.disabledReason ?? SUMMARIES[params.status],
    criteria: params.criteria.filter((c) => c.status !== "NOT_APPLICABLE"),
    coveredWorks: params.split.covered,
    uncoveredWorks: uncovered,
    remainingConditions: dedupe(remaining),
    notes: dedupe([...params.notes, ...params.split.covered.map((w) => rules.workNotes[w] ?? "")]),
    sources: rules.sources,
    verifiedAt: rules.verification.verifiedAt,
    validFrom: rules.validFrom,
    validUntil: rules.validUntil,
    ...(params.highlights?.length ? { highlights: params.highlights } : {}),
    ...(params.disabledReason ? { conclusionDisabledReason: params.disabledReason } : {}),
    ...(verificationNote ? { verificationNote } : {}),
  };
}

export function dedupe(list: string[]): string[] {
  return [...new Set(list.filter((s) => s.trim().length > 0))];
}

export function isNonNull<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined;
}
