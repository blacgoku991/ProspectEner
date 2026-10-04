import type { MetadataRoute } from "next";
import { AID_GUIDES, WORK_GUIDES } from "@/lib/guides";
import { siteUrl } from "@/lib/seo";
import { quickCallbackOpen } from "@/lib/settings-schema";
import { launchReady, publishedRules, siteSettings } from "@/lib/site-data";

// Lecture du barème publié et de l'état de mise en ligne à chaque demande.
export const dynamic = "force-dynamic";

/** Plan du site : vide tant que le site n'est pas ouvert à l'indexation (check-list de mise en ligne). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!(await launchReady())) return [];
  const base = siteUrl();
  const rules = (await publishedRules()).data;
  const page = (path: string, priority: number, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path}`,
    priority,
    changeFrequency: "weekly",
    ...(lastModified ? { lastModified } : {}),
  });
  return [
    page("/", 1),
    page("/simulation", 0.9),
    page("/aides", 0.8),
    ...AID_GUIDES.filter((g) => rules.dispositifs[g.id].enabled).map((g) =>
      page(`/aides/${g.slug}`, 0.8, new Date(`${rules.dispositifs[g.id].verification.verifiedAt}T00:00:00Z`)),
    ),
    ...WORK_GUIDES.map((g) => page(`/travaux/${g.slug}`, 0.8)),
    page("/methodologie", 0.5),
    ...(quickCallbackOpen(await siteSettings()) ? [page("/rappel", 0.5)] : []),
    page("/contact", 0.3),
    page("/mentions-legales", 0.1),
    page("/confidentialite", 0.1),
  ];
}
