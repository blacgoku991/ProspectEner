import type { Metadata } from "next";
import { IndependenceBadge } from "@/components/site/IndependenceBadge";
import { QuickCallback } from "@/components/simulator/QuickCallback";
import { getPublicConfig } from "@/lib/public-config";

export const metadata: Metadata = {
  title: "Être recontacté",
  description: "Pas le temps de remplir le questionnaire ? Indiquez votre projet et le canal de réponse souhaité.",
};

export default async function QuickCallbackPage() {
  const { config } = await getPublicConfig();
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-bold text-ink-950 sm:text-4xl">Pas le temps de remplir le test ?</h1>
      <p className="mt-3 text-lg text-ink-600">
        Indiquez simplement où se situe le logement et ce que vous envisagez : {config.companyName || "nous"} vous recontacte par le canal de
        votre choix.
      </p>
      <IndependenceBadge className="mt-5" />
      <div className="mt-8">
        <QuickCallback config={config} />
      </div>
    </div>
  );
}
