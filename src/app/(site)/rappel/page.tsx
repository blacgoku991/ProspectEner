import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IndependenceBadge } from "@/components/site/IndependenceBadge";
import { QuickCallback } from "@/components/simulator/QuickCallback";
import { getPublicConfig } from "@/lib/public-config";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getPublicConfig();
  const meta = await pageMetadata({
    title: "Être recontacté(e) pour votre projet de rénovation énergétique",
    description:
      "Indiquez où se situe votre logement et ce que vous envisagez : un conseiller vous recontacte par le canal de votre choix, sans engagement.",
    path: "/rappel",
  });
  // Rappel sans test désactivé : la page renvoie vers le test et n'a pas à être indexée.
  return config.quickCallbackOpen ? meta : { ...meta, robots: { index: false, follow: true } };
}

export default async function QuickCallbackPage() {
  const { config } = await getPublicConfig();
  if (!config.quickCallbackOpen) {
    return (
      <div className="container-page max-w-2xl py-10 sm:py-14">
        <h1 className="text-3xl font-bold text-ink-950 sm:text-4xl">Être recontacté(e)</h1>
        <p className="mt-3 text-lg text-ink-600">
          Pour vous proposer un échange utile, nous vérifions d&apos;abord que votre situation peut être aidée. Le test d&apos;éligibilité prend
          quelques minutes, et vous pouvez demander à être recontacté(e) dès que le résultat s&apos;affiche.
        </p>
        <Link href="/simulation" className="btn-primary mt-6 px-7 py-4 text-base">
          Faire le test d&apos;éligibilité
          <ArrowRight className="size-5" aria-hidden />
        </Link>
        <IndependenceBadge className="mt-8" />
      </div>
    );
  }
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
