import "server-only";
import { cache } from "react";
import { env } from "./env";
import { noticeWithHash } from "./legal/notice";
import { siteSettings } from "./site-data";
import type { OverallOutcome } from "@/engine/types";
import {
  ACCEPTED_OUTCOMES,
  ACTIVITY_LABELS,
  emailReplyAvailable,
  missingIdentityFields,
  phoneCallbackAvailable,
  quickCallbackOpen,
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
  /** Demande de rappel sans faire le test (non qualifiée). */
  quickCallbackOpen: boolean;
  /** Test d'éligibilité seul, ou test complet avec le détail du projet. */
  testMode: "ELIGIBILITE" | "PROJET";
  notice: { text: string; hash: string };
  turnstileSiteKey: string | null;
}

export function toPublicConfig(s: SiteSettings): PublicConfig {
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
    quickCallbackOpen: quickCallbackOpen(s),
    testMode: s.test.mode,
    notice: noticeWithHash(s),
    turnstileSiteKey: env().NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null,
  };
}

/** Configuration du site public (lecture mémorisée le temps d'une requête). */
export const getPublicConfig = cache(async (): Promise<{ settings: SiteSettings; config: PublicConfig }> => {
  const settings = await siteSettings();
  return { settings, config: toPublicConfig(settings) };
});
