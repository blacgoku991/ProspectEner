import "server-only";
import { cache } from "react";
import { env } from "./env";
import { noticeWithHash } from "./legal/notice";
import { siteSettings } from "./site-data";
import {
  ACTIVITY_LABELS,
  emailReplyAvailable,
  missingIdentityFields,
  phoneCallbackAvailable,
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
    notice: noticeWithHash(s),
    turnstileSiteKey: env().NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null,
  };
}

/** Configuration du site public (lecture mémorisée le temps d'une requête). */
export const getPublicConfig = cache(async (): Promise<{ settings: SiteSettings; config: PublicConfig }> => {
  const settings = await siteSettings();
  return { settings, config: toPublicConfig(settings) };
});
