import { AcquisitionCapture } from "@/components/site/AcquisitionCapture";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { getPublicConfig } from "@/lib/public-config";

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
