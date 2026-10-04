"use client";

import { Loader2, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { resolveTerritory, TERRITORY_LABELS } from "@/engine/territory";
import { cn } from "@/lib/cn";

export interface LocationValue {
  postalCode?: string;
  communeInsee?: string;
  communeName?: string;
}

interface Commune {
  insee: string;
  name: string;
  departement: string;
}

interface Lookup {
  cp: string;
  communes: Commune[];
  /** Le service de recherche n'a pas répondu : le code postal seul est accepté. */
  failed: boolean;
}

/** Code postal + choix de la commune (données officielles embarquées côté serveur). */
export function LocationField({
  value,
  onChange,
  autoFocus = false,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [input, setInput] = useState(value.postalCode ?? "");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const valid = /^\d{5}$/.test(input);
  const communes = valid && lookup?.cp === input ? lookup.communes : null;
  const loading = valid && lookup?.cp !== input;
  const notFound = Boolean(communes && communes.length === 0 && !lookup?.failed);
  const error = input.length === 5 && !valid ? "Le code postal doit contenir 5 chiffres." : notFound ? "Code postal introuvable : vérifiez votre saisie." : null;

  useEffect(() => {
    if (!/^\d{5}$/.test(input)) return;
    const controller = new AbortController();
    const done = (list: Commune[], failed: boolean) => {
      setLookup({ cp: input, communes: list, failed });
      const current = valueRef.current;
      if (failed) {
        // Repli : le service ne répond pas, le code postal suffit à déterminer le territoire.
        onChangeRef.current({ postalCode: input });
      } else if (list.length === 0) {
        onChangeRef.current({});
      } else if (list.length === 1) {
        const c = list[0]!;
        onChangeRef.current({ postalCode: input, communeInsee: c.insee, communeName: c.name });
      } else if (current.postalCode !== input || !list.some((c) => c.insee === current.communeInsee)) {
        onChangeRef.current({ postalCode: input });
      }
    };
    fetch(`/api/communes?cp=${input}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ communes: Commune[] }>;
      })
      .then((data) => done(data.communes, false))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") done([], true);
      });
    return () => controller.abort();
  }, [input]);

  const territory = value.postalCode ? resolveTerritory(value).territory : null;
  const showChoice = communes && communes.length > 1;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${id}-cp`} className="field-label">
          Code postal du logement
        </label>
        <div className="relative max-w-xs">
          <MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            id={`${id}-cp`}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            autoFocus={autoFocus}
            value={input}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-err` : undefined}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 5);
              setInput(next);
              if (next !== valueRef.current.postalCode && valueRef.current.postalCode) onChange({});
            }}
            className="field-input pl-12 text-lg tracking-[0.2em]"
            placeholder="69003"
          />
          {loading && <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-ink-400" aria-hidden />}
        </div>
        {error && (
          <p id={`${id}-err`} className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>

      {showChoice && (
        <fieldset>
          <legend className="field-label">Commune</legend>
          <div className="flex flex-wrap gap-2">
            {communes.map((c) => {
              const selected = value.communeInsee === c.insee;
              return (
                <button
                  key={c.insee}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ postalCode: input, communeInsee: c.insee, communeName: c.name })}
                  className={cn(
                    "rounded-full border-2 px-4 py-2 text-sm font-medium transition",
                    selected ? "border-pine-500 bg-pine-50 text-pine-900" : "border-ink-900/10 bg-surface text-ink-700 hover:border-pine-300",
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {value.postalCode && territory && !error && (value.communeName || lookup?.failed) && (
        <p
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
            territory === "IDF" || territory === "METRO" ? "bg-pine-50 text-pine-800" : "bg-amber-50 text-amber-900",
          )}
          role="status"
        >
          <MapPin className="size-4" aria-hidden />
          {value.communeName ? `${value.communeName} — ` : ""}
          {TERRITORY_LABELS[territory]}
          {territory !== "IDF" && territory !== "METRO" ? " : hors périmètre du simulateur" : ""}
        </p>
      )}
    </div>
  );
}
