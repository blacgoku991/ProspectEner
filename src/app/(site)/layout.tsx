import type { Metadata } from "next";
import { AcquisitionCapture } from "@/components/site/AcquisitionCapture";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { DISPOSITIF_INFO } from "@/engine/coverage";
import { enabledAidGuides, WORK_GUIDES } from "@/lib/guides";
import { getPublicConfig } from "@/lib/public-config";
import { launchReady, publishedRules } from "@/lib/site-data";

/** Le site n'est proposé aux moteurs de recherche qu'une fois la check-list de mise en ligne complète. */
export async function generateMetadata(): Promise<Metadata> {
  const ready = await launchReady();
  return { robots: ready ? { index: true, follow: true, "max-image-preview": "large" } : { index: false, follow: false } };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [{ config }, ruleSet] = await Promise.all([getPublicConfig(), publishedRules()]);
  const aidLinks = enabledAidGuides(ruleSet.data).map((g) => ({ label: DISPOSITIF_INFO[g.id].name, href: `/aides/${g.slug}` }));
  const workLinks = WORK_GUIDES.map((g) => ({ label: g.name, href: `/travaux/${g.slug}` }));
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Aller au contenu
      </a>
      <AcquisitionCapture />
      <Header brandName={config.brandName} showCallback={config.quickCallbackOpen} />
      <main id="contenu">{children}</main>
      <Footer config={config} aidLinks={aidLinks} workLinks={workLinks} />
    </>
  );
}
