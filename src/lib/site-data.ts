import "server-only";
import { cache } from "react";
import { countActivePartners, listPartners, partnerDisplayName } from "./leads/partners-db";
import { getPublishedRuleSet } from "./rulesets";
import { getSettings, notificationTransports } from "./settings";
import { launchChecklist } from "./settings-schema";

/**
 * Lectures du site public, mémorisées le temps d'une requête : la mise en page, les métadonnées
 * et la page partagent la même lecture (une requête en base au lieu de plusieurs).
 * À ne pas utiliser dans les actions qui modifient ces données.
 */
export const siteSettings = cache(getSettings);

export const publishedRules = cache(getPublishedRuleSet);

/** Le site n'est proposé aux moteurs de recherche qu'une fois la check-list de mise en ligne complète. */
export const launchReady = cache(async (): Promise<boolean> =>
  launchChecklist(await siteSettings(), notificationTransports(), await countActivePartners()).every((c) => c.ok),
);

/** Entreprises partenaires actives (lecture mémorisée le temps d'une requête). */
export const activePartners = cache(() => listPartners({ activeOnly: true }));

/** Entreprises partenaires actives, telles qu'annoncées aux visiteurs (pages légales). */
export const publicPartnerNames = cache(async (): Promise<string[]> => (await activePartners()).map(partnerDisplayName));
