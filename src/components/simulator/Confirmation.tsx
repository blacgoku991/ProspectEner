"use client";

import { Check, ChevronRight, Copy, House, Info, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FranceRenovNotice } from "@/components/site/FranceRenovNotice";
import type { OverallOutcome } from "@/engine/types";
import type { PublicConfig } from "@/lib/public-config";
import { useOrigin } from "@/lib/use-browser";
import type { SubmitSuccess } from "./ContactForm";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(iso));

const PROJECT_STATUS: Record<OverallOutcome, string> = {
  POTENTIALLY_ELIGIBLE: "Potentiellement éligible aux aides",
  NEEDS_REVIEW: "Éligibilité à confirmer",
  NOT_ELIGIBLE: "Conditions non remplies selon vos réponses",
  OUT_OF_SCOPE: "Hors du périmètre du simulateur",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Confirmation : la personne sait qu'elle va être recontactée, par qui, comment et quand.
 * Aucun dossier d'aide n'est déposé ; un lien personnel permet d'annuler la demande.
 */
export function Confirmation({
  result,
  config,
  project,
  visual,
}: {
  result: SubmitSuccess;
  config: PublicConfig;
  /** Projet et résultat du test (parcours avec simulation). */
  project?: { works: string; outcome: OverallOutcome };
  /** Illustration facultative (maison 3D du simulateur). */
  visual?: React.ReactNode;
}) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const cancelUrl = `${origin}/annulation#ref=${encodeURIComponent(result.reference)}&t=${encodeURIComponent(result.cancelToken)}`;
  const company = config.companyName;
  const byPhone = result.channel === "PHONE";
  // Entreprise nommée dans la demande, telle qu'enregistrée par le serveur (aucune coordonnée conservée ici).
  const partner = result.partnerName || null;

  return (
    <div className="mx-auto max-w-5xl space-y-6" role="status" aria-live="polite">
      <section className="card overflow-hidden">
        <div className="grid md:grid-cols-[1.15fr_1fr]">
          <div className="p-6 sm:p-10">
            <p className="flex items-center gap-2 text-sm font-semibold text-pine-700">
              <span className="grid size-6 place-items-center rounded-full bg-pine-600 text-white">
                <Check className="size-4" aria-hidden />
              </span>
              Merci pour votre confiance
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-ink-950 sm:text-4xl">Vous allez être recontacté(e)</h2>
            <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink-800">
              <li className="flex gap-3">
                <ChevronRight className="mt-0.5 size-5 shrink-0 text-pine-600" aria-hidden />
                {byPhone ? (
                  <span>
                    Un conseiller de {company} va vous appeler
                    {result.contactDisplay ? (
                      <>
                        {" "}
                        au <strong className="whitespace-nowrap text-pine-700">{result.contactDisplay}</strong>
                      </>
                    ) : null}
                    {result.callbackDeadline ? `, au plus tard le ${fmt(result.callbackDeadline)}` : ` dans les ${config.callbackDelayBusinessDays} jours ouvrables`}.
                  </span>
                ) : (
                  <span>
                    Un conseiller de {company} va vous répondre par e-mail
                    {result.contactDisplay ? (
                      <>
                        {" "}
                        à <strong className="break-all text-pine-700">{result.contactDisplay}</strong>
                      </>
                    ) : null}
                    .
                  </span>
                )}
              </li>
              {partner && (
                <li className="flex gap-3">
                  <ChevronRight className="mt-0.5 size-5 shrink-0 text-pine-600" aria-hidden />
                  <span>
                    Votre demande est aussi transmise à <strong className="text-ink-950">{partner}</strong>, l&apos;entreprise qui réalise les travaux :
                    elle pourra vous recontacter à ce sujet.
                  </span>
                </li>
              )}
              <li className="flex gap-3">
                <ChevronRight className="mt-0.5 size-5 shrink-0 text-pine-600" aria-hidden />
                <span>Il vérifie avec vous les conditions des aides, sans engagement.</span>
              </li>
              <li className="flex gap-3">
                <ChevronRight className="mt-0.5 size-5 shrink-0 text-pine-600" aria-hidden />
                <span>
                  {config.referral
                    ? "Il organise ensuite votre rendez-vous avec l'entreprise qui réalise les travaux."
                    : "Il vous présente ensuite le détail des aides adaptées à votre projet."}
                </span>
              </li>
            </ul>
            <p className="mt-6 text-sm text-ink-500">
              Référence de votre demande : <strong className="font-mono text-base tracking-wider text-ink-900">{result.reference}</strong>
            </p>
          </div>
          {visual && (
            <div className="relative hidden min-h-72 bg-gradient-to-br from-pine-50 via-sand-100 to-sand-200 md:block" aria-hidden>
              {visual}
            </div>
          )}
        </div>
      </section>

      {project && (
        <section className="card p-6 sm:p-8" aria-labelledby="projet-titre">
          <h3 id="projet-titre" className="flex items-center gap-3 text-xl font-bold text-ink-950">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-pine-50 text-pine-700">
              <House className="size-5" aria-hidden />
            </span>
            {capitalize(project.works)}
          </h3>
          <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1.2fr]">
            <div className="rounded-2xl bg-pine-950 p-5 text-white">
              <p className="text-sm font-semibold text-amber-300">Votre éligibilité</p>
              <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-ink-950">
                <span className="block text-xs text-ink-500">Résultat du test</span>
                <span className="text-lg font-bold">{PROJECT_STATUS[project.outcome]}</span>
              </p>
              <p className="mt-3 text-sm text-white/75">
                Le montant des aides dépend de votre situation et des devis : votre conseiller le précise avec vous.
              </p>
            </div>
            <div>
              <p className="font-semibold text-ink-900">Avec votre conseiller :</p>
              <ul className="mt-3 space-y-2.5 text-ink-700">
                {[
                  "Validation de votre éligibilité aux aides",
                  "Précision de votre projet et de vos besoins",
                  config.referral ? "Rendez-vous avec l'entreprise qui réalise les travaux" : "Présentation des aides adaptées à votre projet",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-pine-600" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="card space-y-4 p-6 sm:p-8">
        <p className="text-ink-700">
          <span className="font-semibold text-ink-900">Votre demande :</span> « {result.requestSentence} »
        </p>
        <p className="flex gap-2 rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink-700">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
          Aucun dossier d&apos;aide n&apos;a été déposé : cette demande concerne uniquement un échange avec {company}
          {partner ? ` et ${partner}` : ""}. L&apos;attribution d&apos;une aide
          dépend de l&apos;instruction d&apos;un dossier par l&apos;organisme concerné.
        </p>
      </section>

      <div className="card space-y-3 p-6 sm:p-8">
        <h3 className="text-lg font-bold text-ink-900">Annuler votre demande</h3>
        <p className="text-sm text-ink-600">
          Conservez ce lien personnel : il vous permet d&apos;annuler votre demande à tout moment (et, si vous le souhaitez, de faire effacer vos
          coordonnées).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input readOnly value={cancelUrl} aria-label="Lien d'annulation" className="field-input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="btn-ghost shrink-0"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(cancelUrl);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href={`/annulation#ref=${encodeURIComponent(result.reference)}&t=${encodeURIComponent(result.cancelToken)}`} className="text-sm font-semibold text-red-700 underline">
            Annuler maintenant
          </Link>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 underline">
            <Printer className="size-4" aria-hidden /> Imprimer cette page
          </button>
        </div>
      </div>

      <FranceRenovNotice />
      <p className="text-center">
        <Link href="/" className="text-sm font-semibold text-pine-700 underline">
          Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}
