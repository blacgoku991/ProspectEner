import type { IncomeCategory } from "@/engine/types";
import { cn } from "@/lib/cn";
import { INCOME_PROFILE } from "@/lib/leads/profile";

/** Couleurs des catégories de revenus (codes France Rénov' / Anah : bleu, jaune, violet, rose). */
export const INCOME_BADGE_CLASS: Record<IncomeCategory, string> = {
  TRES_MODESTE: "bg-blue-100 text-blue-900 ring-blue-600/20",
  MODESTE: "bg-yellow-100 text-yellow-900 ring-yellow-600/25",
  INTERMEDIAIRE: "bg-violet-100 text-violet-900 ring-violet-600/20",
  SUPERIEUR: "bg-pink-100 text-pink-900 ring-pink-600/20",
};

/** Pastille de catégorie de revenus ; « Revenus ? » si la réponse est inconnue. */
export function IncomeBadge({ category, long = false, className }: { category: IncomeCategory | null; long?: boolean; className?: string }) {
  if (!category) return <span className={cn("badge bg-sand-200 text-ink-600", className)}>Revenus ?</span>;
  return (
    <span className={cn("badge ring-1 ring-inset", INCOME_BADGE_CLASS[category], className)} title={INCOME_PROFILE[category].label}>
      {long ? INCOME_PROFILE[category].label : INCOME_PROFILE[category].short}
    </span>
  );
}
