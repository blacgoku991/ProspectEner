import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Exploration autorisée hors administration et API : les pages non prêtes portent elles-mêmes
 * une balise « noindex » (les robots doivent pouvoir la lire pour en tenir compte).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
