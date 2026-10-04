import type { Metadata } from "next";
import { SimulatorLoader } from "@/components/simulator/SimulatorLoader";
import { parisToday } from "@/lib/business-days";
import { getPublicConfig } from "@/lib/public-config";
import { getPublishedRuleSet } from "@/lib/rulesets";

export const metadata: Metadata = {
  title: "Tester mon éligibilité",
  description: "Questionnaire de pré-éligibilité aux aides à la rénovation énergétique : résultat indicatif immédiat, sans compte.",
};

export default async function SimulationPage() {
  const [{ config }, ruleSet] = await Promise.all([getPublicConfig(), getPublishedRuleSet()]);
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
