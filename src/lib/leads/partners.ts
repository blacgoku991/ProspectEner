import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { HYDRAULIC_EMITTERS } from "@/engine/questionnaire";
import type { CurrentHeating, HeatEmitter, HousingType, IncomeCategory, Occupancy, WorkItem } from "@/engine/types";
import { WORK_ITEMS } from "@/engine/works";
import { INCOME_PROFILE, type LeadProfile, leadLabels } from "./profile";

/**
 * Critères des demandes qui intéressent une entreprise partenaire (mise en relation).
 * Une liste vide = aucun filtre sur ce critère. Ces critères servent à choisir l'entreprise nommée
 * dans la phrase de la demande, avant l'envoi, et à trier les demandes dans l'administration :
 * ils ne modifient jamais le résultat affiché au visiteur.
 */

const workItemEnum = z.enum(Object.keys(WORK_ITEMS) as [WorkItem, ...WorkItem[]]);
const incomeEnum = z.enum(["TRES_MODESTE", "MODESTE", "INTERMEDIAIRE", "SUPERIEUR"]);
const housingEnum = z.enum(["MAISON", "APPARTEMENT"]);
const occupancyEnum = z.enum(["PROPRIETAIRE_OCCUPANT", "PROPRIETAIRE_BAILLEUR", "LOCATAIRE", "AUTRE"]);
const heatingEnum = z.enum(["CHAUDIERE_GAZ", "CHAUDIERE_FIOUL", "CHAUDIERE_CHARBON", "ELECTRIQUE", "BOIS", "PAC", "RESEAU_CHALEUR", "AUTRE"]);
const emitterEnum = z.enum(["RADIATEURS_FONTE", "RADIATEURS_ACIER_ALU", "PLANCHER_CHAUFFANT_EAU", "RADIATEURS_ELECTRIQUES", "POELE_CHEMINEE", "AUTRE"]);
const departementRe = /^(\d{2,3}|2[AB])$/;

export const partnerCriteriaSchema = z
  .object({
    works: z.array(workItemEnum).max(40).default([]),
    incomeCategories: z.array(incomeEnum).max(4).default([]),
    housingTypes: z.array(housingEnum).max(2).default([]),
    occupancies: z.array(occupancyEnum).max(4).default([]),
    currentHeating: z.array(heatingEnum).max(8).default([]),
    heatEmitters: z.array(emitterEnum).max(6).default([]),
    minHeatedArea: z.number().int().min(1).max(1000).nullable().default(null),
    /** Ancienneté minimale du logement, en années. */
    minBuildingAge: z.number().int().min(1).max(100).nullable().default(null),
    departements: z.array(z.string().regex(departementRe)).max(110).default([]),
  })
  .strict();

export type PartnerCriteria = z.output<typeof partnerCriteriaSchema>;

/** Critères enregistrés en base (JSON) : relus avec les valeurs par défaut, jamais de plantage. */
export function parsePartnerCriteria(raw: unknown): PartnerCriteria {
  const parsed = partnerCriteriaSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : partnerCriteriaSchema.parse({});
}

/** Critères proposés pour une entreprise de pompes à chaleur air/eau (chauffage central à eau). */
export const HYDRAULIC_HEAT_PUMP_PRESET: PartnerCriteria = {
  works: ["PAC_AIR_EAU", "CHAUFFE_EAU_THERMODYNAMIQUE"],
  incomeCategories: ["TRES_MODESTE", "MODESTE"],
  housingTypes: ["MAISON"],
  occupancies: [],
  currentHeating: ["CHAUDIERE_GAZ", "CHAUDIERE_FIOUL", "BOIS"],
  heatEmitters: ["RADIATEURS_FONTE", "RADIATEURS_ACIER_ALU"],
  minHeatedArea: 80,
  minBuildingAge: 2,
  departements: [],
};

/**
 * Travaux « à préciser » d'une même famille : une demande « pompe à chaleur (type à préciser) »
 * peut intéresser une entreprise de PAC air/eau, à vérifier avec la personne.
 */
function undeterminedSiblings(works: WorkItem[]): WorkItem[] {
  const out = new Set<WorkItem>();
  for (const w of works) {
    const category = WORK_ITEMS[w].category;
    for (const [item, info] of Object.entries(WORK_ITEMS) as [WorkItem, (typeof WORK_ITEMS)[WorkItem]][]) {
      if (info.undetermined && info.category === category && !works.includes(item)) out.add(item);
    }
  }
  return [...out];
}

export type CheckStatus = "OK" | "UNKNOWN" | "KO";
export type MatchStatus = "MATCH" | "TO_CHECK" | "NO";

export interface CriterionCheck {
  label: string;
  status: CheckStatus;
  /** Valeur de la demande, en clair. */
  value: string;
  /** Ce que recherche l'entreprise, en clair. */
  expected: string;
}

export interface PartnerMatch {
  status: MatchStatus;
  checks: CriterionCheck[];
}

const list = (values: string[]) => values.join(", ");
const UNKNOWN = "Non renseigné";

/**
 * Correspondance d'une demande avec les critères d'une entreprise.
 * MATCH : tous les critères sont remplis ; TO_CHECK : aucun n'est contredit mais certains sont
 * inconnus ; NO : au moins un critère n'est pas rempli.
 */
export function matchPartner(profile: LeadProfile, criteria: PartnerCriteria, referenceYear: number): PartnerMatch {
  const checks: CriterionCheck[] = [];

  if (criteria.works.length) {
    const direct = profile.workItems.filter((w) => criteria.works.includes(w));
    const maybe = profile.workItems.filter((w) => undeterminedSiblings(criteria.works).includes(w));
    checks.push({
      label: "Travaux",
      status: direct.length ? "OK" : maybe.length ? "UNKNOWN" : "KO",
      value: profile.workItems.length ? list(profile.workItems.map((w) => WORK_ITEMS[w].label)) : UNKNOWN,
      expected: list(criteria.works.map((w) => WORK_ITEMS[w].label)),
    });
  }

  const inList = <T extends string>(label: string, value: T | null, wanted: T[], show: (v: T) => string) => {
    if (!wanted.length) return;
    checks.push({
      label,
      status: value === null ? "UNKNOWN" : wanted.includes(value) ? "OK" : "KO",
      value: value === null ? UNKNOWN : show(value),
      expected: list(wanted.map(show)),
    });
  };
  inList<IncomeCategory>("Revenus", profile.incomeCategory, criteria.incomeCategories, (v) => INCOME_PROFILE[v].label);
  inList<HousingType>("Logement", profile.housingType, criteria.housingTypes, (v) => leadLabels.housingType(v) ?? v);
  inList<Occupancy>("Statut", profile.occupancy, criteria.occupancies, (v) => leadLabels.occupancy(v) ?? v);
  inList<CurrentHeating>("Chauffage actuel", profile.currentHeating, criteria.currentHeating, (v) => leadLabels.currentHeating(v) ?? v);
  inList<HeatEmitter>("Diffusion de la chaleur", profile.heatEmitters, criteria.heatEmitters, (v) => leadLabels.heatEmitters(v) ?? v);

  if (criteria.minHeatedArea !== null) {
    checks.push({
      label: "Surface chauffée",
      status: profile.heatedArea === null ? "UNKNOWN" : profile.heatedArea >= criteria.minHeatedArea ? "OK" : "KO",
      value: profile.heatedArea === null ? UNKNOWN : `${profile.heatedArea} m²`,
      expected: `${criteria.minHeatedArea} m² ou plus`,
    });
  }

  if (criteria.minBuildingAge !== null) {
    const latest = referenceYear - criteria.minBuildingAge;
    const { constructionYearMin: min, constructionYearMax: max } = profile;
    checks.push({
      label: "Ancienneté du logement",
      status: max !== null && max <= latest ? "OK" : min !== null && min > latest ? "KO" : "UNKNOWN",
      value: leadLabels.construction(min, max) ?? UNKNOWN,
      expected: `Achevé en ${latest} ou avant (plus de ${criteria.minBuildingAge} an${criteria.minBuildingAge > 1 ? "s" : ""})`,
    });
  }

  if (criteria.departements.length) {
    checks.push({
      label: "Département",
      status: profile.departement === null ? "UNKNOWN" : criteria.departements.includes(profile.departement) ? "OK" : "KO",
      value: profile.departement ?? UNKNOWN,
      expected: list(criteria.departements),
    });
  }

  const status: MatchStatus = checks.some((c) => c.status === "KO") ? "NO" : checks.some((c) => c.status === "UNKNOWN") ? "TO_CHECK" : "MATCH";
  return { status, checks };
}

/** Entreprise partenaire active proposée au visiteur (configuration publique : aucun autre champ). */
export interface RequestPartnerCandidate {
  id: string;
  /** Nom affiché dans la phrase de la demande (dénomination, puis précisions). */
  displayName: string;
  criteria: PartnerCriteria;
}

const SELECTION_ORDER: Record<Exclude<MatchStatus, "NO">, number> = { MATCH: 0, TO_CHECK: 1 };

/**
 * Entreprise nommée dans la phrase de la demande, avant l'envoi : celle dont tous les critères sont
 * remplis, sinon celle dont aucun critère n'est contredit (réponse inconnue) ; à égalité, la
 * première par ordre alphabétique. Jamais une entreprise dont un critère n'est pas rempli.
 * Fonction pure, exécutée à l'identique dans le navigateur (les réponses n'en sortent qu'à
 * l'envoi) et sur le serveur, qui refuse l'envoi si l'entreprise affichée n'est plus la bonne.
 */
export function selectPartnerForRequest(
  profile: LeadProfile,
  partners: readonly RequestPartnerCandidate[],
  referenceYear: number,
): { id: string; displayName: string } | null {
  let best: { id: string; displayName: string; rank: number } | null = null;
  for (const p of partners) {
    const status = matchPartner(profile, p.criteria, referenceYear).status;
    if (status === "NO") continue;
    const rank = SELECTION_ORDER[status];
    if (!best || rank < best.rank || (rank === best.rank && p.displayName.localeCompare(best.displayName, "fr") < 0)) {
      best = { id: p.id, displayName: p.displayName, rank };
    }
  }
  return best ? { id: best.id, displayName: best.displayName } : null;
}

/**
 * Année de référence des critères d'ancienneté pour une demande issue du test : celle de la date
 * de la simulation (heure de Paris, contrôlée par le serveur), identique dans le navigateur et
 * sur le serveur, y compris autour du 1er janvier.
 */
export function referenceYearOf(referenceDate: string): number {
  return Number(referenceDate.slice(0, 4));
}

/**
 * Filtre Prisma équivalent à `matchPartner(...).status !== "NO"` : demandes qui correspondent,
 * ou dont la correspondance reste à vérifier (réponse inconnue).
 */
export function partnerWhere(criteria: PartnerCriteria, referenceYear: number): Prisma.ContactRequestWhereInput {
  const and: Prisma.ContactRequestWhereInput[] = [];
  const inOrNull = (field: "incomeCategory" | "housingType" | "occupancy" | "currentHeating" | "heatEmitters" | "departement", values: string[]) => {
    if (values.length) and.push({ OR: [{ [field]: { in: values } }, { [field]: null }] });
  };
  if (criteria.works.length) and.push({ workItems: { hasSome: [...criteria.works, ...undeterminedSiblings(criteria.works)] } });
  inOrNull("incomeCategory", criteria.incomeCategories);
  inOrNull("housingType", criteria.housingTypes);
  inOrNull("occupancy", criteria.occupancies);
  inOrNull("currentHeating", criteria.currentHeating);
  inOrNull("heatEmitters", criteria.heatEmitters);
  inOrNull("departement", criteria.departements);
  if (criteria.minHeatedArea !== null) and.push({ OR: [{ heatedArea: { gte: criteria.minHeatedArea } }, { heatedArea: null }] });
  if (criteria.minBuildingAge !== null) {
    and.push({ OR: [{ constructionYearMin: null }, { constructionYearMin: { lte: referenceYear - criteria.minBuildingAge } }] });
  }
  return and.length ? { AND: and } : {};
}

/** Résumé lisible des critères (liste des partenaires, export). */
export function describeCriteria(criteria: PartnerCriteria): string[] {
  const lines: string[] = [];
  if (criteria.works.length) lines.push(`Travaux : ${list(criteria.works.map((w) => WORK_ITEMS[w].label))}`);
  if (criteria.incomeCategories.length) lines.push(`Revenus : ${list(criteria.incomeCategories.map((c) => INCOME_PROFILE[c].short))}`);
  if (criteria.housingTypes.length) lines.push(`Logement : ${list(criteria.housingTypes.map((h) => leadLabels.housingType(h) ?? h))}`);
  if (criteria.occupancies.length) lines.push(`Statut : ${list(criteria.occupancies.map((o) => leadLabels.occupancy(o) ?? o))}`);
  if (criteria.currentHeating.length) lines.push(`Chauffage actuel : ${list(criteria.currentHeating.map((h) => leadLabels.currentHeating(h) ?? h))}`);
  if (criteria.heatEmitters.length) lines.push(`Émetteurs : ${list(criteria.heatEmitters.map((e) => leadLabels.heatEmitters(e) ?? e))}`);
  if (criteria.minHeatedArea !== null) lines.push(`Surface chauffée : ${criteria.minHeatedArea} m² ou plus`);
  if (criteria.minBuildingAge !== null) lines.push(`Logement de plus de ${criteria.minBuildingAge} an${criteria.minBuildingAge > 1 ? "s" : ""}`);
  if (criteria.departements.length) lines.push(`Départements : ${list(criteria.departements)}`);
  return lines.length ? lines : ["Toutes les demandes"];
}

/** Émetteurs à eau (pour l'affichage d'un repère « chauffage central à eau »). */
export function isHydraulic(emitter: HeatEmitter | null): boolean {
  return emitter !== null && HYDRAULIC_EMITTERS.includes(emitter);
}
