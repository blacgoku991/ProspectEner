"use client";

import { useSyncExternalStore } from "react";
import { captureAcquisition } from "@/components/simulator/acquisition";
import { parseConsent, readConsentRaw, subscribeConsent, writeConsent } from "@/lib/consent";
import { cn } from "@/lib/cn";

/** Modifier son choix à tout moment (même poids pour accepter et refuser). */
export function ConsentPreferences({ initialRaw }: { initialRaw: string | null }) {
  const raw = useSyncExternalStore(subscribeConsent, readConsentRaw, () => initialRaw);
  const consent = parseConsent(raw);
  const state = consent ? (consent.acquisition ? "Accepté" : "Refusé") : "Pas encore choisi";
  const option = (accept: boolean, label: string) => {
    const active = consent?.acquisition === accept;
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => {
          writeConsent(accept);
          if (accept) captureAcquisition();
        }}
        className={cn("btn border px-5 py-2.5", active ? "border-pine-500 bg-pine-50 text-ink-900" : "border-ink-900/15 bg-surface text-ink-800 hover:border-ink-900/30")}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="not-prose space-y-3 rounded-2xl border border-ink-900/10 p-4">
      <p className="text-sm text-ink-700">
        <span className="font-semibold text-ink-900">Origine des visites</span> (campagne, site d&apos;origine) — votre choix :{" "}
        <span className="font-semibold text-ink-900">{state}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {option(false, "Refuser")}
        {option(true, "Accepter")}
      </div>
    </div>
  );
}
