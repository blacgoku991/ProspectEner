import { ArrowRight, BadgeCheck, CalendarClock, CircleSlash, Clock, FileSearch, Gift, Landmark, ListChecks, MessageSquareText, PhoneCall, Sparkles, UserX } from "lucide-react";
import Link from "next/link";
import HouseHero from "@/components/three/HouseHero";
import { AidExplorer, type ExplorerTab } from "@/components/site/AidExplorer";
import { FranceRenovNotice } from "@/components/site/FranceRenovNotice";
import { IndependenceBadge } from "@/components/site/IndependenceBadge";
import { StickyCta } from "@/components/site/StickyCta";
import { TrackStep } from "@/components/site/TrackStep";
import { coverageForCategory, DISPOSITIF_INFO, WORK_ITEMS } from "@/engine";
import { parisToday } from "@/lib/business-days";
import { getPublicConfig } from "@/lib/public-config";
import { getPublishedRuleSet } from "@/lib/rulesets";

export default async function HomePage() {
  const [{ config }, ruleSet] = await Promise.all([getPublicConfig(), getPublishedRuleSet()]);
  const rules = ruleSet.data;
  // Bonifications temporaires en cours (barème publié) : échéance réelle et datée, jamais de compte à rebours.
  const today = parisToday();
  const bonuses = rules.dispositifs.CEE.enabled
    ? rules.dispositifs.CEE.temporaryBonuses.filter((b) => b.engagedFrom <= today && today <= b.engagedUntil)
    : [];
  const longDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const tabs: ExplorerTab[] = [
    { focus: "chauffage", label: "Chauffage & PAC", coverage: [...coverageForCategory(rules, "PAC"), ...coverageForCategory(rules, "CHAUFFAGE")] },
    { focus: "isolation", label: "Isolation", coverage: coverageForCategory(rules, "ISOLATION") },
    { focus: "eau-chaude", label: "Eau chaude", coverage: coverageForCategory(rules, "EAU_CHAUDE") },
    { focus: "ventilation", label: "Ventilation", coverage: coverageForCategory(rules, "VENTILATION") },
    { focus: "global", label: "Rénovation globale", coverage: coverageForCategory(rules, "RENOVATION_GLOBALE") },
  ].map((t) => ({ ...t, coverage: mergeCoverage(t.coverage) })) as ExplorerTab[];

  const d = rules.dispositifs;
  const labels = (items: string[]) => items.map((i) => WORK_ITEMS[i as keyof typeof WORK_ITEMS].label.toLowerCase()).join(", ");
  const aids = [
    {
      id: "MPR_GESTE" as const,
      enabled: d.MPR_GESTE.enabled,
      text: `Travaux couverts actuellement : ${labels(d.MPR_GESTE.eligibleWorks)}. Réservé aux propriétaires, selon les revenus du ménage.`,
    },
    {
      id: "MPR_AMPLEUR" as const,
      enabled: d.MPR_AMPLEUR.enabled,
      text: `Projet global sur un logement classé ${d.MPR_AMPLEUR.eligibleDpe.join(", ")}, avec un gain d'au moins deux classes et un accompagnement obligatoire.`,
    },
    {
      id: "CEE" as const,
      enabled: d.CEE.enabled,
      text: "Primes versées par des fournisseurs d'énergie pour de nombreux travaux (isolation, chauffage, eau chaude…), à solliciter avant de signer le devis.",
    },
    {
      id: "ECO_PTZ" as const,
      enabled: d.ECO_PTZ.enabled,
      text: "Un prêt sans intérêts et sans condition de ressources, à rembourser : ce n'est pas une subvention.",
    },
  ].filter((a) => a.enabled);

  return (
    <>
      <TrackStep step="landing" />

      {/* ─── Héros ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-pine-200/50 blur-3xl" />
          <div className="absolute -right-32 top-24 size-[460px] rounded-full bg-[#ffd9a8]/50 blur-3xl" />
          <div className="absolute inset-0 grain" />
        </div>
        <div className="container-page relative grid items-center gap-10 pb-12 pt-10 sm:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-20">
          <div className="animate-fade-up space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-pine-600/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-pine-800 shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" aria-hidden />
              Règles {rules.incomeCeilings.year} · réforme du 1er septembre 2026 intégrée
            </p>
            {bonuses.map((b) => (
              <Link
                key={b.title + b.engagedUntil}
                href="/simulation"
                className="flex w-fit max-w-xl items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-50/90 px-4 py-2.5 text-sm leading-snug text-ink-800 shadow-sm backdrop-blur transition hover:bg-amber-50"
              >
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                <span>
                  <strong className="text-amber-900">Jusqu&apos;au {longDate.format(new Date(`${b.engagedUntil}T00:00:00Z`))} :</strong>{" "}
                  {b.title.toLowerCase()} pour {b.works.map((w) => WORK_ITEMS[w].label.toLowerCase()).join(" et ")} (devis signé d&apos;ici là, sous
                  conditions). <span className="font-semibold text-pine-800 underline underline-offset-2">Vérifier mon projet</span>
                </span>
              </Link>
            ))}
            <h1 className="text-[2.6rem] font-extrabold leading-[1.02] text-ink-950 sm:text-6xl">
              Votre rénovation peut-elle être{" "}
              <span className="relative whitespace-nowrap text-pine-700">
                aidée
                <svg aria-hidden viewBox="0 0 200 12" className="absolute -bottom-2 left-0 h-3 w-full text-amber-glow">
                  <path d="M2 9c48-6 98-8 196-3" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>{" "}
              ?
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-ink-600">
              Quelques questions sur votre logement et votre projet : vous voyez <strong className="text-ink-900">immédiatement</strong> un
              résultat indicatif, dispositif par dispositif — <strong className="text-ink-900">avant toute demande de coordonnées</strong>.
            </p>
            <div id="hero-cta" className="flex flex-col gap-3 sm:flex-row">
              <Link href="/simulation" className="btn-primary whitespace-nowrap px-7 py-4 text-base">
                Tester mon éligibilité
                <ArrowRight className="size-5" aria-hidden />
              </Link>
              <Link href="/rappel" className="btn-ghost whitespace-nowrap px-6 py-4 text-base">
                <PhoneCall className="size-5" aria-hidden />
                Je préfère être recontacté(e)
              </Link>
            </div>
            <ul className="flex max-w-xl flex-wrap gap-2.5 text-sm text-ink-700">
              {[
                { icon: Gift, text: "Gratuit" },
                { icon: Clock, text: "3 minutes environ" },
                { icon: FileSearch, text: "Résultat expliqué" },
                { icon: UserX, text: "Sans compte" },
                { icon: CircleSlash, text: "Aucun justificatif" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
                  <Icon className="size-4 shrink-0 text-pine-600" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
            {config.qualifications && (
              <p className="flex max-w-xl items-start gap-2 text-sm text-ink-700">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-pine-600" aria-hidden />
                <span>
                  <span className="font-semibold text-ink-900">Qualifications : </span>
                  {config.qualifications}
                </span>
              </p>
            )}
            <IndependenceBadge />
          </div>

          <div className="relative h-[340px] sm:h-[460px] lg:h-[560px]">
            <div aria-hidden className="absolute inset-6 rounded-[3rem] bg-gradient-to-br from-white/70 to-white/10 shadow-lift ring-1 ring-white/60 backdrop-blur-sm" />
            <HouseHero focus="global" className="absolute inset-6 aspect-auto" />
            <div className="absolute bottom-8 left-2 hidden animate-float-slow rounded-2xl bg-white/90 px-4 py-3 shadow-lift backdrop-blur sm:block">
              <p className="text-xs font-medium text-ink-500">Résultat indicatif</p>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-pine-700">
                <BadgeCheck className="size-4" aria-hidden /> Critères expliqués un par un
              </p>
            </div>
          </div>
        </div>
        <div className="container-page relative pb-6">
          <FranceRenovNotice />
        </div>
      </section>

      {/* ─── Fonctionnement ────────────────────────────────────────────────── */}
      <section id="fonctionnement" className="container-page scroll-mt-28 py-16 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-pine-700">Comment ça marche</p>
          <h2 className="mt-2 text-3xl font-bold text-ink-950 sm:text-4xl">Un parcours clair, à votre rythme</h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            { icon: ListChecks, title: "Le questionnaire", text: "Logement, projet, avancement : seules les questions utiles aux règles évaluées vous sont posées." },
            { icon: FileSearch, title: "Le résultat indicatif", text: "Pour chaque dispositif : les critères remplis, ceux qui ne le sont pas et ce qui reste à vérifier." },
            { icon: MessageSquareText, title: "Une étude, si vous le voulez", text: "Vous choisissez de nous transmettre vos coordonnées, et par quel canal vous souhaitez une réponse." },
            {
              icon: Landmark,
              title: "Aucun dossier déposé",
              text: "Le simulateur ne dépose rien auprès d'un organisme public : l'attribution dépend de l'instruction de votre dossier.",
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="card group relative overflow-hidden p-6 transition hover:-translate-y-1 hover:shadow-lift">
              <span aria-hidden className="absolute -right-3 -top-6 font-display text-8xl font-extrabold text-pine-50 transition group-hover:text-pine-100">
                {i + 1}
              </span>
              <span className="relative grid size-11 place-items-center rounded-2xl bg-pine-600 text-white shadow-glow">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="relative mt-5 text-lg font-bold text-ink-900">{title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-ink-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── Explorateur 3D ────────────────────────────────────────────────── */}
      <section className="container-page py-8 sm:py-12">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-pine-700">Explorer</p>
          <h2 className="mt-2 text-3xl font-bold text-ink-950 sm:text-4xl">Quels travaux, quels dispositifs ?</h2>
          <p className="mt-3 text-ink-600">
            Les règles ont beaucoup changé en 2026. Sélectionnez une famille de travaux pour voir ce que chaque dispositif couvre — et ce
            qu&apos;il ne couvre plus.
          </p>
        </div>
        <AidExplorer tabs={tabs} ruleSetLabel={rules.meta.label} />
      </section>

      {/* ─── Dispositifs ───────────────────────────────────────────────────── */}
      <section id="aides" className="container-page scroll-mt-28 py-16 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-pine-700">Les aides évaluées</p>
          <h2 className="mt-2 text-3xl font-bold text-ink-950 sm:text-4xl">Subventions, primes et prêts : ce n&apos;est pas la même chose</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {aids.map((a) => {
            const info = DISPOSITIF_INFO[a.id];
            return (
              <article key={a.id} className="card p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      info.kind === "Subvention"
                        ? "badge bg-pine-100 text-pine-800"
                        : info.kind === "Prime"
                          ? "badge bg-[#fff1df] text-ember-600"
                          : "badge bg-sky-soft text-ink-800"
                    }
                  >
                    {info.kind}
                  </span>
                  <span className="text-xs text-ink-500">{info.provider}</span>
                </div>
                <h3 className="mt-3 text-xl font-bold text-ink-900">{info.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{a.text}</p>
              </article>
            );
          })}
        </div>
        <p className="mt-6 max-w-3xl text-sm text-ink-500">
          Non évalués : aides des collectivités locales, MaPrimeRénov&apos; Copropriété, situations en outre-mer. Le simulateur ne calcule pas de
          montant : il indique une pré-éligibilité expliquée, à confirmer.
        </p>
      </section>

      {/* ─── Qui sommes-nous (uniquement si configuré) ─────────────────────── */}
      {config.activityDescription && (
        <section className="container-page py-8">
          <div className="card grid gap-6 p-8 md:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-pine-700">Qui sommes-nous</p>
              <h2 className="mt-2 text-2xl font-bold text-ink-950">{config.companyName}</h2>
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
      <section className="container-page py-16">
        <h2 className="mb-8 text-3xl font-bold text-ink-950">Questions fréquentes</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            {
              q: "Est-ce un site officiel ?",
              a: "Non. C'est un service privé indépendant, non affilié à l'État, à l'Anah ou à France Rénov'. Le service public d'information est accessible gratuitement sur france-renov.gouv.fr.",
            },
            {
              q: "Le résultat vaut-il accord d'une aide ?",
              a: "Non. Il s'agit d'une pré-éligibilité indicative, fondée sur vos réponses et sur les règles enregistrées à la date affichée. Seule l'instruction du dossier par l'organisme concerné décide de l'attribution.",
            },
            {
              q: "Dois-je donner mes coordonnées pour voir le résultat ?",
              a: "Non. Le résultat s'affiche directement. Vous pouvez ensuite, si vous le souhaitez, demander une étude de votre projet.",
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
          ].map(({ q, a }) => (
            <details key={q} className="card group p-5 open:shadow-lift">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900">
                {q}
                <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-sand-100 text-ink-600 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── Appel final ───────────────────────────────────────────────────── */}
      <section className="container-page">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink-900 px-6 py-12 text-white sm:px-12">
          <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-pine-500/30 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 left-10 size-72 rounded-full bg-ember-500/20 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold">Prêt(e) à y voir plus clair ?</h2>
              <p className="mt-2 max-w-xl text-white/75">Résultat immédiat, sans compte et sans engagement.</p>
            </div>
            <Link href="/simulation" className="btn bg-white px-7 py-4 text-base text-ink-900 hover:bg-sand-100">
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
        <Link href="/rappel" className="btn-ghost px-4 py-3" aria-label="Être recontacté(e) sans faire le test">
          <PhoneCall className="size-5" aria-hidden />
        </Link>
      </StickyCta>
    </>
  );
}

function mergeCoverage(list: ReturnType<typeof coverageForCategory>) {
  const map = new Map<string, (typeof list)[number]>();
  for (const c of list) {
    const prev = map.get(c.id);
    if (!prev) map.set(c.id, { ...c, covered: [...c.covered], review: [...c.review], excluded: [...c.excluded] });
    else {
      prev.covered.push(...c.covered);
      prev.review.push(...c.review);
      prev.excluded.push(...c.excluded);
    }
  }
  return [...map.values()];
}
