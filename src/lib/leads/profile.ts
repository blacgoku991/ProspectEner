import { BOILER_LOCATION_OPTIONS, CURRENT_HEATING_OPTIONS, HEAT_EMITTER_OPTIONS, OCCUPANCY_OPTIONS } from "@/engine/questionnaire";
import { resolveTerritory } from "@/engine/territory";
import type {
  Answers,
  BoilerLocation,
  CurrentHeating,
  HeatEmitter,
  HousingType,
  IncomeCategory,
  Occupancy,
  WorkItem,
} from "@/engine/types";
import { selectedWorkItems } from "@/engine/works";

/**
 * Profil d'une demande : les réponses utiles pour trier les demandes et les orienter vers
 * l'entreprise partenaire concernée. Copié dans des colonnes de la demande à sa création,
 * pour filtrer en base. `null` = réponse inconnue ou question non posée.
 */
export interface LeadProfile {
  incomeCategory: IncomeCategory | null;
  householdSize: number | null;
  housingType: HousingType | null;
  occupancy: Occupancy | null;
  currentHeating: CurrentHeating | null;
  heatEmitters: HeatEmitter | null;
  radiatorCount: number | null;
  heatedArea: number | null;
  boilerLocation: BoilerLocation | null;
  /** Année d'achèvement la plus ancienne et la plus récente possibles (null = borne inconnue). */
  constructionYearMin: number | null;
  constructionYearMax: number | null;
  departement: string | null;
  workItems: WorkItem[];
}

const known = <T extends string>(v: T | undefined): Exclude<T, "INCONNU"> | null =>
  v === undefined || v === "INCONNU" ? null : (v as Exclude<T, "INCONNU">);
const count = (v: number | "INCONNU" | undefined): number | null => (typeof v === "number" ? v : null);

export function leadProfileFromAnswers(answers: Answers, departement: string | null = answers.departement ?? null): LeadProfile {
  const c = answers.construction;
  return {
    incomeCategory: known(answers.income),
    householdSize: typeof answers.householdSize === "number" ? answers.householdSize : null,
    housingType: answers.housingType ?? null,
    occupancy: answers.occupancy ?? null,
    currentHeating: known(answers.currentHeating),
    heatEmitters: known(answers.heatEmitters),
    radiatorCount: count(answers.radiatorCount),
    heatedArea: count(answers.heatedArea),
    boilerLocation: known(answers.boilerLocation),
    constructionYearMin: c?.kind === "YEAR" ? c.year : c?.kind === "PERIOD" ? c.from : null,
    constructionYearMax: c?.kind === "YEAR" ? c.year : c?.kind === "PERIOD" ? c.to : null,
    departement,
    workItems: selectedWorkItems(answers),
  };
}

/**
 * Profil d'une demande tel que le serveur l'enregistre : département déduit de la commune (code
 * INSEE), sinon du code postal. Calculé de la même façon dans le navigateur pour nommer
 * l'entreprise partenaire dans la phrase de la demande.
 */
export function requestLeadProfile(answers: Answers): LeadProfile {
  return leadProfileFromAnswers(answers, resolveTerritory(answers).departement);
}

/** Champs de la demande (colonnes) correspondant au profil. */
export type LeadProfileColumns = Omit<LeadProfile, "departement">;

export function leadProfileColumns(profile: LeadProfile): LeadProfileColumns {
  const { departement: _d, ...columns } = profile;
  return columns;
}

/** Profil reconstitué à partir des colonnes d'une demande enregistrée. */
export function leadProfileFromRow(row: {
  incomeCategory: string | null;
  householdSize: number | null;
  housingType: string | null;
  occupancy: string | null;
  currentHeating: string | null;
  heatEmitters: string | null;
  radiatorCount: number | null;
  heatedArea: number | null;
  boilerLocation: string | null;
  constructionYearMin: number | null;
  constructionYearMax: number | null;
  departement: string | null;
  workItems: string[];
}): LeadProfile {
  return {
    incomeCategory: row.incomeCategory as IncomeCategory | null,
    householdSize: row.householdSize,
    housingType: row.housingType as HousingType | null,
    occupancy: row.occupancy as Occupancy | null,
    currentHeating: row.currentHeating as CurrentHeating | null,
    heatEmitters: row.heatEmitters as HeatEmitter | null,
    radiatorCount: row.radiatorCount,
    heatedArea: row.heatedArea,
    boilerLocation: row.boilerLocation as BoilerLocation | null,
    constructionYearMin: row.constructionYearMin,
    constructionYearMax: row.constructionYearMax,
    departement: row.departement,
    workItems: row.workItems as WorkItem[],
  };
}

/** Colonnes à sélectionner pour reconstituer le profil (Prisma `select`). */
export const LEAD_PROFILE_SELECT = {
  incomeCategory: true,
  householdSize: true,
  housingType: true,
  occupancy: true,
  currentHeating: true,
  heatEmitters: true,
  radiatorCount: true,
  heatedArea: true,
  boilerLocation: true,
  constructionYearMin: true,
  constructionYearMax: true,
  departement: true,
  workItems: true,
} as const;

// ─── Libellés ────────────────────────────────────────────────────────────────

/** Catégories de revenus et couleurs utilisées par France Rénov' et l'Anah. */
export const INCOME_PROFILE: Record<IncomeCategory, { color: string; label: string; short: string }> = {
  TRES_MODESTE: { color: "Bleu", label: "Bleu · revenus très modestes", short: "Bleu" },
  MODESTE: { color: "Jaune", label: "Jaune · revenus modestes", short: "Jaune" },
  INTERMEDIAIRE: { color: "Violet", label: "Violet · revenus intermédiaires", short: "Violet" },
  SUPERIEUR: { color: "Rose", label: "Rose · revenus supérieurs", short: "Rose" },
};

export const INCOME_CATEGORIES: IncomeCategory[] = ["TRES_MODESTE", "MODESTE", "INTERMEDIAIRE", "SUPERIEUR"];

const optionLabel = <T extends string>(options: { value: T; label: string }[], v: T | null): string | null =>
  v === null ? null : (options.find((o) => o.value === v)?.label ?? v);

export const leadLabels = {
  housingType: (v: HousingType | null) => (v === null ? null : v === "MAISON" ? "Maison" : "Appartement"),
  occupancy: (v: Occupancy | null) => optionLabel(OCCUPANCY_OPTIONS, v),
  currentHeating: (v: CurrentHeating | null) => optionLabel(CURRENT_HEATING_OPTIONS, v),
  heatEmitters: (v: HeatEmitter | null) => optionLabel(HEAT_EMITTER_OPTIONS, v),
  boilerLocation: (v: BoilerLocation | null) => optionLabel(BOILER_LOCATION_OPTIONS, v),
  income: (v: IncomeCategory | null) => (v === null ? null : INCOME_PROFILE[v].label),
  construction(min: number | null, max: number | null): string | null {
    if (min !== null && max !== null) return min === max ? String(min) : `${min} – ${max}`;
    if (min === null && max !== null) return `Avant ${max + 1}`;
    if (min !== null && max === null) return `${min} ou après`;
    return null;
  },
};
