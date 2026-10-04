import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { brandNameOf, DEFAULT_DESCRIPTION, siteUrl } from "@/lib/seo";
import { siteSettings } from "@/lib/site-data";
import "./globals.css";

// Rendu à la demande partout : nonce CSP par requête, données lues en base à chaque affichage.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let brand = brandNameOf("");
  try {
    brand = brandNameOf((await siteSettings()).company.name);
  } catch {
    // Base indisponible : métadonnées génériques, la page signalera l'erreur elle-même.
  }
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `Aides à la rénovation énergétique : testez votre éligibilité | ${brand}`, template: `%s | ${brand}` },
    description: DEFAULT_DESCRIPTION,
    applicationName: brand,
    // Par défaut, rien n'est indexé : le site public lève cette règle une fois la mise en ligne validée.
    robots: { index: false, follow: false },
    openGraph: { type: "website", locale: "fr_FR", siteName: brand },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false, email: false, address: false },
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbfaf7",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lecture des en-têtes : rendu dynamique, nécessaire au nonce de la CSP.
  await headers();
  return (
    <html lang="fr">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
