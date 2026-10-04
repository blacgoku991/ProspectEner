import { CalendarClock, CheckCircle2, CircleHelp, Compass, XCircle } from "lucide-react";
import { DISPOSITIF_INFO } from "@/engine/coverage";
import type { DispositifResult, DispositifStatus, Evaluation } from "@/engine/types";
import { workLabel } from "@/engine/works";
import { cn } from "@/lib/cn";
import { VISITOR_VERDICTS } from "@/lib/requests/shared";

const GROUPS: { status: DispositifStatus; label: string; icon: typeof CheckCircle2; className: string }[] = [
  { status: "POTENTIALLY_ELIGIBLE", label: "Potentiellement éligible", icon: CheckCircle2, className: "bg-pine-50 text-pine-900 ring-pine-600/20" },
  { status: "NEEDS_REVIEW", label: "À vérifier", icon: CircleHelp, className: "bg-amber-50 text-amber-900 ring-amber-600/20" },
  { status: "NOT_ELIGIBLE", label: "Critères non remplis", icon: XCircle, className: "bg-sand-100 text-ink-800 ring-ink-900/10" },
  { status: "OUT_OF_SCOPE", label: "Hors périmètre", icon: Compass, className: "bg-[#eef7fb] text-ink-800 ring-sky-600/20" },
];

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Raison principale à connaître avant l'échange (critère non rempli ou à vérifier). */
function mainReason(r: DispositifResult): string | null {
  const wanted = r.status === "NOT_ELIGIBLE" ? "NOT_MET" : r.status === "NEEDS_REVIEW" ? "UNKNOWN" : null;
  if (!wanted) return null;
  const labels = r.criteria.filter((c) => c.status === wanted).map((c) => c.label);
  return labels.length ? labels.slice(0, 2).join(" · ") : null;
}

/** Synthèse d'éligibilité réservée à l'équipe : aides par statut, travaux concernés, bonifications. */
export function EligibilitySummary({ evaluation }: { evaluation: Evaluation }) {
  const highlights = evaluation.results.flatMap((r) => r.highlights ?? []);
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-sand-50 px-4 py-3 text-sm">
        <p className="text-ink-500">Verdict affiché au visiteur (sans le détail des aides)</p>
        <p className="font-semibold text-ink-900">« {VISITOR_VERDICTS[evaluation.outcome].title} »</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {GROUPS.map((g) => {
          const items = evaluation.results.filter((r) => r.status === g.status);
          if (items.length === 0) return null;
          const Icon = g.icon;
          return (
            <div key={g.status} className={cn("rounded-xl px-4 py-3 ring-1 ring-inset", g.className)}>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                <Icon className="size-4" aria-hidden />
                {g.label}
              </p>
              <ul className="mt-2 space-y-2 text-sm">
                {items.map((r) => {
                  const reason = mainReason(r);
                  return (
                    <li key={r.id}>
                      <span className="font-semibold">{DISPOSITIF_INFO[r.id].name}</span>{" "}
                      <span className="text-xs opacity-75">({DISPOSITIF_INFO[r.id].kind})</span>
                      {r.coveredWorks.length > 0 && <span className="block text-xs opacity-80">{r.coveredWorks.map(workLabel).join(", ")}</span>}
                      {reason && <span className="block text-xs opacity-80">{reason}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      {highlights.map((h) => (
        <p key={h.title + h.until} className="flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-ink-800 ring-1 ring-inset ring-amber-600/20">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
          <span>
            <strong>{h.title}</strong> jusqu&apos;au {fmt(h.until)} : {h.works.map((w) => workLabel(w).toLowerCase()).join(", ")} (devis signé d&apos;ici là, sous
            conditions).
          </span>
        </p>
      ))}
    </div>
  );
}
