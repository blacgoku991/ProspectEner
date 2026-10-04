import type { IncomeCategory, Territory } from "./types";

/** [plafond très modestes, plafond modestes, plafond intermédiaires] — en euros, bornes incluses. */
export type CeilingTriple = [number, number, number];

export interface IncomeCeilingTable {
  /** Index 0 = 1 personne … index 4 = 5 personnes. */
  bySize: [CeilingTriple, CeilingTriple, CeilingTriple, CeilingTriple, CeilingTriple];
  /** Montants à ajouter par personne supplémentaire au-delà de 5. */
  extraPerson: CeilingTriple;
}

export type IncomeZone = "IDF" | "HORS_IDF";

export const MAX_HOUSEHOLD_SIZE = 20;

export function incomeZoneForTerritory(territory: Territory): IncomeZone | null {
  if (territory === "IDF") return "IDF";
  if (territory === "METRO") return "HORS_IDF";
  return null;
}

export function isValidHouseholdSize(size: unknown): size is number {
  return typeof size === "number" && Number.isInteger(size) && size >= 1 && size <= MAX_HOUSEHOLD_SIZE;
}

/** Plafonds applicables à un ménage de `size` personnes. */
export function ceilingsFor(table: IncomeCeilingTable, size: number): CeilingTriple {
  if (!isValidHouseholdSize(size)) throw new Error(`Taille de ménage invalide : ${String(size)}`);
  if (size <= 5) return table.bySize[size - 1] as CeilingTriple;
  const base = table.bySize[4];
  const extra = size - 5;
  return [
    base[0] + extra * table.extraPerson[0],
    base[1] + extra * table.extraPerson[1],
    base[2] + extra * table.extraPerson[2],
  ];
}

/**
 * Catégorie de revenus pour un revenu fiscal de référence donné.
 * Les plafonds sont inclusifs : un revenu égal au plafond relève de la catégorie.
 */
export function incomeCategoryFor(rfr: number, size: number, table: IncomeCeilingTable): IncomeCategory {
  if (!Number.isFinite(rfr) || rfr < 0) throw new Error("Revenu fiscal de référence invalide");
  const [tresModeste, modeste, intermediaire] = ceilingsFor(table, size);
  if (rfr <= tresModeste) return "TRES_MODESTE";
  if (rfr <= modeste) return "MODESTE";
  if (rfr <= intermediaire) return "INTERMEDIAIRE";
  return "SUPERIEUR";
}

export interface IncomeBracket {
  category: IncomeCategory;
  /** Borne basse incluse (null = pas de minimum). */
  min: number | null;
  /** Borne haute incluse (null = pas de maximum). */
  max: number | null;
}

/** Tranches affichées au visiteur, cohérentes avec `incomeCategoryFor` (euros entiers). */
export function incomeBrackets(table: IncomeCeilingTable, size: number): IncomeBracket[] {
  const [a, b, c] = ceilingsFor(table, size);
  return [
    { category: "TRES_MODESTE", min: null, max: a },
    { category: "MODESTE", min: a + 1, max: b },
    { category: "INTERMEDIAIRE", min: b + 1, max: c },
    { category: "SUPERIEUR", min: c + 1, max: null },
  ];
}

const euro = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function formatEuros(n: number): string {
  // Espace fine insécable remplacée par une espace insécable classique pour la lisibilité.
  return `${euro.format(n).replace(/ /g, " ")} €`;
}

export function describeBracket(bracket: IncomeBracket): string {
  if (bracket.min === null && bracket.max !== null) return `Jusqu'à ${formatEuros(bracket.max)}`;
  if (bracket.min !== null && bracket.max === null) return `Plus de ${formatEuros(bracket.min - 1)}`;
  if (bracket.min !== null && bracket.max !== null)
    return `De ${formatEuros(bracket.min)} à ${formatEuros(bracket.max)}`;
  return "Tous revenus";
}

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  TRES_MODESTE: "Revenus très modestes",
  MODESTE: "Revenus modestes",
  INTERMEDIAIRE: "Revenus intermédiaires",
  SUPERIEUR: "Revenus supérieurs",
};
