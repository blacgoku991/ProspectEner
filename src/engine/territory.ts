import type { Territory } from "./types";

/** Départements d'Île-de-France. */
export const IDF_DEPARTEMENTS: readonly string[] = ["75", "77", "78", "91", "92", "93", "94", "95"];

/** Départements et régions d'outre-mer. */
export const DROM_DEPARTEMENTS: readonly string[] = ["971", "972", "973", "974", "976"];

/** Collectivités d'outre-mer et territoires du Pacifique (codes postaux 975, 977, 978, 986-988). */
export const COM_CODES: readonly string[] = ["975", "977", "978", "984", "986", "987", "988"];

const POSTAL_CODE_RE = /^\d{5}$/;

export function isValidPostalCodeFormat(value: string): boolean {
  return POSTAL_CODE_RE.test(value) && value !== "00000";
}

/**
 * Déduit le département à partir du seul code postal (repli si la commune n'est pas connue).
 * Quelques codes postaux couvrent des communes de départements voisins : la commune
 * choisie (code INSEE) reste la source à privilégier.
 */
export function departementFromPostalCode(postalCode: string): string | null {
  if (!isValidPostalCodeFormat(postalCode)) return null;
  const two = postalCode.slice(0, 2);
  const three = postalCode.slice(0, 3);
  if (two === "97" || two === "98") return three;
  if (two === "20") return Number(postalCode) < 20200 ? "2A" : "2B";
  if (two === "00" || two === "96" || two === "99") return null;
  return two;
}

/** Déduit le département d'un code commune INSEE (ex. "75056" → "75", "97411" → "974", "2A004" → "2A"). */
export function departementFromInsee(insee: string): string | null {
  if (!/^(\d{5}|2[AB]\d{3})$/.test(insee)) return null;
  if (insee.startsWith("97") || insee.startsWith("98")) return insee.slice(0, 3);
  return insee.slice(0, 2);
}

export function territoryFromDepartement(dep: string | null | undefined): Territory {
  if (!dep) return "INCONNU";
  if (IDF_DEPARTEMENTS.includes(dep)) return "IDF";
  if (DROM_DEPARTEMENTS.includes(dep)) return "DROM";
  if (COM_CODES.includes(dep)) return "COM";
  if (dep === "980") return "HORS_FRANCE"; // Monaco
  if (dep === "2A" || dep === "2B") return "METRO";
  const n = Number(dep);
  if (Number.isInteger(n) && n >= 1 && n <= 95 && dep.length === 2) return "METRO";
  return "INCONNU";
}

/**
 * Résout le territoire : commune (INSEE) en priorité, sinon département fourni,
 * sinon code postal.
 */
export function resolveTerritory(input: {
  postalCode?: string;
  communeInsee?: string;
  departement?: string;
}): { territory: Territory; departement: string | null } {
  const dep =
    (input.communeInsee ? departementFromInsee(input.communeInsee) : null) ??
    (input.departement && /^(\d{2,3}|2[AB])$/.test(input.departement) ? input.departement : null) ??
    (input.postalCode ? departementFromPostalCode(input.postalCode) : null);
  return { territory: territoryFromDepartement(dep), departement: dep };
}

export const TERRITORY_LABELS: Record<Territory, string> = {
  IDF: "Île-de-France",
  METRO: "France métropolitaine (hors Île-de-France)",
  DROM: "Outre-mer (DROM)",
  COM: "Collectivité d'outre-mer",
  HORS_FRANCE: "Hors de France",
  INCONNU: "Territoire non déterminé",
};
