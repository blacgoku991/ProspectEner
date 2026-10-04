import { CalendarClock, Info } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoverageCard } from "@/components/site/CoverageCard";
import { CheckList, GuideHeader, GuideSection, RulesFootnote, SourceList, TestCta } from "@/components/site/Guide";
import { DISPOSITIF_INFO, WORK_ITEMS } from "@/engine";
import { parisToday } from "@/lib/business-days";
import {
  aidGuidePath,
  aidsForWork,
  ceeBonuses,
  coupDePouce,
  coupDePouceSentence,
  frenchList,
  longDate,
  sourcesFor,
  workCoverage,
  workGuideBySlug,
  workItemsOf,
  workNotesFor,
} from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";
import { publishedRules } from "@/lib/site-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = workGuideBySlug((await params).slug);
  if (!guide) return {};
  const rules = (await publishedRules()).data;
  const names = aidsForWork(rules, guide).map((id) => DISPOSITIF_INFO[id].name);
  return pageMetadata({
    title: `${guide.h1} en ${rules.incomeCeilings.year}`,
    description: `${guide.intro} ${names.length ? `Aides évaluées : ${frenchList(names)}.` : ""} Conditions, travaux couverts et sources officielles.`.replace(/\s+/g, " "),
    path: `/travaux/${guide.slug}`,
  });
}

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export default async function WorkPage({ params }: Props) {
  const guide = workGuideBySlug((await params).slug);
  if (!guide) notFound();
  const ruleSet = await publishedRules();
  const rules = ruleSet.data;
  const today = parisToday();
  const items = workItemsOf(guide);
  const coverage = workCoverage(rules, guide);
  const covering = aidsForWork(rules, guide);
  const bonuses = ceeBonuses(rules, today, items);
  const notes = workNotesFor(rules, items);
  const cdp = coupDePouce(rules, today, items);
  // Rappels de calendrier propres à chaque aide qui couvre ces travaux.
  const timing = covering.map((id) => {
    const d = rules.dispositifs[id];
    const when = d.quoteMustNotBeSigned ? "avant la signature du devis" : d.worksMustNotHaveStarted ? "avant le début des travaux" : "auprès d'une banque partenaire, selon son calendrier";
    return `${DISPOSITIF_INFO[id].name} : demande ${when}.`;
  });
  const needsRge = covering.some((id) => rules.dispositifs[id].requiresRge);

  return (
    <div className="container-page max-w-4xl space-y-12 py-10 sm:py-14">
      <GuideHeader
        crumbs={[
          { name: "Accueil", path: "/" },
          { name: "Les aides", path: "/aides" },
          { name: guide.name, path: `/travaux/${guide.slug}` },
        ]}
        kicker="Travaux"
        title={`${guide.h1} en ${rules.incomeCeilings.year}`}
        lead={
          <p>
            {guide.intro} Voici les aides nationales évaluées par notre simulateur pour ces travaux, et leurs principales conditions.
          </p>
        }
      />

      {bonuses.map((b) => (
        <aside key={b.title + b.until} className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-50 px-5 py-4 text-ink-800">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900">
              {b.title} : {frenchList(b.works.filter((w) => items.includes(w)).map((w) => WORK_ITEMS[w].label.toLowerCase()))}
            </p>
            <p className="text-sm leading-relaxed">
              {b.current ? "Pour un devis signé au plus tard le" : `Pour un devis signé du ${longDate(b.from)} au`} {longDate(b.until)}, sous réserve que {b.conditions}.
            </p>
          </div>
        </aside>
      ))}

      <GuideSection id="aides" title="Les aides évaluées pour ces travaux">
        {coverage.length === 0 ? (
          <p className="text-ink-600">Aucune des aides évaluées par le simulateur ne couvre ces travaux.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {coverage.map((c) => (
              <CoverageCard key={c.id} coverage={c} href={aidGuidePath(c.id)} />
            ))}
          </div>
        )}
        <p className="text-sm text-ink-500">
          Non évalués : aides des collectivités locales, MaPrimeRénov&apos; Copropriété, outre-mer. Une correspondance ne vaut pas éligibilité :
          les autres conditions (statut, logement, revenus, calendrier) sont vérifiées par le questionnaire.
        </p>
      </GuideSection>

      {notes.length > 0 && (
        <GuideSection id="bon-a-savoir" title="Bon à savoir">
          <ul className="space-y-2.5">
            {notes.map((n) => (
              <li key={n.id + n.item} className="flex gap-3 leading-relaxed text-ink-700">
                <Info className="mt-1 size-4 shrink-0 text-pine-600" aria-hidden />
                <span>
                  <strong className="text-ink-900">{WORK_ITEMS[n.item].label}</strong> ({DISPOSITIF_INFO[n.id].name}) : {lowerFirst(n.note)}
                </span>
              </li>
            ))}
          </ul>
        </GuideSection>
      )}

      {cdp && (
        <GuideSection id="coup-de-pouce" title="Coup de pouce Chauffage">
          <p className="leading-relaxed text-ink-700">
            {coupDePouceSentence(cdp)}
            {cdp.note ? ` ${cdp.note}` : ""}
          </p>
        </GuideSection>
      )}

      {covering.length > 0 && (
        <GuideSection id="calendrier" title="Le bon calendrier">
          <CheckList
            items={[
              ...timing,
              ...(needsRge ? ["Faites réaliser les travaux par une entreprise titulaire du label RGE (Reconnu garant de l'environnement)."] : []),
              "Comparez plusieurs devis et ne signez rien avant d'avoir vérifié les conditions de chaque aide.",
            ]}
          />
        </GuideSection>
      )}

      <TestCta />

      {covering.length > 0 && (
        <GuideSection id="sources" title="Sources officielles">
          <SourceList sources={sourcesFor(rules, covering)} />
        </GuideSection>
      )}

      <RulesFootnote>
        Informations issues du barème « {rules.meta.label} ». Aucun montant n&apos;est calculé : seule l&apos;instruction du dossier par
        l&apos;organisme concerné décide de l&apos;attribution.
      </RulesFootnote>
    </div>
  );
}
