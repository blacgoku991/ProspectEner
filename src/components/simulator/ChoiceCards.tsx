"use client";

import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: LucideIcon;
}

interface SingleProps<T extends string> {
  options: ChoiceOption<T>[];
  value: T | undefined;
  onSelect: (value: T) => void;
  label: string;
  columns?: 1 | 2 | 3 | 4;
  compact?: boolean;
}

const gridCols = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" };

/** Choix unique : boutons accessibles (aria-pressed), sélection à la souris, au clavier ou au toucher. */
export function SingleChoice<T extends string>({ options, value, onSelect, label, columns = 2, compact = false }: SingleProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("grid gap-3", gridCols[columns])}>
      {options.map((o) => {
        const selected = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(o.value)}
            className={cn(
              "group relative flex w-full items-center gap-3.5 rounded-2xl border-2 bg-surface text-left transition-all duration-200",
              compact ? "px-4 py-3" : "px-4 py-4 sm:px-5",
              selected
                ? "border-pine-500 bg-pine-50 shadow-glow"
                : "border-ink-900/[0.08] hover:-translate-y-0.5 hover:border-pine-300 hover:shadow-soft",
            )}
          >
            {Icon && (
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-xl transition",
                  selected ? "bg-pine-600 text-white" : "bg-sand-100 text-ink-700 group-hover:bg-pine-100 group-hover:text-pine-800",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink-900">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-sm text-ink-500">{o.hint}</span>}
            </span>
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border-2 transition",
                selected ? "border-pine-600 bg-pine-600 text-white" : "border-ink-900/15 text-transparent",
              )}
            >
              <Check className="size-3.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface MultiProps<T extends string> {
  options: ChoiceOption<T>[];
  values: T[];
  onChange: (values: T[]) => void;
  label: string;
  columns?: 1 | 2 | 3 | 4;
  /** Valeur exclusive (ex. « je ne sais pas ») qui désélectionne les autres. */
  exclusive?: T[];
}

export function MultiChoice<T extends string>({ options, values, onChange, label, columns = 2, exclusive = [] }: MultiProps<T>) {
  const toggle = (v: T) => {
    if (values.includes(v)) return onChange(values.filter((x) => x !== v));
    if (exclusive.includes(v)) return onChange([v]);
    return onChange([...values.filter((x) => !exclusive.includes(x)), v]);
  };
  return (
    <div role="group" aria-label={label} className={cn("grid gap-3", gridCols[columns])}>
      {options.map((o) => {
        const selected = values.includes(o.value);
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="checkbox"
            aria-checked={selected}
            onClick={() => toggle(o.value)}
            className={cn(
              "group flex w-full items-center gap-3.5 rounded-2xl border-2 bg-surface px-4 py-4 text-left transition-all duration-200 sm:px-5",
              selected ? "border-pine-500 bg-pine-50 shadow-glow" : "border-ink-900/[0.08] hover:-translate-y-0.5 hover:border-pine-300 hover:shadow-soft",
            )}
          >
            {Icon && (
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-xl transition",
                  selected ? "bg-pine-600 text-white" : "bg-sand-100 text-ink-700 group-hover:bg-pine-100 group-hover:text-pine-800",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink-900">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-sm text-ink-500">{o.hint}</span>}
            </span>
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-lg border-2 transition",
                selected ? "border-pine-600 bg-pine-600 text-white" : "border-ink-900/15 text-transparent",
              )}
            >
              <Check className="size-3.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
