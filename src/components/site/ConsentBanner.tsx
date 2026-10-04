"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { captureAcquisition } from "@/components/simulator/acquisition";
import { parseConsent, readConsentRaw, subscribeConsent, writeConsent } from "@/lib/consent";

/**
 * Bandeau de choix au premier passage, en haut de page et dans le flux : il ne recouvre jamais la
 * mention France Rénov' ni le contenu. « Refuser » et « Accepter » au même niveau, sans bloquer la
 * navigation ; le choix se modifie à tout moment depuis « Cookies et préférences ».
 * `initialRaw` : cookie lu par le serveur, pour que la page arrive déjà avec ou sans bandeau.
 */
export function ConsentBanner({ initialRaw }: { initialRaw: string | null }) {
  const raw = useSyncExternalStore(subscribeConsent, readConsentRaw, () => initialRaw);
  if (parseConsent(raw)) return null;

  const choose = (accept: boolean) => {
    writeConsent(accept);
    if (accept) captureAcquisition();
  };

  const button = "btn flex-1 border border-ink-900/15 bg-surface px-5 py-2 text-ink-900 hover:border-ink-900/30 sm:flex-none";
  return (
    <div role="region" aria-label="Choix des cookies" className="border-b border-ink-900/10 bg-surface">
      <div className="container-page flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm leading-relaxed text-ink-700">
          Nous aimerions savoir d&apos;où viennent nos visiteurs (campagne, site d&apos;origine), sans publicité ni cookie tiers. Vous pouvez accepter
          ou refuser.{" "}
          <Link href="/cookies" className="font-medium text-ink-900 underline underline-offset-2">
            Personnaliser
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => choose(false)} className={button}>
            Refuser
          </button>
          <button type="button" onClick={() => choose(true)} className={button}>
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
