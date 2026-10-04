import { ArrowRight, Check, CircleHelp, X } from "lucide-react";
import Link from "next/link";
import type { CategoryCoverage } from "@/engine/coverage";
import { cn } from "@/lib/cn";

/** Ce qu'un dispositif couvre pour un type de travaux : couvert, à vérifier, non couvert (avec la raison). */
export function CoverageCard({
  coverage: c,
  href,
  className,
  headingLevel: Heading = "h3",
}: {
  coverage: CategoryCoverage;
  href?: string;
  className?: string;
  headingLevel?: "h3" | "h4";
}) {
  return (
    <div className={cn("rounded-2xl border border-ink-900/[0.07] bg-surface p-5", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Heading className="font-semibold text-ink-900">{c.name}</Heading>
        <span className="badge bg-ink-900/[0.06] text-ink-700">{c.kind}</span>
      </div>
      <ul className="space-y-1.5 text-sm">
        {c.covered.map((l) => (
          <li key={l} className="flex gap-2 text-ink-800">
            <Check className="mt-0.5 size-4 shrink-0 text-pine-600" aria-hidden />
            <span>
              <span className="sr-only">Couvert : </span>
              {l}
            </span>
          </li>
        ))}
        {c.review.map((l) => (
          <li key={l} className="flex gap-2 text-ink-800">
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
              <span className="sr-only">Non couvert : </span>
              {e.label} : {e.reason}
            </span>
          </li>
        ))}
      </ul>
      {href && (
        <Link href={href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-pine-700 hover:text-pine-800 hover:underline">
          Conditions de cette aide <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
