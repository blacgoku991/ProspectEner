import { z } from "zod";
import type { OverallOutcome } from "@/engine/types";

/**
 * Paramètres configurables depuis l'administration. Valeurs par défaut volontairement vides :
 * aucune identité, aucun SIRET ni mention n'est inventé. Tant que l'identité minimale n'est
 * pas renseignée, le formulaire de contact public reste fermé.
 */

const text = (max: number) => z.string().trim().max(max).default("");

export const ACTIVITY_KINDS = ["ACCOMPAGNEMENT", "TRAVAUX", "MISE_EN_RELATION"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  ACCOMPAGNEMENT: "Accompagnement dans le montage du projet",
  TRAVAUX: "Réalisation des travaux",
  MISE_EN_RELATION: "Mise en relation avec des professionnels",
};

export const siteSettingsSchema = z.object({
  company: z
    .object({
      name: text(120),
      legalForm: text(60),
      shareCapital: text(40),
      address: text(300),
      registration: text(160),
      vatNumber: text(40),
      phone: text(30),
      email: z.union([z.literal(""), z.email().max(160)]).default(""),
      publicationDirector: text(120),
      hostName: text(160),
      hostAddress: text(300),
      hostPhone: text(30),
      mediatorName: text(160),
      mediatorWebsite: z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(300)]).default(""),
      mediatorAddress: text(300),
      privacyContact: text(200),
      /** Localisation de l'hébergement et éventuels transferts hors UE (à renseigner par l'éditeur). */
      dataTransfersInfo: text(600),
    })
    .prefault({}),
  activity: z
    .object({
      kinds: z.array(z.enum(ACTIVITY_KINDS)).max(3).default([]),
      description: text(1500),
      qualifications: text(1000),
      interventionArea: text(300),
    })
    .prefault({}),
  contact: z
    .object({
      emailReplyEnabled: z.boolean().default(true),
      phoneCallbackEnabled: z.boolean().default(false),
      /** Confirmation explicite par un administrateur après lecture de l'avertissement juridique. */
      phoneCallbackReviewedAt: z.string().nullable().default(null),
      phoneCallbackReviewedBy: z.string().nullable().default(null),
      callbackDelayBusinessDays: z.number().int().min(1).max(5).default(5),
      alsaceMoselleHolidays: z.boolean().default(false),
      showCompanyPhone: z.boolean().default(true),
      /** Résultats du test pour lesquels une demande de rendez-vous est proposée au visiteur. */
      acceptedOutcomes: z.enum(["ELIGIBLE_OR_REVIEW", "ELIGIBLE_ONLY", "ALL"]).default("ELIGIBLE_OR_REVIEW"),
      /** Demande de rappel sans faire le test (non qualifiée) : désactivée par défaut. */
      quickCallbackEnabled: z.boolean().default(false),
    })
    .prefault({}),
  test: z
    .object({
      /** PROJET : test complet (équipement actuel, travaux souhaités) ; ELIGIBILITE : test d'éligibilité seul, le projet est vu avec un conseiller. */
      mode: z.enum(["ELIGIBILITE", "PROJET"]).default("PROJET"),
    })
    .prefault({}),
  notifications: z
    .object({
      emailRecipients: z.array(z.email().max(160)).max(10).default([]),
      webhookUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ }).max(500)]).default(""),
      notifyOnCancellation: z.boolean().default(true),
    })
    .prefault({}),
  retention: z
    .object({
      /** Demandes : 3 ans à compter de la collecte ou du dernier contact émanant de la personne (CNIL). */
      requestMonths: z.number().int().min(1).max(60).default(36),
      /** Demandes annulées : coordonnées effacées après ce délai. */
      cancelledRequestDays: z.number().int().min(0).max(365).default(30),
      /** Preuve de la demande de rappel : 3 ans (art. R223-4 du Code de la consommation). */
      proofMonths: z.number().int().min(36).max(72).default(36),
      /** Journal de sécurité : 6 mois à 1 an (recommandation CNIL). */
      auditLogMonths: z.number().int().min(6).max(36).default(12),
      /** Liste d'opposition : au moins 3 ans (CNIL). */
      oppositionMonths: z.number().int().min(36).max(120).default(36),
      funnelStatsMonths: z.number().int().min(1).max(25).default(25),
    })
    .prefault({}),
  security: z
    .object({
      requireMfaForCollaborators: z.boolean().default(true),
      collaboratorsSeeUnassigned: z.boolean().default(true),
    })
    .prefault({}),
  acquisition: z
    .object({
      collectCampaignParams: z.boolean().default(true),
    })
    .prefault({}),
  launch: z
    .object({
      /** Relecture humaine des règles sur les sources officielles. */
      rulesReviewedAt: z.string().nullable().default(null),
      rulesReviewedBy: z.string().nullable().default(null),
      /** Validation juridique des mentions et de la politique de confidentialité. */
      legalReviewedAt: z.string().nullable().default(null),
      legalReviewedBy: z.string().nullable().default(null),
    })
    .prefault({}),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const DEFAULT_SETTINGS: SiteSettings = siteSettingsSchema.parse({});

export function parseSettings(raw: unknown): SiteSettings {
  const parsed = siteSettingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

/** Le canal téléphonique n'est proposé qu'après confirmation explicite d'un administrateur. */
export function phoneCallbackAvailable(s: SiteSettings): boolean {
  return s.contact.phoneCallbackEnabled && Boolean(s.contact.phoneCallbackReviewedAt);
}

export function emailReplyAvailable(s: SiteSettings): boolean {
  return s.contact.emailReplyEnabled;
}

/** Identité minimale requise pour ouvrir le formulaire de contact (responsable du traitement). */
export function missingIdentityFields(s: SiteSettings): string[] {
  const missing: string[] = [];
  if (!s.company.name) missing.push("Dénomination de l'entreprise");
  if (!s.company.address) missing.push("Adresse du siège");
  if (!s.company.email && !s.company.privacyContact) missing.push("Adresse de contact pour les données personnelles");
  return missing;
}

export function submissionsOpen(s: SiteSettings): boolean {
  return missingIdentityFields(s).length === 0 && (phoneCallbackAvailable(s) || emailReplyAvailable(s));
}

export type AcceptedOutcomesMode = SiteSettings["contact"]["acceptedOutcomes"];

/** Résultats du test qui ouvrent la demande de rendez-vous, selon le réglage choisi. */
export const ACCEPTED_OUTCOMES: Record<AcceptedOutcomesMode, OverallOutcome[]> = {
  ELIGIBLE_ONLY: ["POTENTIALLY_ELIGIBLE"],
  ELIGIBLE_OR_REVIEW: ["POTENTIALLY_ELIGIBLE", "NEEDS_REVIEW"],
  ALL: ["POTENTIALLY_ELIGIBLE", "NEEDS_REVIEW", "NOT_ELIGIBLE", "OUT_OF_SCOPE"],
};

export const ACCEPTED_OUTCOMES_LABELS: Record<AcceptedOutcomesMode, string> = {
  ELIGIBLE_OR_REVIEW: "Projets potentiellement éligibles et à vérifier (recommandé)",
  ELIGIBLE_ONLY: "Projets potentiellement éligibles uniquement",
  ALL: "Toutes les demandes, même si les critères ne sont pas remplis",
};

export function contactAcceptedFor(s: SiteSettings, outcome: OverallOutcome): boolean {
  return ACCEPTED_OUTCOMES[s.contact.acceptedOutcomes].includes(outcome);
}

/** Demande de rappel sans test : seulement si elle est activée (elle n'est pas qualifiée par le test). */
export function quickCallbackOpen(s: SiteSettings): boolean {
  return submissionsOpen(s) && s.contact.quickCallbackEnabled;
}

export interface LaunchCheckItem {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  blocking: boolean;
}

/** Check-list de mise en ligne affichée dans l'administration. */
export function launchChecklist(s: SiteSettings, hasNotificationTransport: { email: boolean; webhook: boolean }): LaunchCheckItem[] {
  const c = s.company;
  const legalMissing = [
    !c.name && "dénomination",
    !c.legalForm && "forme juridique",
    !c.address && "siège",
    !c.registration && "immatriculation (RCS/RNE, SIREN)",
    !c.phone && "téléphone",
    !c.email && "e-mail",
    !c.publicationDirector && "directeur de la publication",
    !(c.hostName && c.hostAddress && c.hostPhone) && "hébergeur (nom, adresse, téléphone)",
  ].filter(Boolean) as string[];
  return [
    {
      id: "identity",
      label: "Identité du responsable du traitement",
      ok: missingIdentityFields(s).length === 0,
      detail: missingIdentityFields(s).join(", ") || "Renseignée.",
      blocking: true,
    },
    {
      id: "legal",
      label: "Mentions légales complètes",
      ok: legalMissing.length === 0,
      detail: legalMissing.length ? `À compléter : ${legalMissing.join(", ")}.` : "Renseignées.",
      blocking: false,
    },
    {
      id: "mediator",
      label: "Médiateur de la consommation",
      ok: Boolean(c.mediatorName && (c.mediatorWebsite || c.mediatorAddress)),
      detail: "Coordonnées du médiateur auquel l'entreprise adhère (art. L616-1 du Code de la consommation).",
      blocking: false,
    },
    {
      id: "activity",
      label: "Présentation de l'activité réelle",
      ok: s.activity.kinds.length > 0 && s.activity.description.length > 20,
      detail: "Décrire honnêtement l'activité : accompagnement, réalisation de travaux et/ou mise en relation.",
      blocking: false,
    },
    {
      id: "channel",
      label: "Au moins un canal de réponse ouvert",
      ok: phoneCallbackAvailable(s) || emailReplyAvailable(s),
      detail: "Réponse par e-mail et/ou rappel téléphonique (ce dernier après confirmation de l'avertissement juridique).",
      blocking: true,
    },
    {
      id: "notifications",
      label: "Notification interne des nouvelles demandes",
      ok:
        (s.notifications.emailRecipients.length > 0 && hasNotificationTransport.email) ||
        (Boolean(s.notifications.webhookUrl) && hasNotificationTransport.webhook),
      detail: "Destinataires e-mail (SMTP configuré) ou webhook HTTPS (secret configuré).",
      blocking: false,
    },
    {
      id: "rules",
      label: "Relecture humaine des règles sur les sources officielles",
      ok: Boolean(s.launch.rulesReviewedAt),
      detail: "Les règles ont été établies par recherche documentaire indirecte : à confirmer par lecture directe des sources officielles.",
      blocking: false,
    },
    {
      id: "legal-review",
      label: "Validation juridique (mentions, confidentialité, rappel téléphonique)",
      ok: Boolean(s.launch.legalReviewedAt),
      detail: "Mesures techniques documentées dans docs/CONFORMITE.md : les éléments organisationnels et juridiques restent à valider.",
      blocking: false,
    },
  ];
}
