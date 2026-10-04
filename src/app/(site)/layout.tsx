import type { Metadata } from "next";
import { AcquisitionCapture } from "@/components/site/AcquisitionCapture";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { getPublicConfig } from "@/lib/public-config";
import { getSettings, notificationTransports } from "@/lib/settings";
import { launchChecklist } from "@/lib/settings-schema";

/** Le site n'est proposé aux moteurs de recherche qu'une fois la check-list de mise en ligne complète. */
export async function generateMetadata(): Promise<Metadata> {
  const ready = launchChecklist(await getSettings(), notificationTransports()).every((c) => c.ok);
  return { robots: ready ? { index: true, follow: true } : { index: false, follow: false } };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { config } = await getPublicConfig();
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Aller au contenu
      </a>
      <AcquisitionCapture />
      <Header brandName={config.brandName} />
      <main id="contenu">{children}</main>
      <Footer config={config} />
    </>
  );
}
