"use client";

import { Check, Copy, Info, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FranceRenovNotice } from "@/components/site/FranceRenovNotice";
import type { PublicConfig } from "@/lib/public-config";
import { useOrigin } from "@/lib/use-browser";
import type { SubmitSuccess } from "./ContactForm";

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(iso));

/** Confirmation honnête : demande enregistrée, aucun dossier d'aide déposé, lien d'annulation. */
export function Confirmation({ result, config }: { result: SubmitSuccess; config: PublicConfig }) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const cancelUrl = `${origin}/annulation#ref=${encodeURIComponent(result.reference)}&t=${encodeURIComponent(result.cancelToken)}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6" role="status" aria-live="polite">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-pine-600 to-pine-800 px-6 py-8 text-white sm:px-8">
          <span className="grid size-14 place-items-center rounded-2xl bg-white/15">
            <Check className="size-8" aria-hidden />
          </span>
          <h2 className="mt-4 text-3xl font-bold">Votre demande est bien enregistrée</h2>
          <p className="mt-2 text-white/85">
            Référence : <strong className="font-mono text-lg tracking-wider text-white">{result.reference}</strong>
          </p>
        </div>
        <div className="space-y-4 p-6 sm:p-8">
          <p className="text-ink-700">
            <span className="font-semibold text-ink-900">Votre demande :</span> « {result.requestSentence} »
          </p>
          {result.channel === "PHONE" ? (
            <p className="text-ink-700">
              {config.companyName} pourra vous rappeler dans les {config.callbackDelayBusinessDays} jours ouvrables suivant votre demande
              {result.callbackDeadline ? `, soit au plus tard le ${fmt(result.callbackDeadline)}` : ""}. L&apos;appel portera uniquement sur votre projet.
            </p>
          ) : (
            <p className="text-ink-700">{config.companyName} vous répondra par e-mail au sujet de votre projet.</p>
          )}
          <p className="flex gap-2 rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink-700">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
            Aucun dossier d&apos;aide n&apos;a été déposé : cette demande concerne uniquement un échange avec {config.companyName}. L&apos;attribution d&apos;une
            aide dépend de l&apos;instruction d&apos;un dossier par l&apos;organisme concerné.
          </p>
        </div>
      </div>

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
