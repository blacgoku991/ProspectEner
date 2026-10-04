import type { Metadata } from "next";
import { AidExplorer, type ExplorerTab } from "@/components/site/AidExplorer";
import { AidGuideCards, WorkGuideCards } from "@/components/site/GuideCards";
import { GuideHeader, GuideSection, RulesFootnote, TestCta } from "@/components/site/Guide";
import { coverageFor } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";
import { publishedRules } from "@/lib/site-data";

export async function generateMetadata(): Promise<Metadata> {
  const rules = (await publishedRules()).data;
  return pageMetadata({
    title: `Aides à la rénovation énergétique ${rules.incomeCeilings.year} : le guide`,
    description:
      "MaPrimeRénov', primes énergie (CEE), éco-prêt à taux zéro : qui peut en bénéficier, pour quels travaux (pompe à chaleur, isolation, chauffe-eau…) et avec quelles démarches. Sources officielles.",
    path: "/aides",
  });
}

export default async function AidsHubPage() {
  const rules = (await publishedRules()).data;
  const tabs: ExplorerTab[] = [
    {
      focus: "chauffage",
      label: "Chauffage & PAC",
      coverage: coverageFor(rules, ["PAC", "CHAUFFAGE"]),
      links: [
        { label: "Pompe à chaleur", href: "/travaux/pompe-a-chaleur" },
        { label: "Changement de chauffage", href: "/travaux/chauffage" },
      ],
    },
    { focus: "isolation", label: "Isolation", coverage: coverageFor(rules, ["ISOLATION"]), links: [{ label: "Aides pour l'isolation", href: "/travaux/isolation" }] },
    { focus: "eau-chaude", label: "Eau chaude", coverage: coverageFor(rules, ["EAU_CHAUDE"]), links: [{ label: "Aides pour un chauffe-eau", href: "/travaux/chauffe-eau" }] },
    { focus: "ventilation", label: "Ventilation", coverage: coverageFor(rules, ["VENTILATION"]), links: [{ label: "Aides pour une VMC", href: "/travaux/ventilation" }] },
    {
      focus: "global",
      label: "Rénovation globale",
      coverage: coverageFor(rules, ["RENOVATION_GLOBALE"]),
      links: [{ label: "Aides pour une rénovation globale", href: "/travaux/renovation-globale" }],
    },
  ];

  return (
    <div className="container-page space-y-16 py-10 sm:py-14">
      <div className="max-w-4xl">
        <GuideHeader
          crumbs={[
            { name: "Accueil", path: "/" },
            { name: "Les aides", path: "/aides" },
          ]}
          kicker="Guide"
          title={`Les aides à la rénovation énergétique en ${rules.incomeCeilings.year}`}
          lead={
            <p>
              Subventions, primes et prêt : les principales aides nationales évaluées par notre simulateur, leurs conditions et les travaux
              concernés, d&apos;après le barème en vigueur.
            </p>
          }
        />
      </div>

      <GuideSection id="dispositifs" title="Les aides évaluées">
        <AidGuideCards rules={rules} />
        <p className="max-w-3xl text-sm text-ink-500">
          Non évalués : aides des collectivités locales, MaPrimeRénov&apos; Copropriété, situations en outre-mer. Le simulateur ne calcule pas
          de montant : il indique une pré-éligibilité expliquée, à confirmer.
        </p>
      </GuideSection>

      <GuideSection id="travaux" title="Par type de travaux">
        <WorkGuideCards rules={rules} />
      </GuideSection>

      <GuideSection id="explorer" title="Quels travaux, quels dispositifs ?">
        <p className="max-w-2xl text-ink-600">Sélectionnez une famille de travaux : la maison met en évidence les postes concernés.</p>
        <AidExplorer tabs={tabs} ruleSetLabel={rules.meta.label} />
      </GuideSection>

      <div className="max-w-4xl space-y-8">
        <TestCta />
        <RulesFootnote>Informations issues du barème « {rules.meta.label} ».</RulesFootnote>
      </div>
    </div>
  );
}
