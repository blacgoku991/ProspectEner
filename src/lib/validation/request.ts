import { z } from "zod";
import { MAX_HOUSEHOLD_SIZE } from "@/engine/income";
import { WORK_ITEMS } from "@/engine/works";
import type { WorkItem } from "@/engine/types";
import { contactSchema } from "./contact";

/**
 * Schémas des données envoyées par le navigateur. Tout champ inconnu est refusé (`strict`)
 * et chaque valeur est bornée : protection contre les injections et les abus.
 */

const workItem = z.enum(Object.keys(WORK_ITEMS) as [WorkItem, ...WorkItem[]]);
const yesNoUnknown = z.enum(["OUI", "NON", "INCONNU"]);
const currentYear = new Date().getFullYear();

export const constructionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("YEAR"), year: z.number().int().min(1000).max(currentYear + 1) }).strict(),
  z
    .object({
      kind: z.literal("PERIOD"),
      from: z.number().int().min(1000).max(currentYear + 1).nullable(),
      to: z.number().int().min(1000).max(currentYear + 1).nullable(),
    })
    .strict(),
  z.object({ kind: z.literal("UNKNOWN") }).strict(),
]);

export const answersSchema = z
  .object({
    postalCode: z.string().regex(/^\d{5}$/, "Code postal invalide (5 chiffres)."),
    communeInsee: z.string().regex(/^(\d{5}|2[AB]\d{3})$/).optional(),
    communeName: z.string().trim().min(1).max(100).optional(),
    departement: z.string().regex(/^(\d{2,3}|2[AB])$/).optional(),
    housingType: z.enum(["MAISON", "APPARTEMENT"]).optional(),
    occupancy: z.enum(["PROPRIETAIRE_OCCUPANT", "PROPRIETAIRE_BAILLEUR", "LOCATAIRE", "AUTRE"]).optional(),
    residence: z.enum(["PRINCIPALE", "SECONDAIRE", "AUTRE"]).optional(),
    construction: constructionSchema.optional(),
    works: z
      .array(z.enum(["ISOLATION", "CHAUFFAGE", "PAC", "EAU_CHAUDE", "VENTILATION", "RENOVATION_GLOBALE", "AUTRE"]))
      .min(1)
      .max(7)
      .optional(),
    insulationItems: z.array(workItem).max(5).optional(),
    heatPumpType: workItem.optional(),
    heatingTarget: workItem.optional(),
    hotWaterTarget: workItem.optional(),
    ventilationTarget: workItem.optional(),
    currentHeating: z
      .enum(["CHAUDIERE_GAZ", "CHAUDIERE_FIOUL", "CHAUDIERE_CHARBON", "ELECTRIQUE", "BOIS", "PAC", "RESEAU_CHALEUR", "AUTRE", "INCONNU"])
      .optional(),
    gasBoilerCondensing: yesNoUnknown.optional(),
    dpe: z.enum(["A", "B", "C", "D", "E", "F", "G", "INCONNU"]).optional(),
    quoteSigned: yesNoUnknown.optional(),
    quoteSignedRecency: z.enum(["RECENT", "OLD", "INCONNU"]).optional(),
    worksStarted: yesNoUnknown.optional(),
    priorAidStatus: yesNoUnknown.optional(),
    priorAids: z.array(z.enum(["MAPRIMERENOV", "CEE", "ECO_PTZ", "AUTRE"])).max(4).optional(),
    contractor: z.enum(["NON_CHOISIE", "RGE", "NON_RGE", "RGE_INCONNU"]).optional(),
    householdSize: z.number().int().min(1).max(MAX_HOUSEHOLD_SIZE).optional(),
    income: z.enum(["TRES_MODESTE", "MODESTE", "INTERMEDIAIRE", "SUPERIEUR", "INCONNU"]).optional(),
  })
  .strict();

/** Demande de rappel rapide : uniquement la localisation et le type de projet. */
export const quickAnswersSchema = z
  .object({
    postalCode: z.string().regex(/^\d{5}$/, "Code postal invalide (5 chiffres)."),
    communeInsee: z.string().regex(/^(\d{5}|2[AB]\d{3})$/).optional(),
    communeName: z.string().trim().min(1).max(100).optional(),
    works: z
      .array(z.enum(["ISOLATION", "CHAUFFAGE", "PAC", "EAU_CHAUDE", "VENTILATION", "RENOVATION_GLOBALE", "AUTRE"]))
      .min(1, "Choisissez au moins un type de projet.")
      .max(7),
  })
  .strict();

const utmValue = z
  .string()
  .max(64)
  .regex(/^[\w.\-+]{1,64}$/, "Paramètre de campagne invalide")
  // Refus de toute donnée personnelle dans les paramètres de campagne (e-mail, téléphone).
  .refine((v) => !/@/.test(v) && !/\d{8,}/.test(v), "Donnée personnelle interdite dans les paramètres de campagne");

export const acquisitionSchema = z
  .object({
    utmSource: utmValue.optional(),
    utmMedium: utmValue.optional(),
    utmCampaign: utmValue.optional(),
    landingPath: z.string().max(200).regex(/^\/[\w\-/]*$/).optional(),
    referrerHost: z.string().max(200).regex(/^[a-z0-9.-]+$/i).optional(),
  })
  .strict();

const common = {
  idempotencyKey: z.uuid(),
  contact: contactSchema,
  noticeHash: z.string().regex(/^[a-f0-9]{64}$/),
  acquisition: acquisitionSchema.optional(),
  /** Champ piège invisible : doit rester vide. */
  website: z.string().max(200).optional(),
  /** Durée de remplissage mesurée par le navigateur (ms) : détection des envois automatisés trop rapides. */
  formElapsedMs: z.number().int().min(0).max(7 * 24 * 3600 * 1000),
  turnstileToken: z.string().max(4096).optional(),
};

export const simulationRequestSchema = z
  .object({
    kind: z.literal("SIMULATION"),
    answers: answersSchema,
    ruleSetVersion: z.string().min(1).max(40),
    referenceDate: z.iso.date(),
    ...common,
  })
  .strict();

export const quickRequestSchema = z
  .object({
    kind: z.literal("QUICK_CALLBACK"),
    answers: quickAnswersSchema,
    ...common,
  })
  .strict();

export const requestPayloadSchema = z.discriminatedUnion("kind", [simulationRequestSchema, quickRequestSchema]);

export type RequestPayload = z.input<typeof requestPayloadSchema>;
export type ParsedRequestPayload = z.output<typeof requestPayloadSchema>;

export const cancelPayloadSchema = z
  .object({
    reference: z.string().regex(/^PE-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/),
    token: z.string().regex(/^[\w-]{20,100}$/),
    deleteData: z.boolean().default(false),
    oppose: z.boolean().default(false),
  })
  .strict();
