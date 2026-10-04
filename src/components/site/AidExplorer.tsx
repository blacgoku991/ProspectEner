"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, CircleHelp, Flame, Home, Layers, Wind, X, Droplets } from "lucide-react";
import { useState } from "react";
import HouseHero from "@/components/three/HouseHero";
import type { HouseFocus } from "@/components/three/types";
import type { CategoryCoverage } from "@/engine/coverage";
import { cn } from "@/lib/cn";

export interface ExplorerTab {
  focus: Exclude<HouseFocus, "none">;
  label: string;
  coverage: CategoryCoverage[];
}

const ICONS: Record<ExplorerTab["focus"], typeof Home> = {
  isolation: Layers,
  chauffage: Flame,
  "eau-chaude": Droplets,
  ventilation: Wind,
  global: Home,
};

/** Exploration interactive : la maison 3D met en évidence les travaux, la liste vient du barème publié. */
export function AidExplorer({ tabs, ruleSetLabel }: { tabs: ExplorerTab[]; ruleSetLabel: string }) {
  const [active, setActive] = useState<ExplorerTab["focus"]>(tabs[0]?.focus ?? "chauffage");
  const tab = tabs.find((t) => t.focus === active) ?? tabs[0];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_1fr]">
      <div className="relative flex min-h-[360px] flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-pine-50 via-sand-100 to-[#fff3e2] shadow-soft sm:h-[480px] lg:sticky lg:top-28 lg:h-[540px]">
        <div className="pointer-events-none absolute inset-0 grain opacity-60" />
        <div className="relative min-h-[240px] flex-1">
          <HouseHero focus={active} className="absolute inset-0 aspect-auto" />
        </div>
        <div className="relative flex flex-wrap gap-2 px-3 pb-3 sm:px-5 sm:pb-5" role="tablist" aria-label="Familles de travaux">
          {tabs.map((t) => {
            const Icon = ICONS[t.focus];
            const selected = t.focus === active;
            return (
              <button
                key={t.focus}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="explorer-panel"
                onClick={() => setActive(t.focus)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold shadow-sm backdrop-blur transition",
                  selected ? "bg-ink-900 text-white" : "bg-white/80 text-ink-800 hover:bg-white",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div id="explorer-panel" role="tabpanel" className="card relative flex flex-col p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {tab && (
            <motion.div
              key={tab.focus}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <h3 className="text-2xl font-bold text-ink-900">{tab.label}</h3>
              {tab.coverage.length === 0 && <p className="text-ink-600">Aucun dispositif évalué ne couvre ces travaux.</p>}
              {tab.coverage.map((c) => (
                <div key={c.id} className="rounded-2xl border border-ink-900/[0.07] bg-sand-50/60 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{c.name}</p>
                    <span className="badge bg-ink-900/[0.06] text-ink-700">{c.kind}</span>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {c.covered.map((l) => (
                      <li key={l} className="flex gap-2 text-ink-700">
                        <Check className="mt-0.5 size-4 shrink-0 text-pine-600" aria-hidden />
                        <span>
                          <span className="sr-only">Évalué : </span>
                          {l}
                        </span>
                      </li>
                    ))}
                    {c.review.map((l) => (
                      <li key={l} className="flex gap-2 text-ink-700">
                        <CircleHelp className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                        <span>
                          {l} <span className="text-ink-500">— à vérifier</span>
                        </span>
                      </li>
                    ))}
                    {c.excluded.map((e) => (
                      <li key={e.label} className="flex gap-2 text-ink-500">
                        <X className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                        <span>
                          {e.label} : {e.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-auto pt-6 text-xs text-ink-500">
          Selon le barème « {ruleSetLabel} ». Une correspondance ne vaut pas éligibilité : le questionnaire vérifie les autres conditions.
        </p>
      </div>
    </div>
  );
}
