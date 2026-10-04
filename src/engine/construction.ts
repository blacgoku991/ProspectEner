import type { ConstructionAnswer, CriterionStatus } from "./types";

/** Date calendaire simple (évite toute dépendance au fuseau horaire). */
export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export function parseIsoDate(iso: string): CalendarDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Date ISO invalide : ${iso}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) throw new Error(`Date ISO invalide : ${iso}`);
  return { year, month, day };
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/**
 * Le logement est-il achevé depuis au moins `minYears` ans à la date de référence ?
 *
 * Avec une année de construction seulement, le résultat est certain sauf pour l'année
 * charnière (référence − minYears) : la date exacte d'achèvement est alors nécessaire
 * et le critère est renvoyé « à vérifier ». Pour une période, le critère n'est certain
 * que si toutes les années de la période donnent le même résultat.
 */
export function checkMinimumAge(
  construction: ConstructionAnswer | undefined,
  minYears: number,
  referenceDate: string,
): CriterionStatus {
  if (!construction || construction.kind === "UNKNOWN") return "UNKNOWN";
  const ref = parseIsoDate(referenceDate);
  const thresholdYear = ref.year - minYears;
  // Achevé au plus tard le 31/12 de l'année charnière : certain si la date seuil est le 31/12.
  const thresholdIsYearEnd = ref.month === 12 && ref.day === 31;

  const statusForYear = (year: number): CriterionStatus => {
    if (year < thresholdYear) return "MET";
    if (year > thresholdYear) return "NOT_MET";
    return thresholdIsYearEnd ? "MET" : "UNKNOWN";
  };

  if (construction.kind === "YEAR") {
    if (!Number.isInteger(construction.year) || construction.year > ref.year) return "UNKNOWN";
    return statusForYear(construction.year);
  }

  const { from, to } = construction;
  if (from !== null && to !== null && from > to) return "UNKNOWN";
  const lower = from === null ? "MET" : statusForYear(from);
  const upper = statusForYear(to === null ? ref.year : Math.min(to, ref.year));
  if (lower === upper) return lower;
  return "UNKNOWN";
}

/** Libellé lisible de la réponse « construction ». */
export function describeConstruction(construction: ConstructionAnswer | undefined): string {
  if (!construction || construction.kind === "UNKNOWN") return "Date de construction inconnue";
  if (construction.kind === "YEAR") return `Construit en ${construction.year}`;
  const { from, to } = construction;
  if (from === null && to !== null) return `Construit avant ${to + 1}`;
  if (from !== null && to === null) return `Construit en ${from} ou après`;
  return `Construit entre ${from} et ${to}`;
}
