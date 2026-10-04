import { ShieldCheck } from "lucide-react";
import { INDEPENDENCE_DISCLAIMER } from "@/lib/legal/texts";
import { cn } from "@/lib/cn";

export function IndependenceBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <p
      className={cn(
        "inline-flex items-start gap-2 rounded-xl border border-ember-500/25 bg-ember-500/[0.07] px-3 py-2 text-sm font-medium text-ink-800",
        compact && "px-2.5 py-1.5 text-xs",
        className,
      )}
    >
      <ShieldCheck className={cn("mt-0.5 shrink-0 text-ember-600", compact ? "size-3.5" : "size-4")} aria-hidden />
      <span>{INDEPENDENCE_DISCLAIMER}</span>
    </p>
  );
}
