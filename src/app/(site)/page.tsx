import { ArrowRight, CalendarClock, Check, PhoneCall } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import HouseHero from "@/components/three/HouseHero";
import { FranceRenovNotice } from "@/components/site/FranceRenovNotice";
import { AidGuideCards, WorkGuideCards } from "@/components/site/GuideCards";
import { IndependenceBadge } from "@/components/site/IndependenceBadge";
import { JsonLd } from "@/components/site/JsonLd";
import { StickyCta } from "@/components/site/StickyCta";
import { TrackStep } from "@/components/site/TrackStep";
import { WORK_ITEMS } from "@/engine";
import { parisToday } from "@/lib/business-days";
import { ceeBonuses, frenchList, longDate } from "@/lib/guides";
import { getPublicConfig } from "@/lib/public-config";
import { DEFAULT_DESCRIPTION, pageMetadata, siteUrl } from "@/lib/seo";
import { missingIdentityFields } from "@/lib/settings-schema";
import { publishedRules } from "@/lib/site-data";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Aides à la rénovation énergétique : testez votre éligibilité en 3 minutes",
    description: DEFAULT_DESCRIPTION,
    path: "/",
  });
}

const STEPS = [
  { title: "Répondez à quelques questions", text: "Votre logement, votre projet, votre situation : seules les questions utiles vous sont posées." },
  { title: "Découvrez votre résultat", text: "Immédiatement, sans inscription ni justificatif. Il est indicatif et repose sur les règles en vigueur." },
  {
    title: "Un conseiller vous rappelle",
    text: "Si vous le souhaitez, un conseiller fait le point avec vous sur vos travaux et les aides adaptées. Aucun dossier n'est déposé en votre nom.",
  },
];

const FAQ = [
  {
    q: "Le test est-il gratuit ?",
    a: "Oui. Le test est gratuit, sans inscription et sans engagement. Il prend environ 3 minutes.",
  },
  {
    q: "Est-ce un site officiel ?",
    a: "Non. C'est un service privé indépendant, non affilié à l'État, à l'Anah ou à France Rénov'. Le service public d'information est accessible gratuitement sur france-renov.gouv.fr.",
  },
  {
    q: "Le résultat vaut-il accord d'une aide ?",
    a: "Non. Il s'agit d'une pré-éligibilité indicative, fondée sur vos réponses et sur les règles en vigueur à la date de la simulation. Seule l'instruction du dossier par l'organisme concerné décide de l'attribution.",
  },
  {
    q: "Dois-je donner mes coordonnées pour voir le résultat ?",
    a: "Non. Le résultat s'affiche directement. Vous pouvez ensuite, si vous le souhaitez, demander à être recontacté(e) pour une étude de votre projet.",
  },
  {
    q: "Que deviennent mes réponses ?",
    a: "Tant que vous n'envoyez pas de demande, vos réponses restent dans votre navigateur. Si vous envoyez une demande, elles sont jointes à celle-ci et ne sont transmises à aucun partenaire.",
  },
  {
    q: "Me demanderez-vous des documents ?",
    a: "Jamais de numéro fiscal, d'avis d'imposition, de pièce d'identité, de coordonnées bancaires ou d'identifiants FranceConnect sur ce site.",
  },
  {
    q: "Puis-je annuler ma demande ?",
    a: "Oui, à tout moment, grâce au lien d'annulation fourni après l'envoi, ou depuis la page « Annuler une demande ».",
  },
];

export default async function HomePage() {
  const [{ config, settings }, ruleSet] = await Promise.all([getPublicConfig(), publishedRules()]);
  const rules = ruleSet.data;
  // Bonifications temporaires en cours : échéance réelle et datée, jamais de compte à rebours.
  const bonuses = ceeBonuses(rules, parisToday()).filter((b) => b.current);
  const url = siteUrl();
  const identityComplete = missingIdentityFields(settings).length === 0;

  return (
    <>
      <TrackStep step="landing" />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: config.brandName,
            url: `${url}/`,
            inLanguage: "fr-FR",
            description: DEFAULT_DESCRIPTION,
          },
          // Organisation décrite uniquement avec l'identité réellement renseignée par l'éditeur.
          ...(identityComplete
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  name: settings.company.name,
                  url: `${url}/`,
                  logo: `${url}/icon.svg`,
                  ...(settings.company.email ? { email: settings.company.email } : {}),
                  ...(config.companyPhone ? { telephone: config.companyPhone } : {}),
                  ...(settings.company.address ? { address: settings.company.address } : {}),
                },
              ]
            : []),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          },
        ]}
      />

      {/* ─── Héros ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-32 size-[560px] rounded-full bg-pine-100/60 blur-3xl" />
        <div className="container-page relative grid items-center gap-8 pb-10 pt-10 sm:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pb-16">
          <div className="animate-fade-up space-y-6">
            {bonuses.map((b) => (
              <Link
                key={b.title + b.until}
                href="/simulation"
                className="flex w-fit max-w-xl items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2 text-sm leading-snug text-ink-800 ring-1 ring-inset ring-amber-500/25 transition hover:bg-amber-100/70"
              >
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                <span>
                  <strong className="text-amber-900">Jusqu&apos;au {longDate(b.until)}</strong> : {b.title.toLowerCase()} pour{" "}
                  {frenchList(b.works.map((w) => WORK_ITEMS[w].label.toLowerCase()))}, sous conditions.
                </span>
              </Link>
            ))}
            <h1 className="text-[2.5rem] font-extrabold leading-[1.04] text-ink-950 sm:text-6xl">
              Votre rénovation énergétique <span className="whitespace-nowrap">peut-elle</span> être{" "}
              <span className="whitespace-nowrap">
                <span className="text-pine-700">aidée</span> ?
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-ink-600">
              Pompe à chaleur, isolation, chauffe-eau, rénovation globale : en quelques questions, vous savez{" "}
              <strong className="font-semibold text-ink-900">immédiatement</strong>{" "}
              {config.testMode === "ELIGIBILITE" ? "si vous pouvez être aidé(e)" : "si votre projet peut être aidé"}, avant toute demande de
              coordonnées.
            </p>
            <div id="hero-cta" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Link href="/simulation" className="btn-primary px-7 py-4 text-base">
                Tester mon éligibilité
                <ArrowRight className="size-5" aria-hidden />
              </Link>
              {config.quickCallbackOpen && (
                <Link
                  href="/rappel"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-ink-700 underline decoration-ink-300 underline-offset-4 hover:text-ink-950"
                >
                  <PhoneCall className="size-4" aria-hidden />
                  Je préfère être recontacté(e)
                </Link>
              )}
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600">
              {["Gratuit", "Environ 3 minutes", "Sans inscription", "Sans justificatif"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-pine-600" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative h-[260px] sm:h-[420px] lg:h-[520px]">
            <HouseHero focus="global" className="absolute inset-0 aspect-auto" />
          </div>
        </div>
        <div className="container-page relative pb-4">
          <FranceRenovNotice />
        </div>
      </section>

      {/* ─── Fonctionnement ────────────────────────────────────────────────── */}
      <section id="fonctionnement" className="container-page scroll-mt-28 py-16 sm:py-24" aria-labelledby="fonctionnement-titre">
        <h2 id="fonctionnement-titre" className="max-w-2xl text-3xl font-bold text-ink-950 sm:text-4xl">
          Simple, rapide et sans engagement
        </h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="space-y-2">
              <span className="grid size-10 place-items-center rounded-full bg-pine-600 font-display text-lg font-bold text-white">{i + 1}</span>
              <h3 className="pt-2 text-lg font-bold text-ink-900">{s.title}</h3>
              <p className="leading-relaxed text-ink-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── Travaux ───────────────────────────────────────────────────────── */}
      <section id="travaux" className="scroll-mt-28 border-y border-ink-900/[0.06] bg-surface/60 py-16 sm:py-24" aria-labelledby="travaux-titre">
        <div className="container-page">
          <div className="mb-10 max-w-2xl">
            <h2 id="travaux-titre" className="text-3xl font-bold text-ink-950 sm:text-4xl">
              Quels travaux peuvent être aidés ?
            </h2>
            <p className="mt-3 text-ink-600">Les aides ne sont pas les mêmes selon les travaux. Choisissez les vôtres pour voir les aides évaluées.</p>
          </div>
          <WorkGuideCards rules={rules} />
        </div>
      </section>

      {/* ─── Aides ─────────────────────────────────────────────────────────── */}
      <section id="aides" className="container-page scroll-mt-28 py-16 sm:py-24" aria-labelledby="aides-titre">
        <div className="mb-10 max-w-2xl">
          <h2 id="aides-titre" className="text-3xl font-bold text-ink-950 sm:text-4xl">
            Subventions, primes et prêt : les aides évaluées
          </h2>
          <p className="mt-3 text-ink-600">
            Ce ne sont pas les mêmes aides, ni les mêmes conditions. Le simulateur ne calcule pas de montant : il indique une pré-éligibilité
            expliquée, à confirmer.
          </p>
        </div>
        <AidGuideCards rules={rules} />
        <p className="mt-6 text-sm text-ink-500">
          Non évalués : aides des collectivités locales, MaPrimeRénov&apos; Copropriété, situations en outre-mer.{" "}
          <Link href="/aides" className="font-semibold text-pine-700 underline underline-offset-2">
            Le guide des aides
          </Link>
        </p>
      </section>

      {/* ─── Qui sommes-nous (uniquement si configuré) ─────────────────────── */}
      {config.activityDescription && (
        <section className="container-page pb-8" aria-labelledby="qui-titre">
          <div className="card grid gap-6 p-8 md:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-pine-700">Qui sommes-nous</p>
              <h2 id="qui-titre" className="mt-2 text-2xl font-bold text-ink-950">
                {config.companyName}
              </h2>
              {config.activityKinds.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {config.activityKinds.map((k) => (
                    <li key={k} className="badge bg-ink-900/[0.06] text-ink-700">
                      {k}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-3 text-ink-700">
              <p className="whitespace-pre-line leading-relaxed">{config.activityDescription}</p>
              {config.qualifications && <p className="text-sm text-ink-600">Qualifications : {config.qualifications}</p>}
              {config.interventionArea && <p className="text-sm text-ink-600">Zone d&apos;intervention : {config.interventionArea}</p>}
              <IndependenceBadge compact />
            </div>
          </div>
        </section>
      )}

      {/* ─── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="container-page max-w-3xl py-16" aria-labelledby="faq-titre">
        <h2 id="faq-titre" className="mb-8 text-3xl font-bold text-ink-950">
          Questions fréquentes
        </h2>
        <div className="divide-y divide-ink-900/[0.07] rounded-3xl border border-ink-900/[0.07] bg-surface">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group px-5 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-semibold text-ink-900">
                {q}
                <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-sand-100 text-ink-600 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-ink-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── Appel final ───────────────────────────────────────────────────── */}
      <section className="container-page">
        <div className="relative overflow-hidden rounded-[2rem] bg-pine-950 px-6 py-12 text-white sm:px-12">
          <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-pine-500/30 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold">Prêt(e) à y voir plus clair ?</h2>
              <p className="mt-2 max-w-xl text-white/75">Résultat immédiat, sans inscription et sans engagement.</p>
            </div>
            <Link href="/simulation" className="btn bg-white px-7 py-4 text-base text-pine-950 hover:bg-white/90">
              Commencer le test
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <StickyCta triggerId="hero-cta" mobileOnly>
        <Link href="/simulation" className="btn-primary flex-1 justify-center py-3">
          Tester mon éligibilité
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        {config.quickCallbackOpen && (
          <Link href="/rappel" className="btn-ghost px-4 py-3" aria-label="Être recontacté(e) sans faire le test">
            <PhoneCall className="size-5" aria-hidden />
          </Link>
        )}
      </StickyCta>
    </>
  );
}
