import type { Metadata } from "next";
import { SimulatorLoader } from "@/components/simulator/SimulatorLoader";
import { parisToday } from "@/lib/business-days";
import { getPublicConfig } from "@/lib/public-config";
import { pageMetadata } from "@/lib/seo";
import { publishedRules } from "@/lib/site-data";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Simulateur d'éligibilité aux aides à la rénovation énergétique",
    description:
      "MaPrimeRénov', primes CEE, éco-PTZ : répondez à quelques questions sur votre logement et votre projet, le résultat indicatif s'affiche immédiatement, sans inscription.",
    path: "/simulation",
  });
}

export default async function SimulationPage() {
  const [{ config }, ruleSet] = await Promise.all([getPublicConfig(), publishedRules()]);
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-pine-50/80 to-transparent" />
      <div className="container-page relative py-8 sm:py-12">
        <SimulatorLoader
          ruleSet={{ version: ruleSet.version, data: ruleSet.data }}
          referenceDate={parisToday()}
          config={config}
        />
      </div>
    </div>
  );
}
