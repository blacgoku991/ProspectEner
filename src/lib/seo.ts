import "server-only";
import type { Metadata } from "next";
import { env } from "./env";
import { siteSettings } from "./site-data";

/** Nom affiché du site : dénomination renseignée dans les paramètres, sinon un nom générique. */
export function brandNameOf(companyName: string): string {
  return companyName || "Simulateur rénovation";
}

/** URL publique du site, sans barre finale (APP_URL, ou domaine de production fourni par l'hébergeur). */
export function siteUrl(): string {
  return env().APP_URL.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const DEFAULT_DESCRIPTION =
  "Pompe à chaleur, isolation, chauffe-eau, rénovation globale : testez gratuitement en 3 minutes si votre projet peut être aidé (MaPrimeRénov', primes CEE, éco-PTZ). Résultat immédiat, sans inscription. Service privé indépendant.";

/**
 * Image de partage générée par `app/opengraph-image.tsx`. Elle est déclarée explicitement : l'objet
 * `openGraph` d'une page remplace celui des niveaux supérieurs, image comprise.
 */
const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Votre rénovation énergétique peut-elle être aidée ? Test d'éligibilité gratuit, résultat immédiat.",
};

/**
 * Métadonnées d'une page publique : titre, description, adresse canonique, Open Graph et carte Twitter.
 * L'indexation (robots) n'est jamais forcée ici : elle reste décidée par la mise en page du site
 * (non-indexation tant que la check-list de mise en ligne n'est pas complète).
 */
export async function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  /** Titre utilisé tel quel, sans le suffixe « | nom du site ». */
  absoluteTitle?: boolean;
}): Promise<Metadata> {
  const brand = brandNameOf((await siteSettings()).company.name);
  const fullTitle = absoluteTitle ? title : `${title} | ${brand}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: "fr_FR", siteName: brand, title: fullTitle, description, url: path, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [SHARE_IMAGE.url] },
  };
}
