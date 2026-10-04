import { CalendarClock, ChevronDown, CircleAlert, CircleHelp, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckList, GuideHeader, GuideSection, RulesFootnote, SourceList, TestCta } from "@/components/site/Guide";
import { DISPOSITIF_INFO, WORK_ITEMS, type WorkItem } from "@/engine";
import { parisToday } from "@/lib/business-days";
import {
  aidGuideBySlug,
  aidSummary,
  aidWorks,
  ceeBonuses,
  coupDePouce,
  coupDePouceSentence,
  eligibilityLines,
  frenchList,
  longDate,
  procedureLines,
  VERIFICATION_LABELS,
  WORK_GUIDES,
  workItemsOf,
} from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";
import { publishedRules } from "@/lib/site-data";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const guide = aidGuideBySlug(slug);
  if (!guide) return null;
  const ruleSet = await publishedRules();
  if (!ruleSet.data.dispositifs[guide.id].enabled) return null;
  return { guide, ruleSet };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load((await params).slug);
  if (!found) return {};
  const { guide, ruleSet } = found;
  const info = DISPOSITIF_INFO[guide.id];
  return pageMetadata({
    title: `${info.name} ${ruleSet.data.incomeCeilings.year} : conditions et travaux concernés`,
    description: `${info.name} : qui peut en bénéficier, quels travaux sont concernés, quelles démarches respecter, avec les sources officielles. Testez votre éligibilité en 3 minutes.`,
    path: `/aides/${guide.slug}`,
  });
}

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export default async function AidPage({ params }: Props) {
  const found = await load((await params).slug);
  if (!found) notFound();
  const { guide, ruleSet } = found;
  const rules = ruleSet.data;
  const d = rules.dispositifs[guide.id];
  const info = DISPOSITIF_INFO[guide.id];
  const today = parisToday();
  const works = aidWorks(rules, guide.id);
  const allItems = Object.keys(WORK_ITEMS) as WorkItem[];
  const bonuses = guide.id === "CEE" ? ceeBonuses(rules, today) : [];
  const cdp = guide.id === "CEE" ? coupDePouce(rules, today, allItems) : null;
  // Travaux couverts regroupés par page de travaux (liens internes).
  const coveredGroups = WORK_GUIDES.map((w) => ({ guide: w, items: workItemsOf(w).filter((i) => works.covered.includes(i)) })).filter((g) => g.items.length > 0);

  return (
    <div className="container-page max-w-4xl space-y-12 py-10 sm:py-14">
      <GuideHeader
        crumbs={[
          { name: "Accueil", path: "/" },
          { name: "Les aides", path: "/aides" },
          { name: info.name, path: `/aides/${guide.slug}` },
        ]}
        kicker={`${info.kind} · ${info.provider}`}
        title={`${info.name} : conditions et travaux concernés`}
        lead={<p>{aidSummary(rules, guide.id)}</p>}
      >
        {d.availability !== "OPEN" && (
          <p className="flex max-w-2xl gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-ink-800 ring-1 ring-inset ring-amber-600/20">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
            <span>
              <strong>{d.availability === "SUSPENDED" ? "Guichet suspendu" : "Statut du guichet à confirmer"}.</strong> {d.availabilityNote}
            </span>
          </p>
        )}
      </GuideHeader>

      {bonuses.map((b) => (
        <aside key={b.title + b.until} className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-50 px-5 py-4 text-ink-800">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900">
              {b.title} : {frenchList(b.works.map((w) => WORK_ITEMS[w].label.toLowerCase()))}
            </p>
            <p className="text-sm leading-relaxed">
              {b.current ? "Pour un devis signé au plus tard le" : `Pour un devis signé du ${longDate(b.from)} au`} {longDate(b.until)}, sous réserve que {b.conditions}.
            </p>
          </div>
        </aside>
      ))}

      <GuideSection id="en-bref" title="En bref">
        <div className="space-y-3 leading-relaxed text-ink-700">
          {d.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="beneficiaires" title="Qui peut en bénéficier ?">
        <CheckList items={eligibilityLines(rules, guide.id)} />
        {(guide.id === "MPR_GESTE" || guide.id === "MPR_AMPLEUR") && (
          <p className="text-sm text-ink-600">
            Les catégories de revenus dépendent du revenu fiscal de référence et de la taille du ménage :{" "}
            <Link href="/methodologie#plafonds" className="font-semibold text-pine-700 underline underline-offset-2">
              voir les plafonds de ressources {rules.incomeCeilings.year}
            </Link>
            .
          </p>
        )}
      </GuideSection>

      <GuideSection id="travaux" title="Quels travaux ?">
        {coveredGroups.length > 0 && (
          <ul className="space-y-2.5">
            {coveredGroups.map((g) => (
              <li key={g.guide.slug} className="leading-relaxed text-ink-700">
                <Link href={`/travaux/${g.guide.slug}`} className="font-semibold text-ink-900 underline decoration-pine-300 underline-offset-2 hover:decoration-pine-600">
                  {g.guide.name}
                </Link>{" "}
                : {g.items.map((i) => lowerFirst(WORK_ITEMS[i].label)).join(", ")}.
              </li>
            ))}
          </ul>
        )}
        {works.review.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-ink-900">À vérifier</h3>
            <ul className="space-y-1.5 text-sm">
              {works.review.map((r) => (
                <li key={r.item} className="flex gap-2 text-ink-700">
                  <CircleHelp className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                  <span>
                    {WORK_ITEMS[r.item].label} : {r.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {works.excluded.length > 0 && (
          <details className="group rounded-2xl border border-ink-900/[0.07] bg-white px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink-900">
              <h3>Travaux non couverts ({works.excluded.length})</h3>
              <ChevronDown className="size-4 shrink-0 text-ink-500 transition group-open:rotate-180" aria-hidden />
            </summary>
            <ul className="mt-3 space-y-1.5 text-sm">
              {works.excluded.map((r) => (
                <li key={r.item} className="flex gap-2 text-ink-600">
                  <X className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                  <span>
                    {WORK_ITEMS[r.item].label} : {r.reason}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </GuideSection>

      <GuideSection id="demarches" title="Démarches et conditions à respecter">
        <CheckList items={procedureLines(rules, guide.id)} />
      </GuideSection>

      {cdp && (
        <GuideSection id="coup-de-pouce" title="Coup de pouce Chauffage">
          <div className="space-y-3 leading-relaxed text-ink-700">
            <p>{coupDePouceSentence(cdp)}</p>
            {cdp.note && <p>{cdp.note}</p>}
          </div>
          <SourceList sources={cdp.sources} />
        </GuideSection>
      )}

      <TestCta />

      <GuideSection id="sources" title="Sources officielles">
        <SourceList sources={d.sources} />
      </GuideSection>

      <RulesFootnote>
        Règles {VERIFICATION_LABELS[d.verification.status]} le {longDate(d.verification.verifiedAt)}, barème « {rules.meta.label} ».
        {d.verification.status === "PARTIAL" && d.verification.notes ? ` Points non confirmés : ${d.verification.notes}` : ""} Aucun montant
        n&apos;est calculé : seule l&apos;instruction du dossier par l&apos;organisme concerné décide de l&apos;attribution.
      </RulesFootnote>
    </div>
  );
}
