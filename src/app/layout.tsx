import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

// Rendu à la demande partout : nonce CSP par requête, données lues en base à chaque affichage.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Pré-éligibilité aux aides à la rénovation énergétique",
    template: "%s · Simulateur indépendant",
  },
  description:
    "Service privé indépendant : vérifiez en quelques minutes si votre projet de rénovation énergétique pourrait correspondre à certaines aides. Résultat indicatif, affiché avant toute demande de coordonnées.",
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
  icons: { icon: "/icon.svg" },
};

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
