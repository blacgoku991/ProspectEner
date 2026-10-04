"use client";

import { ArrowRight, CircleHelp, Compass, Pencil, RotateCcw, SearchCheck, SearchX } from "lucide-react";
import { EvaluationDetails } from "@/components/evaluation/EvaluationDetails";
import { FranceRenovNotice } from "@/components/site/FranceRenovNotice";
import { IndependenceBadge } from "@/components/site/IndependenceBadge";
import type { AnswerSummaryLine, QuestionId } from "@/engine/questionnaire";
import type { Evaluation, OverallOutcome } from "@/engine/types";
import { cn } from "@/lib/cn";
import { FRANCE_RENOV_URL, INDICATIVE_NOTICE } from "@/lib/legal/texts";

const OUTCOME_STYLE: Record<OverallOutcome, { icon: typeof SearchCheck; ring: string; bg: string; iconBg: string; title: string }> = {
  POTENTIALLY_ELIGIBLE: { icon: SearchCheck, ring: "ring-pine-500/30", bg: "from-pine-50 to-white", iconBg: "bg-pine-600", title: "Résultat encourageant" },
  NEEDS_REVIEW: { icon: CircleHelp, ring: "ring-amber-500/30", bg: "from-amber-50 to-white", iconBg: "bg-amber-500", title: "Vérification complémentaire nécessaire" },
  NOT_ELIGIBLE: { icon: SearchX, ring: "ring-ink-900/10", bg: "from-sand-100 to-white", iconBg: "bg-ink-600", title: "Critères non remplis selon vos réponses" },
  OUT_OF_SCOPE: { icon: Compass, ring: "ring-sky-600/20", bg: "from-[#eef7fb] to-white", iconBg: "bg-sky-700", title: "Hors du périmètre du simulateur" },
};

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export function ResultView({
  evaluation,
  ruleSetLabel,
  summary,
  canContact,
  onContact,
  onEdit,
  onRestart,
}: {
  evaluation: Evaluation;
  ruleSetLabel: string;
  summary: AnswerSummaryLine[];
  canContact: boolean;
  onContact: () => void;
  onEdit: (q: QuestionId) => void;
  onRestart: () => void;
}) {
  const style = OUTCOME_STYLE[evaluation.outcome];
  const Icon = style.icon;
  const cta =
    evaluation.outcome === "POTENTIALLY_ELIGIBLE" || evaluation.outcome === "NEEDS_REVIEW"
      ? "Demander une étude de mon projet"
      : evaluation.outcome === "OUT_OF_SCOPE"
        ? "Demander une étude complémentaire"
        : null;

  return (
    <div className="space-y-8">
      <section className={cn("card overflow-hidden bg-gradient-to-br ring-2", style.bg, style.ring)} aria-labelledby="result-title">
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-lift", style.iconBg)}>
              <Icon className="size-7" aria-hidden />
            </span>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-ink-500">{style.title}</p>
              <h2 id="result-title" className="text-2xl font-bold leading-snug text-ink-950 sm:text-3xl">
                {evaluation.headline}
              </h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <IndependenceBadge />
            <p className="text-sm leading-relaxed text-ink-600">{INDICATIVE_NOTICE}</p>
            <p className="text-xs text-ink-500">
              Date de référence : {longDate(evaluation.referenceDate)} · Barème « {ruleSetLabel} » (version {evaluation.ruleSetVersion}) · Moteur{" "}
              {evaluation.engineVersion}
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {cta && canContact && (
              <button type="button" onClick={onContact} className="btn-primary px-7 py-4 text-base">
                {cta}
                <ArrowRight className="size-5" aria-hidden />
              </button>
            )}
            {evaluation.outcome === "NOT_ELIGIBLE" && canContact && (
              <button type="button" onClick={onContact} className="btn-ghost">
                Échanger quand même sur mon projet
              </button>
            )}
            <a href={FRANCE_RENOV_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-ink-700 underline underline-offset-2">
              Conseil gratuit du service public France Rénov&apos;
            </a>
          </div>
          {!canContact && (
            <p className="mt-4 text-sm text-ink-500">La prise de contact en ligne n&apos;est pas encore ouverte sur ce site.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="disp-title" className="space-y-4">
        <h2 id="disp-title" className="text-xl font-bold text-ink-900">
          Le détail, dispositif par dispositif
        </h2>
        <EvaluationDetails evaluation={evaluation} />
      </section>

      <section aria-labelledby="answers-title" className="card p-6 sm:p-8">
        <h2 id="answers-title" className="text-xl font-bold text-ink-900">
          Les réponses qui ont conduit à ce résultat
        </h2>
        <dl className="mt-4 divide-y divide-ink-900/[0.06]">
          {summary.map((line) => (
            <div key={`${line.question}-${line.label}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <dt className="text-sm text-ink-500">{line.label}</dt>
              <dd className="flex items-center gap-3 text-sm font-medium text-ink-900">
                {line.value}
                <button
                  type="button"
                  onClick={() => onEdit(line.question)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-pine-700 hover:bg-pine-50"
                  aria-label={`Modifier : ${line.label}`}
                >
                  <Pencil className="size-3.5" aria-hidden /> Modifier
                </button>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <FranceRenovNotice />
      <p className="text-center">
        <button type="button" onClick={onRestart} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-600 underline">
          <RotateCcw className="size-4" aria-hidden /> Recommencer la simulation
        </button>
      </p>
    </div>
  );
}
