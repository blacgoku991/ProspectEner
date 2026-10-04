import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AcquisitionCapture } from "@/components/site/AcquisitionCapture";
import { ConsentBanner } from "@/components/site/ConsentBanner";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { DISPOSITIF_INFO } from "@/engine/coverage";
import { enabledAidGuides, WORK_GUIDES } from "@/lib/guides";
import { CONSENT_COOKIE } from "@/lib/consent";
import { getPublicConfig } from "@/lib/public-config";
import { launchReady, publishedRules } from "@/lib/site-data";

/** Le site n'est proposé aux moteurs de recherche qu'une fois la check-list de mise en ligne complète. */
export async function generateMetadata(): Promise<Metadata> {
  const ready = await launchReady();
  return { robots: ready ? { index: true, follow: true, "max-image-preview": "large" } : { index: false, follow: false } };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [{ config }, ruleSet, cookieStore] = await Promise.all([getPublicConfig(), publishedRules(), cookies()]);
  const aidLinks = enabledAidGuides(ruleSet.data).map((g) => ({ label: DISPOSITIF_INFO[g.id].name, href: `/aides/${g.slug}` }));
  const workLinks = WORK_GUIDES.map((g) => ({ label: g.name, href: `/travaux/${g.slug}` }));
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:text-ink-900 focus:px-4 focus:py-2">
        Aller au contenu
      </a>
      <ConsentBanner initialRaw={cookieStore.get(CONSENT_COOKIE)?.value ?? null} />
      <AcquisitionCapture />
      <Header brandName={config.brandName} showCallback={config.quickCallbackOpen} />
      <main id="contenu">{children}</main>
      <Footer config={config} aidLinks={aidLinks} workLinks={workLinks} />
    </>
  );
}
