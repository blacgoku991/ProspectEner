import { describeConstruction, parseIsoDate } from "./construction";
import { splitWorks } from "./dispositifs/common";
import { describeBracket, incomeBrackets, incomeZoneForTerritory, isValidHouseholdSize } from "./income";
import { incomeTable, type RuleSetData } from "./ruleset-schema";
import { resolveTerritory } from "./territory";
import type {
  Answers,
  ConstructionAnswer,
  ContractorAnswer,
  CurrentHeating,
  DpeAnswer,
  HousingType,
  IncomeAnswer,
  Occupancy,
  PriorAidKind,
  ResidenceUse,
  WorkCategory,
  WorkItem,
  YesNoUnknown,
} from "./types";
import {
  HEAT_PUMP_CHOICES,
  HEATING_CHOICES,
  HOT_WATER_CHOICES,
  INSULATION_CHOICES,
  involvesHeating,
  selectedWorkItems,
  VENTILATION_CHOICES,
  WORK_CATEGORY_LABELS,
  WORK_ITEMS,
} from "./works";

/**
 * Questionnaire progressif : une question par écran, regroupées en étapes.
 * La visibilité de chaque question dépend des réponses précédentes et du jeu de
 * règles : on ne demande que ce qui sert aux dispositifs effectivement évalués.
 */

export type QuestionId =
  | "location"
  | "housingType"
  | "occupancy"
  | "residence"
  | "construction"
  | "works"
  | "insulationItems"
  | "heatPumpType"
  | "heatingTarget"
  | "hotWaterTarget"
  | "ventilationTarget"
  | "currentHeating"
  | "gasBoilerCondensing"
  | "oilTankRemoval"
  | "dpe"
  | "quoteSigned"
  | "quoteSignedRecency"
  | "worksStarted"
  | "priorAidStatus"
  | "priorAids"
  | "contractor"
  | "householdSize"
  | "income";

export type StepId = "logement" | "projet" | "energie" | "avancement" | "foyer";

export interface StepDef {
  id: StepId;
  title: string;
  subtitle: string;
  questions: QuestionId[];
}

export const STEPS: StepDef[] = [
  {
    id: "logement",
    title: "Le logement",
    subtitle: "Où se situe-t-il et quel est votre lien avec lui ?",
    questions: ["location", "housingType", "occupancy", "residence", "construction"],
  },
  {
    id: "projet",
    title: "Le projet",
    subtitle: "Quels travaux envisagez-vous ?",
    questions: ["works", "insulationItems", "heatPumpType", "heatingTarget", "hotWaterTarget", "ventilationTarget"],
  },
  {
    id: "energie",
    title: "La situation énergétique",
    subtitle: "Uniquement ce qui est utile aux règles évaluées.",
    questions: ["currentHeating", "gasBoilerCondensing", "oilTankRemoval", "dpe"],
  },
  {
    id: "avancement",
    title: "L'avancement",
    subtitle: "Certaines aides doivent être demandées avant de s'engager.",
    questions: ["quoteSigned", "quoteSignedRecency", "worksStarted", "priorAidStatus", "priorAids", "contractor"],
  },
  {
    id: "foyer",
    title: "Le foyer",
    subtitle: "Pour situer vos revenus dans le barème applicable.",
    questions: ["householdSize", "income"],
  },
];

export interface Option<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

export interface QuestionContext {
  rules: RuleSetData;
  referenceDate: string;
}

// ─── Options ────────────────────────────────────────────────────────────────

export const HOUSING_OPTIONS: Option<HousingType>[] = [
  { value: "MAISON", label: "Une maison" },
  { value: "APPARTEMENT", label: "Un appartement" },
];

export const OCCUPANCY_OPTIONS: Option<Occupancy>[] = [
  { value: "PROPRIETAIRE_OCCUPANT", label: "Propriétaire et j'y habite" },
  { value: "PROPRIETAIRE_BAILLEUR", label: "Propriétaire et je le loue (ou vais le louer)" },
  { value: "LOCATAIRE", label: "Locataire" },
  { value: "AUTRE", label: "Autre situation", hint: "Usufruit, logé à titre gratuit, SCI, indivision…" },
];

export function residenceOptions(occupancy: Occupancy | undefined): Option<ResidenceUse>[] {
  if (occupancy === "PROPRIETAIRE_BAILLEUR") {
    return [
      { value: "PRINCIPALE", label: "Loué comme résidence principale du locataire", hint: "Ou destiné à l'être" },
      { value: "AUTRE", label: "Autre usage", hint: "Location saisonnière, logement vacant…" },
    ];
  }
  return [
    { value: "PRINCIPALE", label: "Résidence principale", hint: "Occupée au moins 8 mois par an" },
    { value: "SECONDAIRE", label: "Résidence secondaire" },
  ];
}

export interface ConstructionPeriod {
  id: string;
  label: string;
  from: number | null;
  to: number | null;
}

/** Périodes calculées pour ne jamais chevaucher le seuil de 15 ans à la date de référence. */
export function constructionPeriods(referenceDate: string): ConstructionPeriod[] {
  const year = parseIsoDate(referenceDate).year;
  const lastCertain = year - 16;
  const periods: ConstructionPeriod[] = [
    { id: "AVANT_1948", label: "Avant 1948", from: null, to: 1947 },
    { id: "1948_1974", label: "1948 – 1974", from: 1948, to: 1974 },
    { id: "1975_2000", label: "1975 – 2000", from: 1975, to: 2000 },
  ];
  if (lastCertain >= 2001) periods.push({ id: "2001_RECENT", label: `2001 – ${lastCertain}`, from: 2001, to: lastCertain });
  periods.push({ id: "RECENT", label: `${lastCertain + 1} ou après`, from: lastCertain + 1, to: null });
  return periods;
}

export const WORK_CATEGORY_OPTIONS: Option<WorkCategory>[] = (
  ["ISOLATION", "CHAUFFAGE", "PAC", "EAU_CHAUDE", "VENTILATION", "RENOVATION_GLOBALE", "AUTRE"] as WorkCategory[]
).map((value) => ({
  value,
  label: WORK_CATEGORY_LABELS[value],
  hint: {
    ISOLATION: "Combles, toiture, murs, planchers, fenêtres",
    CHAUFFAGE: "Chaudière bois, poêle, réseau de chaleur…",
    PAC: "Air/eau, géothermique, hybride, air/air",
    EAU_CHAUDE: "Chauffe-eau thermodynamique ou solaire",
    VENTILATION: "VMC simple ou double flux",
    RENOVATION_GLOBALE: "Plusieurs travaux pour gagner des classes énergétiques",
    AUTRE: "Non évalué par le simulateur",
  }[value],
}));

const itemOptions = (items: WorkItem[]): Option<WorkItem>[] =>
  items.map((value) => ({
    value,
    label: WORK_ITEMS[value].undetermined ? "Je ne sais pas encore" : WORK_ITEMS[value].label,
  }));

export const INSULATION_OPTIONS = itemOptions(INSULATION_CHOICES);
export const HEAT_PUMP_OPTIONS = itemOptions(HEAT_PUMP_CHOICES);
export const HEATING_TARGET_OPTIONS = itemOptions(HEATING_CHOICES);
export const HOT_WATER_OPTIONS = itemOptions(HOT_WATER_CHOICES);
export const VENTILATION_OPTIONS = itemOptions(VENTILATION_CHOICES);

export const CURRENT_HEATING_OPTIONS: Option<CurrentHeating>[] = [
  { value: "CHAUDIERE_GAZ", label: "Chaudière au gaz" },
  { value: "CHAUDIERE_FIOUL", label: "Chaudière au fioul" },
  { value: "CHAUDIERE_CHARBON", label: "Chaudière au charbon" },
  { value: "ELECTRIQUE", label: "Électricité", hint: "Radiateurs, plancher chauffant…" },
  { value: "BOIS", label: "Bois", hint: "Poêle, insert, chaudière bois" },
  { value: "PAC", label: "Pompe à chaleur" },
  { value: "RESEAU_CHALEUR", label: "Réseau de chaleur" },
  { value: "AUTRE", label: "Autre" },
  { value: "INCONNU", label: "Je ne sais pas" },
];

export const YES_NO_UNKNOWN_OPTIONS: Option<YesNoUnknown>[] = [
  { value: "NON", label: "Non" },
  { value: "OUI", label: "Oui" },
  { value: "INCONNU", label: "Je ne sais pas" },
];

export const DPE_OPTIONS: Option<DpeAnswer>[] = [
  ...(["A", "B", "C", "D", "E", "F", "G"] as const).map((v) => ({ value: v, label: v })),
  { value: "INCONNU", label: "Je ne sais pas" },
];

export const PRIOR_AID_OPTIONS: Option<PriorAidKind>[] = [
  { value: "MAPRIMERENOV", label: "MaPrimeRénov'" },
  { value: "CEE", label: "Prime énergie (CEE)" },
  { value: "ECO_PTZ", label: "Éco-prêt à taux zéro" },
  { value: "AUTRE", label: "Autre aide (locale, caisse de retraite…)" },
];

export const CONTRACTOR_OPTIONS: Option<ContractorAnswer>[] = [
  { value: "NON_CHOISIE", label: "Non, pas encore" },
  { value: "RGE", label: "Oui, elle est qualifiée RGE pour ces travaux" },
  { value: "RGE_INCONNU", label: "Oui, mais je ne sais pas si elle est RGE" },
  { value: "NON_RGE", label: "Oui, et elle n'est pas RGE" },
];

export function quoteRecencyOptions(graceDays: number): Option<"RECENT" | "OLD" | "INCONNU">[] {
  return [
    { value: "RECENT", label: `Il y a ${graceDays} jours ou moins` },
    { value: "OLD", label: `Il y a plus de ${graceDays} jours` },
    { value: "INCONNU", label: "Je ne sais pas" },
  ];
}

export function incomeOptions(answers: Answers, ctx: QuestionContext): Option<IncomeAnswer>[] | null {
  const { territory } = resolveTerritory(answers);
  const zone = incomeZoneForTerritory(territory);
  if (!zone || !isValidHouseholdSize(answers.householdSize)) return null;
  const brackets = incomeBrackets(incomeTable(ctx.rules, zone), answers.householdSize);
  return [
    ...brackets.map((b) => ({ value: b.category as IncomeAnswer, label: describeBracket(b) })),
    { value: "INCONNU", label: "Je ne sais pas" },
  ];
}

// ─── Textes des questions ──────────────────────────────────────────────────

export interface QuestionText {
  title: string;
  help?: string;
}

export function questionText(id: QuestionId, answers: Answers, ctx: QuestionContext): QuestionText {
  const grace = graceDays(ctx.rules);
  const year = parseIsoDate(ctx.referenceDate).year;
  const texts: Record<QuestionId, QuestionText> = {
    location: { title: "Où se situe le logement ?", help: "Le code postal suffit : les aides et barèmes varient selon le territoire." },
    housingType: { title: "De quel type de logement s'agit-il ?" },
    occupancy: {
      title: "Quelle est votre situation vis-à-vis de ce logement ?",
      help: "Certaines aides sont réservées aux propriétaires, d'autres sont ouvertes aux locataires.",
    },
    residence: {
      title: answers.occupancy === "PROPRIETAIRE_BAILLEUR" ? "Comment le logement est-il loué ?" : "Ce logement est-il votre résidence principale ?",
      help: "La résidence principale est le logement occupé au moins 8 mois par an.",
    },
    construction: {
      title: "Quand le logement a-t-il été construit ?",
      help: `Indiquez l'année d'achèvement si vous la connaissez, sinon une période. Plusieurs aides exigent un logement achevé depuis au moins 2 ou 15 ans (en ${year}).`,
    },
    works: { title: "Quels travaux envisagez-vous ?", help: "Plusieurs choix possibles." },
    insulationItems: { title: "Quelle isolation ?", help: "Plusieurs choix possibles." },
    heatPumpType: {
      title: "Quel type de pompe à chaleur ?",
      help: "Air/eau : alimente radiateurs ou plancher chauffant. Air/air : souffle de l'air chaud (souvent réversible).",
    },
    heatingTarget: { title: "Vers quel équipement de chauffage ?" },
    hotWaterTarget: { title: "Quel équipement pour l'eau chaude ?" },
    ventilationTarget: { title: "Quel système de ventilation ?" },
    currentHeating: { title: "Comment le logement est-il chauffé aujourd'hui ?", help: "Le chauffage principal." },
    gasBoilerCondensing: { title: "Votre chaudière gaz est-elle à condensation ?", help: "L'information figure sur la plaque signalétique ou la notice de la chaudière." },
    oilTankRemoval: {
      title: "Prévoyez-vous de faire retirer la cuve à fioul ?",
      help: "Sa dépose peut être aidée lorsqu'elle accompagne le remplacement de la chaudière au fioul.",
    },
    dpe: {
      title: "Quelle est la classe énergétique (DPE) du logement ?",
      help: "Elle figure sur le diagnostic de performance énergétique (étiquette de A à G). Si vous ne la connaissez pas, un audit pourra la déterminer.",
    },
    quoteSigned: {
      title: isProfileTest(answers) ? "Avez-vous déjà signé un devis pour vos travaux de rénovation ?" : "Avez-vous déjà signé un devis pour ces travaux ?",
      help: "Certaines aides doivent être sollicitées avant la signature du devis.",
    },
    quoteSignedRecency: { title: "Quand avez-vous signé ce devis ?", help: grace ? `Le délai de ${grace} jours compte à partir de la signature.` : undefined },
    worksStarted: { title: "Les travaux ont-ils déjà commencé ?" },
    priorAidStatus: { title: "Avez-vous déjà demandé ou obtenu une aide pour ces travaux ?", help: "Ou pour ce logement au cours des dernières années." },
    priorAids: { title: "Laquelle ou lesquelles ?", help: "Plusieurs choix possibles." },
    contractor: {
      title: "Avez-vous choisi une entreprise ?",
      help: "RGE (« Reconnu garant de l'environnement ») est une qualification exigée pour la plupart des aides. Elle se vérifie sur l'annuaire officiel France Rénov'.",
    },
    householdSize: {
      title: "Combien de personnes composent votre ménage ?",
      help: "Toutes les personnes qui vivent dans le logement, y compris vous (pour un bailleur : votre propre foyer fiscal).",
    },
    income: {
      title: "Dans quelle tranche se situe le revenu fiscal de référence du ménage ?",
      help: `${ctx.rules.incomeCeilings.rfrNote} Additionnez les revenus fiscaux de référence de toutes les personnes du ménage. Aucun justificatif n'est demandé ici.`,
    },
  };
  return texts[id];
}

// ─── Visibilité ─────────────────────────────────────────────────────────────

function graceDays(rules: RuleSetData): number | null {
  const d = rules.dispositifs;
  const candidates = [d.MPR_GESTE, d.MPR_AMPLEUR, d.CEE, d.ECO_PTZ]
    .filter((x) => x.enabled && x.quoteMustNotBeSigned && x.quoteSignedGraceDays !== null)
    .map((x) => x.quoteSignedGraceDays as number);
  return candidates.length ? Math.min(...candidates) : null;
}

export function territoryInScope(answers: Answers): boolean {
  const { territory } = resolveTerritory(answers);
  return territory === "IDF" || territory === "METRO";
}

function hasEvaluableWorks(answers: Answers): boolean {
  return selectedWorkItems(answers).some((w) => w !== "AUTRE_PROJET");
}

/** Le revenu peut-il changer le résultat ? (dispositifs MaPrimeRénov' concernés) */
export function incomeRelevant(answers: Answers, rules: RuleSetData): boolean {
  const profile = isProfileTest(answers);
  if (!profile && !hasEvaluableWorks(answers)) return false;
  const occ = answers.occupancy;
  if (!occ || occ === "LOCATAIRE") return false;
  if (answers.residence !== "PRINCIPALE") return false;
  const items = selectedWorkItems(answers);
  return [rules.dispositifs.MPR_GESTE, rules.dispositifs.MPR_AMPLEUR].some((d) => {
    if (!d.enabled || !(d.eligibleOccupancies.includes(occ) || d.reviewOccupancies.includes(occ))) return false;
    // Si toutes les catégories de revenus sont éligibles, le revenu ne change pas le résultat.
    if (d.eligibleIncomeCategories.length >= 4) return false;
    // Test d'éligibilité seul : le dispositif est évalué pour tous les travaux qu'il couvre.
    if (profile) return d.eligibleWorks.length > 0;
    const split = splitWorks(items, d);
    return split.covered.length > 0 || split.undetermined.length > 0;
  });
}

/** Test d'éligibilité seul (sans le détail du projet) ? */
export function isProfileTest(answers: Answers): boolean {
  return answers.scope === "PROFILE";
}

/** Questions du test d'éligibilité seul : logement, avancement et foyer, rien sur le projet. */
function profileQuestionVisible(id: QuestionId, answers: Answers, ctx: QuestionContext): boolean {
  switch (id) {
    case "housingType":
    case "occupancy":
    case "construction":
    case "quoteSigned":
    case "worksStarted":
      return true;
    case "residence":
      return answers.occupancy !== undefined;
    case "quoteSignedRecency":
      return answers.quoteSigned === "OUI" && graceDays(ctx.rules) !== null;
    case "householdSize":
      return incomeRelevant(answers, ctx.rules);
    case "income":
      return incomeRelevant(answers, ctx.rules) && isValidHouseholdSize(answers.householdSize);
    default:
      return false;
  }
}

function dpeRelevant(answers: Answers, rules: RuleSetData): boolean {
  const items = selectedWorkItems(answers);
  const ampleur = rules.dispositifs.MPR_AMPLEUR;
  if (ampleur.enabled && items.some((i) => ampleur.eligibleWorks.includes(i))) return true;
  const geste = rules.dispositifs.MPR_GESTE;
  return geste.enabled && geste.dpeRestrictions.some((r) => r.works.some((w) => items.includes(w)));
}

/** Un dispositif actif évalue-t-il la dépose d'une cuve à fioul ? (sinon la question n'est pas posée) */
function oilTankEvaluated(rules: RuleSetData): boolean {
  return Object.values(rules.dispositifs).some(
    (d) =>
      d.enabled &&
      (d.eligibleWorks.includes("DEPOSE_CUVE_FIOUL") ||
        d.reviewWorks.some((r) => r.item === "DEPOSE_CUVE_FIOUL") ||
        d.excludedWorks.some((e) => e.item === "DEPOSE_CUVE_FIOUL")),
  );
}

function heatingRelevant(answers: Answers): boolean {
  const items = selectedWorkItems(answers);
  return involvesHeating(items) || items.includes("RENOVATION_GLOBALE");
}

export function isQuestionVisible(id: QuestionId, answers: Answers, ctx: QuestionContext): boolean {
  if (id === "location") return true;
  if (!territoryInScope(answers)) return false;
  if (isProfileTest(answers)) return profileQuestionVisible(id, answers, ctx);
  const works = answers.works ?? [];
  switch (id) {
    case "housingType":
    case "occupancy":
    case "construction":
    case "works":
      return true;
    case "residence":
      return answers.occupancy !== undefined;
    case "insulationItems":
      return works.includes("ISOLATION");
    case "heatPumpType":
      return works.includes("PAC");
    case "heatingTarget":
      return works.includes("CHAUFFAGE");
    case "hotWaterTarget":
      return works.includes("EAU_CHAUDE");
    case "ventilationTarget":
      return works.includes("VENTILATION");
    case "currentHeating":
      return hasEvaluableWorks(answers) && heatingRelevant(answers);
    case "gasBoilerCondensing":
      return (
        hasEvaluableWorks(answers) &&
        heatingRelevant(answers) &&
        answers.currentHeating === "CHAUDIERE_GAZ" &&
        ctx.rules.dispositifs.CEE.enabled &&
        ctx.rules.dispositifs.CEE.coupDePouceChauffage.gasBoilerMustBeNonCondensing
      );
    case "oilTankRemoval":
      return (
        hasEvaluableWorks(answers) &&
        involvesHeating(selectedWorkItems(answers)) &&
        answers.currentHeating === "CHAUDIERE_FIOUL" &&
        oilTankEvaluated(ctx.rules)
      );
    case "dpe":
      return hasEvaluableWorks(answers) && dpeRelevant(answers, ctx.rules);
    case "quoteSigned":
    case "worksStarted":
    case "priorAidStatus":
    case "contractor":
      return hasEvaluableWorks(answers);
    case "quoteSignedRecency":
      return hasEvaluableWorks(answers) && answers.quoteSigned === "OUI" && graceDays(ctx.rules) !== null;
    case "priorAids":
      return hasEvaluableWorks(answers) && answers.priorAidStatus === "OUI";
    case "householdSize":
      return incomeRelevant(answers, ctx.rules);
    case "income":
      return incomeRelevant(answers, ctx.rules) && isValidHouseholdSize(answers.householdSize);
  }
}

/** Liste ordonnée des questions visibles pour les réponses actuelles. */
export function visibleQuestions(answers: Answers, ctx: QuestionContext): QuestionId[] {
  return STEPS.flatMap((s) => s.questions).filter((q) => isQuestionVisible(q, answers, ctx));
}

/** Clés de réponses associées à chaque question. */
export const QUESTION_KEYS: Record<QuestionId, (keyof Answers)[]> = {
  location: ["postalCode", "communeInsee", "communeName", "departement"],
  housingType: ["housingType"],
  occupancy: ["occupancy"],
  residence: ["residence"],
  construction: ["construction"],
  works: ["works"],
  insulationItems: ["insulationItems"],
  heatPumpType: ["heatPumpType"],
  heatingTarget: ["heatingTarget"],
  hotWaterTarget: ["hotWaterTarget"],
  ventilationTarget: ["ventilationTarget"],
  currentHeating: ["currentHeating"],
  gasBoilerCondensing: ["gasBoilerCondensing"],
  oilTankRemoval: ["oilTankRemoval"],
  dpe: ["dpe"],
  quoteSigned: ["quoteSigned"],
  quoteSignedRecency: ["quoteSignedRecency"],
  worksStarted: ["worksStarted"],
  priorAidStatus: ["priorAidStatus"],
  priorAids: ["priorAids"],
  contractor: ["contractor"],
  householdSize: ["householdSize"],
  income: ["income"],
};

export function isAnswered(id: QuestionId, answers: Answers): boolean {
  switch (id) {
    case "location":
      return typeof answers.postalCode === "string" && /^\d{5}$/.test(answers.postalCode);
    case "works":
      return (answers.works ?? []).length > 0;
    case "insulationItems":
      return (answers.insulationItems ?? []).length > 0;
    case "priorAids":
      return (answers.priorAids ?? []).length > 0;
    default:
      return QUESTION_KEYS[id].every((k) => answers[k] !== undefined && answers[k] !== null);
  }
}

/**
 * Supprime les réponses aux questions devenues invisibles (minimisation) :
 * rien n'est conservé pour une question qui n'a pas été posée.
 */
export function pruneAnswers(answers: Answers, ctx: QuestionContext): Answers {
  // La visibilité dépend des réponses : on itère jusqu'à stabilité.
  let current: Answers = { ...answers };
  for (let i = 0; i < 5; i++) {
    // La portée du test n'est liée à aucune question : elle est toujours conservée.
    const next: Answers = current.scope ? { scope: current.scope } : {};
    for (const step of STEPS) {
      for (const q of step.questions) {
        if (!isQuestionVisible(q, current, ctx)) continue;
        for (const key of QUESTION_KEYS[q]) {
          if (current[key] !== undefined) (next as Record<string, unknown>)[key] = current[key];
        }
      }
    }
    if (JSON.stringify(next) === JSON.stringify(current)) return next;
    current = next;
  }
  return current;
}

/** Première question visible non répondue, ou null si le questionnaire est complet. */
export function firstUnanswered(answers: Answers, ctx: QuestionContext): QuestionId | null {
  return visibleQuestions(answers, ctx).find((q) => !isAnswered(q, answers)) ?? null;
}

// ─── Résumé lisible des réponses ────────────────────────────────────────────

const labelOf = <T extends string>(options: Option<T>[], value: T | undefined): string | undefined =>
  options.find((o) => o.value === value)?.label;

export interface AnswerSummaryLine {
  question: QuestionId;
  label: string;
  value: string;
}

export function summarizeAnswers(answers: Answers, ctx: QuestionContext): AnswerSummaryLine[] {
  const lines: AnswerSummaryLine[] = [];
  const add = (question: QuestionId, label: string, value: string | undefined) => {
    if (value) lines.push({ question, label, value });
  };
  const visible = new Set(visibleQuestions(answers, ctx));
  const v = (q: QuestionId) => visible.has(q);

  if (v("location") && answers.postalCode) {
    add("location", "Localisation", [answers.postalCode, answers.communeName].filter(Boolean).join(" "));
  }
  if (v("housingType")) add("housingType", "Type de logement", labelOf(HOUSING_OPTIONS, answers.housingType));
  if (v("occupancy")) add("occupancy", "Situation", labelOf(OCCUPANCY_OPTIONS, answers.occupancy));
  if (v("residence")) add("residence", "Usage du logement", labelOf(residenceOptions(answers.occupancy), answers.residence));
  if (v("construction") && answers.construction) {
    add("construction", "Construction", describeConstruction(answers.construction as ConstructionAnswer));
  }
  if (v("works")) {
    add("works", "Travaux envisagés", (answers.works ?? []).map((w) => WORK_CATEGORY_LABELS[w]).join(", "));
  }
  const items = selectedWorkItems(answers).filter((i) => i !== "AUTRE_PROJET" && i !== "RENOVATION_GLOBALE" && i !== "DEPOSE_CUVE_FIOUL");
  if (items.length) add("works", "Détail des travaux", items.map((i) => WORK_ITEMS[i].label).join(", "));
  if (v("currentHeating")) add("currentHeating", "Chauffage actuel", labelOf(CURRENT_HEATING_OPTIONS, answers.currentHeating));
  if (v("gasBoilerCondensing")) add("gasBoilerCondensing", "Chaudière à condensation", labelOf(YES_NO_UNKNOWN_OPTIONS, answers.gasBoilerCondensing));
  if (v("oilTankRemoval")) add("oilTankRemoval", "Dépose de la cuve à fioul", labelOf(YES_NO_UNKNOWN_OPTIONS, answers.oilTankRemoval));
  if (v("dpe")) add("dpe", "Classe énergétique (DPE)", labelOf(DPE_OPTIONS, answers.dpe));
  if (v("quoteSigned")) add("quoteSigned", "Devis signé", labelOf(YES_NO_UNKNOWN_OPTIONS, answers.quoteSigned));
  if (v("quoteSignedRecency")) {
    const g = graceDays(ctx.rules);
    if (g) add("quoteSignedRecency", "Signature du devis", labelOf(quoteRecencyOptions(g), answers.quoteSignedRecency));
  }
  if (v("worksStarted")) add("worksStarted", "Travaux commencés", labelOf(YES_NO_UNKNOWN_OPTIONS, answers.worksStarted));
  if (v("priorAidStatus")) add("priorAidStatus", "Aide déjà demandée ou obtenue", labelOf(YES_NO_UNKNOWN_OPTIONS, answers.priorAidStatus));
  if (v("priorAids")) add("priorAids", "Aides concernées", (answers.priorAids ?? []).map((p) => labelOf(PRIOR_AID_OPTIONS, p)).join(", "));
  if (v("contractor")) add("contractor", "Entreprise", labelOf(CONTRACTOR_OPTIONS, answers.contractor));
  if (v("householdSize") && answers.householdSize) {
    add("householdSize", "Personnes dans le ménage", String(answers.householdSize));
  }
  if (v("income")) {
    const opts = incomeOptions(answers, ctx);
    if (opts) add("income", "Revenu fiscal de référence", labelOf(opts, answers.income));
  }
  return lines;
}
