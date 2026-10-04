import { CalendarClock, CheckCircle2, ChevronDown, CircleHelp, CircleMinus, ExternalLink, Info, XCircle } from "lucide-react";
import type { CriterionStatus, DispositifResult, DispositifStatus, Evaluation } from "@/engine/types";
import { workLabel } from "@/engine/works";
import { cn } from "@/lib/cn";

export const STATUS_META: Record<DispositifStatus, { label: string; className: string; dot: string }> = {
  POTENTIALLY_ELIGIBLE: { label: "Potentiellement éligible", className: "bg-pine-100 text-pine-800 ring-pine-600/20", dot: "bg-pine-500" },
  NEEDS_REVIEW: { label: "Vérification nécessaire", className: "bg-amber-100 text-amber-900 ring-amber-600/20", dot: "bg-amber-500" },
  NOT_ELIGIBLE: { label: "Critères non remplis selon vos réponses", className: "bg-ink-900/[0.06] text-ink-700 ring-ink-900/10", dot: "bg-ink-400" },
  OUT_OF_SCOPE: { label: "Hors périmètre du simulateur", className: "bg-sky-soft text-ink-800 ring-ink-900/10", dot: "bg-sky-600" },
  NOT_CONCERNED: { label: "Non concerné par vos travaux", className: "bg-sand-100 text-ink-600 ring-ink-900/5", dot: "bg-ink-300" },
};

const KIND_LABELS = { SUBVENTION: "Subvention", PRIME: "Prime", PRET: "Prêt" } as const;

const CRITERION_ICON: Record<CriterionStatus, { icon: typeof CheckCircle2; className: string; sr: string }> = {
  MET: { icon: CheckCircle2, className: "text-pine-600", sr: "Critère rempli" },
  NOT_MET: { icon: XCircle, className: "text-red-600", sr: "Critère non rempli" },
  UNKNOWN: { icon: CircleHelp, className: "text-amber-600", sr: "À vérifier" },
  NOT_APPLICABLE: { icon: CircleMinus, className: "text-ink-400", sr: "Non applicable" },
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export function StatusBadge({ status, className }: { status: DispositifStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("badge ring-1 ring-inset", m.className, className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function DispositifCard({ result, defaultOpen = false }: { result: DispositifResult; defaultOpen?: boolean }) {
  return (
    <article className="card overflow-hidden" aria-labelledby={`disp-${result.id}`}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-ink-900 text-white">{KIND_LABELS[result.aidKind]}</span>
          <StatusBadge status={result.status} />
        </div>
        <h3 id={`disp-${result.id}`} className="mt-3 text-xl font-bold text-ink-900">
          {result.name}
        </h3>
        <p className="text-sm text-ink-500">{result.provider}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{result.summary}</p>
        {result.coveredWorks.length > 0 && (
          <p className="mt-2 text-sm text-ink-600">
            <span className="font-medium text-ink-800">Travaux concernés :</span> {result.coveredWorks.map(workLabel).join(", ")}
          </p>
        )}
        {result.highlights?.map((h) => (
          <div key={h.title + h.until} className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-50 px-4 py-3 text-sm text-ink-800">
            <p className="flex items-center gap-2 font-semibold text-amber-900">
              <CalendarClock className="size-4 shrink-0" aria-hidden />
              {h.title} · jusqu&apos;au {fmt(h.until)}
            </p>
            <p className="mt-1 leading-relaxed">{h.text}</p>
            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {h.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber-900 underline underline-offset-2">
                  {s.label}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ))}
            </p>
          </div>
        ))}
      </div>
      <details className="group border-t border-ink-900/[0.06]" open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-sm font-semibold text-pine-800 hover:bg-sand-50 sm:px-6">
          Critères, conditions à vérifier et sources
          <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-5 px-5 pb-6 sm:px-6">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-ink-900">Critères évalués d&apos;après vos réponses</h4>
            <ul className="space-y-2">
              {result.criteria.map((c) => {
                const meta = CRITERION_ICON[c.status];
                const Icon = meta.icon;
                return (
                  <li key={c.id} className="flex gap-2.5 text-sm">
                    <Icon className={cn("mt-0.5 size-4.5 shrink-0", meta.className)} aria-hidden />
                    <span>
                      <span className="sr-only">{meta.sr} : </span>
                      <span className="font-medium text-ink-900">{c.label}.</span> <span className="text-ink-600">{c.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          {result.remainingConditions.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-ink-900">Conditions restant à vérifier</h4>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-600">
                {result.remainingConditions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {result.notes.length > 0 && (
            <div className="space-y-1.5">
              {result.notes.map((n) => (
                <p key={n} className="flex gap-2 rounded-xl bg-sand-100 px-3 py-2 text-sm text-ink-700">
                  <Info className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
                  {n}
                </p>
              ))}
            </div>
          )}
          {result.verificationNote && <p className="text-xs text-ink-500">{result.verificationNote}</p>}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-ink-900">Sources officielles</h4>
            <ul className="space-y-1 text-sm">
              {result.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-pine-700 underline decoration-pine-300 underline-offset-2 hover:text-pine-900">
                    {s.label}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-500">
              Règles vérifiées le {fmt(result.verifiedAt)} · applicables du {fmt(result.validFrom)}
              {result.validUntil ? ` au ${fmt(result.validUntil)} (à revérifier ensuite)` : ""}.
            </p>
          </div>
        </div>
      </details>
    </article>
  );
}

/** Rendu complet d'une évaluation (visiteur et administration). */
export function EvaluationDetails({ evaluation, showNotConcerned = false }: { evaluation: Evaluation; showNotConcerned?: boolean }) {
  const shown = evaluation.results.filter((r) => r.status !== "NOT_CONCERNED");
  const hidden = evaluation.results.filter((r) => r.status === "NOT_CONCERNED");
  const order: DispositifStatus[] = ["POTENTIALLY_ELIGIBLE", "NEEDS_REVIEW", "NOT_ELIGIBLE", "OUT_OF_SCOPE", "NOT_CONCERNED"];
  shown.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return (
    <div className="space-y-4">
      {shown.map((r, i) => (
        <DispositifCard key={r.id} result={r} defaultOpen={i === 0 && r.status !== "OUT_OF_SCOPE"} />
      ))}
      {hidden.length > 0 && (
        <details className="rounded-2xl border border-dashed border-ink-900/15 px-5 py-3 text-sm text-ink-600" open={showNotConcerned}>
          <summary className="cursor-pointer font-medium text-ink-700">Dispositifs non concernés par vos travaux ({hidden.length})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {hidden.map((r) => (
              <li key={r.id}>
                {r.name} : {STATUS_META.NOT_CONCERNED.label.toLowerCase()}.
              </li>
            ))}
          </ul>
        </details>
      )}
      {evaluation.notices.length > 0 && (
        <ul className="space-y-1.5 rounded-2xl bg-sand-100 px-5 py-4 text-sm text-ink-600">
          {evaluation.notices.map((n) => (
            <li key={n} className="flex gap-2">
              <Info className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
