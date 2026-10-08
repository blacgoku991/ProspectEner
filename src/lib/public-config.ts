import "server-only";
import { cache } from "react";
import { env } from "./env";
import { noticeWithHash } from "./legal/notice";
import type { RequestPartnerCandidate } from "./leads/partners";
import { type PartnerRecord, requestPartnerCandidates } from "./leads/partners-db";
import { activePartners, siteSettings } from "./site-data";
import type { IncomeCategory, OverallOutcome } from "@/engine/types";
import {
  ACCEPTED_OUTCOMES,
  ACTIVITY_LABELS,
  emailReplyAvailable,
  missingIdentityFields,
  phoneCallbackAvailable,
  quickCallbackOpen,
  referralEnabled,
  type SiteSettings,
  submissionsOpen,
} from "./settings-schema";

/** Configuration publique transmise au navigateur (aucun secret). */
export interface PublicConfig {
  companyName: string;
  brandName: string;
  companyPhone: string | null;
  companyEmail: string | null;
  activityKinds: string[];
  activityDescription: string;
  qualifications: string;
  interventionArea: string;
  channels: { phone: boolean; email: boolean };
  callbackDelayBusinessDays: number;
  submissionsOpen: boolean;
  /** Résultats du test pour lesquels la demande de rendez-vous est proposée. */
  acceptedOutcomes: OverallOutcome[];
  /** Catégories de revenus pour lesquelles un rendez-vous est proposé (revenus inconnus toujours acceptés). */
  acceptedIncomeCategories: IncomeCategory[];
  /** Demande de rappel sans faire le test (non qualifiée). */
  quickCallbackOpen: boolean;
  /** Test d'éligibilité seul, ou test complet avec le détail du projet. */
  testMode: "ELIGIBILITE" | "PROJET";
  /** Mise en relation déclarée : le rendez-vous est assuré par l'entreprise qui réalise les travaux. */
  referral: boolean;
  /**
   * Mise en relation : entreprises partenaires actives, parmi lesquelles le navigateur choisit celle
   * nommée dans la demande (les réponses ne quittent pas le navigateur avant l'envoi). Vide sinon.
   */
  partners: RequestPartnerCandidate[];
  notice: { text: string; hash: string };
  turnstileSiteKey: string | null;
}

export function toPublicConfig(s: SiteSettings, partners: PartnerRecord[] = []): PublicConfig {
  return {
    companyName: s.company.name,
    brandName: s.company.name || "Simulateur rénovation",
    companyPhone: s.contact.showCompanyPhone && s.company.phone ? s.company.phone : null,
    companyEmail: s.company.email || null,
    activityKinds: s.activity.kinds.map((k) => ACTIVITY_LABELS[k]),
    activityDescription: s.activity.description,
    qualifications: s.activity.qualifications,
    interventionArea: s.activity.interventionArea,
    channels: { phone: phoneCallbackAvailable(s), email: emailReplyAvailable(s) },
    callbackDelayBusinessDays: s.contact.callbackDelayBusinessDays,
    submissionsOpen: submissionsOpen(s) && missingIdentityFields(s).length === 0,
    acceptedOutcomes: ACCEPTED_OUTCOMES[s.contact.acceptedOutcomes],
    acceptedIncomeCategories: [...s.contact.acceptedIncomeCategories],
    quickCallbackOpen: quickCallbackOpen(s),
    testMode: s.test.mode,
    referral: referralEnabled(s),
    // Uniquement l'identifiant, le nom affiché et les critères des entreprises actives.
    partners: referralEnabled(s) ? requestPartnerCandidates(partners) : [],
    notice: noticeWithHash(s),
    turnstileSiteKey: env().NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null,
  };
}

/** Configuration du site public (lecture mémorisée le temps d'une requête). */
export const getPublicConfig = cache(async (): Promise<{ settings: SiteSettings; config: PublicConfig }> => {
  const settings = await siteSettings();
  return { settings, config: toPublicConfig(settings, referralEnabled(settings) ? await activePartners() : []) };
});
