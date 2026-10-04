import { z } from "zod";
import type { IncomeCeilingTable } from "./income";
import { WORK_ITEMS } from "./works";
import type { WorkItem } from "./types";

/**
 * Schéma des barèmes et paramètres versionnés.
 *
 * La logique d'évaluation est dans le code (version `ENGINE_VERSION`) ; les seuils,
 * listes de travaux, périodes de validité et sources sont des données versionnées,
 * modifiables depuis l'administration via un brouillon → prévisualisation → publication.
 */

const isoDate = z.iso.date();
const workItemEnum = z.enum(Object.keys(WORK_ITEMS) as [WorkItem, ...WorkItem[]]);
const occupancyEnum = z.enum(["PROPRIETAIRE_OCCUPANT", "PROPRIETAIRE_BAILLEUR", "LOCATAIRE", "AUTRE"]);
const incomeCategoryEnum = z.enum(["TRES_MODESTE", "MODESTE", "INTERMEDIAIRE", "SUPERIEUR"]);
const territoryEnum = z.enum(["IDF", "METRO", "DROM"]);
const heatingEnum = z.enum([
  "CHAUDIERE_GAZ",
  "CHAUDIERE_FIOUL",
  "CHAUDIERE_CHARBON",
  "ELECTRIQUE",
  "BOIS",
  "PAC",
  "RESEAU_CHALEUR",
  "AUTRE",
  "INCONNU",
]);
const dpeEnum = z.enum(["A", "B", "C", "D", "E", "F", "G"]);

export const sourceSchema = z.object({
  label: z.string().min(3).max(300),
  url: z.url({ protocol: /^https$/ }),
});

export const verificationSchema = z.object({
  /**
   * VERIFIED : règles confirmées sur source officielle.
   * PARTIAL : principales règles confirmées, certains points à vérifier (listés).
   * UNVERIFIED : non vérifiable → la conclusion du dispositif est désactivée.
   */
  status: z.enum(["VERIFIED", "PARTIAL", "UNVERIFIED"]),
  verifiedAt: isoDate,
  method: z.string().min(3).max(1000),
  notes: z.string().max(4000).optional(),
});

const triple = z.tuple([z.number().int().positive(), z.number().int().positive(), z.number().int().positive()]);

export const incomeTableSchema = z
  .object({
    bySize: z.tuple([triple, triple, triple, triple, triple]),
    extraPerson: triple,
  })
  .superRefine((table, ctx) => {
    table.bySize.forEach((t, i) => {
      if (!(t[0] < t[1] && t[1] < t[2])) {
        ctx.addIssue({ code: "custom", message: `Plafonds non croissants pour ${i + 1} personne(s)`, path: ["bySize", i] });
      }
      const prev = i > 0 ? table.bySize[i - 1] : undefined;
      if (prev && !(t[0] > prev[0] && t[1] > prev[1] && t[2] > prev[2])) {
        ctx.addIssue({ code: "custom", message: `Plafonds non croissants avec la taille du ménage (${i + 1} pers.)`, path: ["bySize", i] });
      }
    });
  });

const dispositifCommon = {
  enabled: z.boolean(),
  /** OPEN : dépôt possible ; SUSPENDED : guichet fermé ; UNKNOWN : statut non confirmé. */
  availability: z.enum(["OPEN", "SUSPENDED", "UNKNOWN"]),
  availabilityNote: z.string().max(1000).optional(),
  verification: verificationSchema,
  sources: z.array(sourceSchema).min(1),
  validFrom: isoDate,
  validUntil: isoDate.nullable(),
  territories: z.array(territoryEnum).min(1),
  minAgeYears: z.number().int().min(0).max(100),
  eligibleOccupancies: z.array(occupancyEnum),
  /** Statuts pour lesquels l'éligibilité dépend de cas particuliers (→ à vérifier). */
  reviewOccupancies: z.array(occupancyEnum),
  requiresPrincipalResidence: z.boolean(),
  eligibleWorks: z.array(workItemEnum),
  /** Travaux explicitement non couverts, avec la raison affichée. */
  excludedWorks: z.array(z.object({ item: workItemEnum, reason: z.string().min(3).max(500) })),
  /** Travaux dont la prise en charge n'a pas pu être confirmée → « à vérifier ». */
  reviewWorks: z.array(z.object({ item: workItemEnum, reason: z.string().min(3).max(500) })),
  requiresRge: z.boolean(),
  worksMustNotHaveStarted: z.boolean(),
  /**
   * Exception documentée au principe « travaux non commencés » (ex. panne de chauffage) :
   * si renseignée, des travaux déjà commencés donnent « à vérifier » au lieu de « non rempli ».
   */
  worksStartedExceptionNote: z.string().min(3).max(600).nullable(),
  quoteMustNotBeSigned: z.boolean(),
  /**
   * Délai (jours) pendant lequel une demande reste possible après la signature du devis
   * (ex. offre CEE formalisée au plus tard 14 jours après l'engagement, avant le début des travaux).
   */
  quoteSignedGraceDays: z.number().int().min(1).max(90).nullable(),
  /** Conditions toujours rappelées (non évaluables par le questionnaire). */
  conditionsToVerify: z.array(z.string().min(3).max(500)),
  /** Conditions propres à un statut d'occupation (ex. engagement de location du bailleur). */
  occupancyNotes: z.partialRecord(occupancyEnum, z.string().min(3).max(500)),
  /** Informations générales sur la nature de l'aide (sans montant). */
  notes: z.array(z.string().min(3).max(500)),
};

export const mprGesteSchema = z.object({
  ...dispositifCommon,
  eligibleIncomeCategories: z.array(incomeCategoryEnum),
  /** Exceptions d'ancienneté (ex. remplacement d'une chaudière fioul). */
  ageExceptions: z.array(
    z.object({
      minAgeYears: z.number().int().min(0).max(100),
      currentHeating: z.array(heatingEnum).min(1),
      works: z.array(workItemEnum).min(1),
      label: z.string().min(3).max(300),
    }),
  ),
  /** Restrictions liées au DPE pour certains travaux. */
  dpeRestrictions: z.array(
    z.object({
      works: z.array(workItemEnum).min(1),
      excludedDpe: z.array(dpeEnum).min(1),
      reason: z.string().min(3).max(500),
    }),
  ),
});

export const mprAmpleurSchema = z.object({
  ...dispositifCommon,
  eligibleIncomeCategories: z.array(incomeCategoryEnum),
  eligibleDpe: z.array(dpeEnum).min(1),
  housingTypes: z.array(z.enum(["MAISON", "APPARTEMENT"])).min(1),
});

export const ceeSchema = z.object({
  ...dispositifCommon,
  /** Traitement des résidences secondaires : éligibles, à vérifier ou non éligibles. */
  secondaryResidence: z.enum(["ELIGIBLE", "REVIEW", "NOT_ELIGIBLE"]),
  coupDePouceChauffage: z.object({
    enabled: z.boolean(),
    validUntil: isoDate.nullable(),
    requiresPrincipalResidence: z.boolean(),
    replacedHeating: z.array(heatingEnum),
    /** Si la chaudière gaz remplacée doit ne pas être à condensation. */
    gasBoilerMustBeNonCondensing: z.boolean(),
    eligibleTargets: z.array(workItemEnum),
    note: z.string().max(1000).optional(),
    sources: z.array(sourceSchema),
  }),
});

export const ecoPtzSchema = z.object({
  ...dispositifCommon,
});

export const ruleSetDataSchema = z.object({
  meta: z.object({
    label: z.string().min(3).max(200),
    /** Résumé des changements par rapport à la version précédente. */
    changelog: z.string().max(4000),
  }),
  incomeCeilings: z.object({
    year: z.number().int().min(2020).max(2100),
    validFrom: isoDate,
    validUntil: isoDate.nullable(),
    IDF: incomeTableSchema,
    HORS_IDF: incomeTableSchema,
    rfrNote: z.string().min(3).max(1000),
    verification: verificationSchema,
    sources: z.array(sourceSchema).min(1),
  }),
  dispositifs: z.object({
    MPR_GESTE: mprGesteSchema,
    MPR_AMPLEUR: mprAmpleurSchema,
    CEE: ceeSchema,
    ECO_PTZ: ecoPtzSchema,
  }),
  /** Informations générales affichées avec chaque résultat. */
  notices: z.array(z.string().min(3).max(1000)),
});

export type RuleSetData = z.infer<typeof ruleSetDataSchema>;
export type MprGesteRules = z.infer<typeof mprGesteSchema>;
export type MprAmpleurRules = z.infer<typeof mprAmpleurSchema>;
export type CeeRules = z.infer<typeof ceeSchema>;
export type EcoPtzRules = z.infer<typeof ecoPtzSchema>;
export type DispositifCommonRules = z.infer<typeof ecoPtzSchema>;

/** Jeu de règles prêt à l'emploi par le moteur. */
export interface RuleSet {
  version: string;
  data: RuleSetData;
}

export function incomeTable(rules: RuleSetData, zone: "IDF" | "HORS_IDF"): IncomeCeilingTable {
  return rules.incomeCeilings[zone] as IncomeCeilingTable;
}

export function validateRuleSetData(input: unknown):
  | { ok: true; data: RuleSetData }
  | { ok: false; errors: string[] } {
  const parsed = ruleSetDataSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`),
  };
}
