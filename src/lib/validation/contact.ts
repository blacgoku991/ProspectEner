import { z } from "zod";

/**
 * Validation des coordonnées (partagée navigateur / serveur). Le serveur revalide toujours.
 */

/** Normalise un numéro français (y compris outre-mer) au format national à 10 chiffres. */
export function normalizeFrenchPhone(input: string): string | null {
  const compact = input.replace(/[\s.\-()/]/g, "");
  let national: string | null = null;
  const intl = /^(?:\+|00)(33|262|269|508|590|594|596|687|689)(\d{9})$/.exec(compact);
  if (intl) national = `0${intl[2]}`;
  else if (/^0\d{9}$/.test(compact)) national = compact;
  if (!national) return null;
  // Numéros géographiques (01-05), mobiles (06-07) et non géographiques (09). Les 08 (services) sont refusés.
  if (!/^0[1-79]\d{8}$/.test(national)) return null;
  return national;
}

export function formatFrenchPhone(national: string): string {
  return national.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

export function maskPhone(national: string): string {
  return `${national.slice(0, 2)} •• •• •• ${national.slice(-2)}`;
}

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}•••@${domain.slice(0, 1)}•••${domain.includes(".") ? domain.slice(domain.lastIndexOf(".")) : ""}`;
}

const NAME_RE = /^[\p{L}][\p{L}\p{M}'’ .-]*$/u;

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Ce champ est requis.")
  .max(80, "80 caractères maximum.")
  .regex(NAME_RE, "Utilisez uniquement des lettres, espaces, tirets ou apostrophes.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(160, "Adresse trop longue.")
  .pipe(z.email("Adresse e-mail invalide."));

export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .transform((v, ctx) => {
    const n = normalizeFrenchPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Numéro de téléphone français invalide (ex. 06 12 34 56 78)." });
      return z.NEVER;
    }
    return n;
  });

/** Supprime les caractères de contrôle d'un texte libre. */
export function cleanFreeText(v: string): string {
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

export const AVAILABILITY_DAYS = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"] as const;
export const AVAILABILITY_SLOTS = ["MATIN", "MIDI", "APRES_MIDI", "SOIR"] as const;

export const DAY_LABELS: Record<(typeof AVAILABILITY_DAYS)[number], string> = {
  LUNDI: "Lundi",
  MARDI: "Mardi",
  MERCREDI: "Mercredi",
  JEUDI: "Jeudi",
  VENDREDI: "Vendredi",
  SAMEDI: "Samedi",
};

export const SLOT_LABELS: Record<(typeof AVAILABILITY_SLOTS)[number], string> = {
  MATIN: "Matin (10h-12h)",
  MIDI: "Midi (12h-13h)",
  APRES_MIDI: "Après-midi (14h-17h)",
  SOIR: "Fin de journée (17h-20h)",
};

export const availabilitySchema = z
  .object({
    days: z.array(z.enum(AVAILABILITY_DAYS)).max(6).default([]),
    slots: z.array(z.enum(AVAILABILITY_SLOTS)).max(4).default([]),
  })
  .strict();

export const contactSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    channel: z.enum(["PHONE", "EMAIL"]),
    email: z.union([z.literal(""), emailSchema]).optional(),
    phone: z.union([z.literal(""), phoneSchema]).optional(),
    availability: availabilitySchema.optional(),
    comment: z.string().max(1000, "1 000 caractères maximum.").transform(cleanFreeText).optional(),
    /** Case de confirmation de la demande explicite (jamais pré-cochée). */
    confirmRequest: z.literal(true, { error: "Merci de confirmer votre demande de contact." }),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.channel === "EMAIL" && !v.email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "L'adresse e-mail est nécessaire pour une réponse par e-mail." });
    }
    if (v.channel === "PHONE" && !v.phone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Le numéro est nécessaire pour être rappelé(e)." });
    }
  });

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;
