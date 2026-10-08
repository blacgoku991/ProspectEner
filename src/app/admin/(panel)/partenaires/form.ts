import { type PartnerCriteria, partnerCriteriaSchema } from "@/lib/leads/partners";

/**
 * Formulaire d'une entreprise partenaire : valeurs brutes (renvoyées au formulaire en cas
 * d'erreur pour ne rien perdre de la saisie) et lecture validée des champs envoyés.
 */

export const MULTI_FIELDS = ["works", "incomeCategories", "housingTypes", "occupancies", "currentHeating", "heatEmitters"] as const;
export type MultiField = (typeof MULTI_FIELDS)[number];

export interface PartnerFormValues extends Record<MultiField, string[]> {
  name: string;
  details: string;
  active: boolean;
  minHeatedArea: string;
  minBuildingAge: string;
  /** Codes de départements séparés par des virgules. */
  departements: string;
}

export const NAME_MAX = 120;
export const DETAILS_MAX = 200;
export const AREA_RANGE = { min: 1, max: 1000 } as const;
export const AGE_RANGE = { min: 1, max: 100 } as const;

export function formValuesFrom(p: { name: string; details: string | null; active: boolean; criteria: PartnerCriteria }): PartnerFormValues {
  const c = p.criteria;
  return {
    name: p.name,
    details: p.details ?? "",
    active: p.active,
    works: [...c.works],
    incomeCategories: [...c.incomeCategories],
    housingTypes: [...c.housingTypes],
    occupancies: [...c.occupancies],
    currentHeating: [...c.currentHeating],
    heatEmitters: [...c.heatEmitters],
    minHeatedArea: c.minHeatedArea === null ? "" : String(c.minHeatedArea),
    minBuildingAge: c.minBuildingAge === null ? "" : String(c.minBuildingAge),
    departements: c.departements.join(", "),
  };
}

const oneLine = (v: FormDataEntryValue | null) => String(v ?? "").trim().replace(/\s+/g, " ");

/** Valeurs telles que saisies (sans validation). */
export function rawFormValues(f: FormData): PartnerFormValues {
  const multi = Object.fromEntries(MULTI_FIELDS.map((k) => [k, [...new Set(f.getAll(k).map(String))]])) as Record<MultiField, string[]>;
  return {
    name: oneLine(f.get("name")),
    details: oneLine(f.get("details")),
    active: f.get("active") === "on",
    ...multi,
    minHeatedArea: oneLine(f.get("minHeatedArea")),
    minBuildingAge: oneLine(f.get("minBuildingAge")),
    departements: oneLine(f.get("departements")),
  };
}

/** Départements métropolitains (01 à 95, 2A et 2B) et d'outre-mer (971 à 978). */
const DEPARTEMENT_RE = /^(0[1-9]|1\d|2[1-9AB]|[3-8]\d|9[0-5]|97[1-8])$/;

/** Lit une liste de codes de départements (« 59, 62 2a ; 1 ») : codes normalisés, et codes non reconnus. */
export function parseDepartements(text: string): { codes: string[]; invalid: string[] } {
  const codes: string[] = [];
  const invalid: string[] = [];
  for (const token of text.split(/[\s,;]+/).filter(Boolean)) {
    const code = /^\d$/.test(token) ? `0${token}` : token.toUpperCase();
    if (!DEPARTEMENT_RE.test(code)) invalid.push(token);
    else if (!codes.includes(code)) codes.push(code);
  }
  return { codes, invalid };
}

function wholeNumber(text: string, range: { min: number; max: number }): number | null | undefined {
  if (text === "") return null;
  if (!/^\d+$/.test(text)) return undefined;
  const n = Number(text);
  return n >= range.min && n <= range.max ? n : undefined;
}

export interface ParsedPartner {
  name: string;
  details: string | null;
  active: boolean;
  criteria: PartnerCriteria;
}

export type PartnerFormResult = { ok: true; data: ParsedPartner; values: PartnerFormValues } | { ok: false; error: string; values: PartnerFormValues };

export function parsePartnerForm(f: FormData): PartnerFormResult {
  const values = rawFormValues(f);
  const fail = (error: string): PartnerFormResult => ({ ok: false, error, values });

  if (values.name.length < 2) return fail("Indiquez la dénomination de l'entreprise.");
  if (values.name.length > NAME_MAX) return fail(`Dénomination trop longue (${NAME_MAX} caractères au plus).`);
  if (values.details.length > DETAILS_MAX) return fail(`Précisions trop longues (${DETAILS_MAX} caractères au plus).`);

  const minHeatedArea = wholeNumber(values.minHeatedArea, AREA_RANGE);
  if (minHeatedArea === undefined) return fail(`Surface chauffée minimale : indiquez un nombre entier de m² entre ${AREA_RANGE.min} et ${AREA_RANGE.max}, ou laissez vide.`);
  const minBuildingAge = wholeNumber(values.minBuildingAge, AGE_RANGE);
  if (minBuildingAge === undefined) return fail(`Ancienneté minimale : indiquez un nombre d'années entre ${AGE_RANGE.min} et ${AGE_RANGE.max}, ou laissez vide.`);

  const departements = parseDepartements(values.departements);
  if (departements.invalid.length) {
    return fail(`Département${departements.invalid.length > 1 ? "s" : ""} non reconnu${departements.invalid.length > 1 ? "s" : ""} : ${departements.invalid.join(", ")}. Indiquez des numéros, par exemple 59, 62, 2A ou 971.`);
  }

  const parsed = partnerCriteriaSchema.safeParse({
    works: values.works,
    incomeCategories: values.incomeCategories,
    housingTypes: values.housingTypes,
    occupancies: values.occupancies,
    currentHeating: values.currentHeating,
    heatEmitters: values.heatEmitters,
    minHeatedArea,
    minBuildingAge,
    departements: departements.codes,
  });
  if (!parsed.success) return fail("Critère invalide : rechargez la page puis recommencez.");

  const data: ParsedPartner = { name: values.name, details: values.details || null, active: values.active, criteria: parsed.data };
  return { ok: true, data, values: formValuesFrom(data) };
}
