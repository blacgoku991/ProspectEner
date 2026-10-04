import { ArrowRight, BrickWall, Droplets, Fan, Flame, HousePlus, Wind } from "lucide-react";
import Link from "next/link";
import { DISPOSITIF_INFO } from "@/engine/coverage";
import type { RuleSetData } from "@/engine/ruleset-schema";
import { aidsForWork, aidSummary, enabledAidGuides, PUBLIC_SHORT_NAMES, WORK_GUIDES } from "@/lib/guides";
import { cn } from "@/lib/cn";

const WORK_ICONS = {
  "pompe-a-chaleur": Fan,
  isolation: BrickWall,
  chauffage: Flame,
  "chauffe-eau": Droplets,
  ventilation: Wind,
  "renovation-globale": HousePlus,
} as const;

const KIND_STYLE = {
  Subvention: "bg-pine-100 text-pine-800",
  Prime: "bg-ember-500/10 text-ember-600",
  Prêt: "bg-sky-soft text-ink-800",
} as const;

/** Cartes « types de travaux » → pages /travaux/… (aides évaluées issues du barème publié). */
export function WorkGuideCards({ rules, headingLevel: Heading = "h3" }: { rules: RuleSetData; headingLevel?: "h2" | "h3" }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {WORK_GUIDES.map((g) => {
        const Icon = WORK_ICONS[g.slug as keyof typeof WORK_ICONS] ?? HousePlus;
        const aids = aidsForWork(rules, g).map((id) => PUBLIC_SHORT_NAMES[id]);
        return (
          <li key={g.slug}>
            <Link
              href={`/travaux/${g.slug}`}
              className="group flex h-full items-start gap-4 rounded-2xl border border-ink-900/[0.07] bg-surface p-5 transition hover:-translate-y-0.5 hover:border-pine-500/30 hover:shadow-soft"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pine-50 text-pine-700 transition group-hover:bg-pine-600 group-hover:text-white">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <Heading className="font-semibold text-ink-900">{g.name}</Heading>
                <span className="mt-1 block text-sm text-ink-500">{aids.length ? [...new Set(aids)].join(" · ") : "Non couvert par les aides évaluées"}</span>
              </span>
              <ArrowRight className="mt-1 size-4 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-pine-700" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Cartes des aides évaluées → pages /aides/… */
export function AidGuideCards({ rules, className }: { rules: RuleSetData; className?: string }) {
  return (
    <ul className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {enabledAidGuides(rules).map((g) => {
        const info = DISPOSITIF_INFO[g.id];
        return (
          <li key={g.id}>
            <Link
              href={`/aides/${g.slug}`}
              className="group flex h-full flex-col rounded-3xl border border-ink-900/[0.07] bg-surface p-6 transition hover:-translate-y-0.5 hover:border-pine-500/30 hover:shadow-soft"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className={cn("badge", KIND_STYLE[info.kind])}>{info.kind}</span>
                <span className="text-xs text-ink-500">{info.provider}</span>
              </span>
              <h3 className="mt-3 text-xl font-bold text-ink-900">{info.name}</h3>
              <span className="mt-2 block flex-1 text-sm leading-relaxed text-ink-600">{aidSummary(rules, g.id)}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-pine-700">
                Conditions et travaux <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
