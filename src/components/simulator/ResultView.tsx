"use client";

import { ArrowRight, CalendarClock, Check, CircleHelp, Compass, Pencil, RotateCcw, SearchCheck, SearchX, ShieldCheck } from "lucide-react";
import { EvaluationDetails } from "@/components/evaluation/EvaluationDetails";
import { FranceRenovNotice } from "@/components/site/FranceRenovNotice";
import { IndependenceBadge } from "@/components/site/IndependenceBadge";
import { StickyCta } from "@/components/site/StickyCta";
import { DISPOSITIF_INFO } from "@/engine/coverage";
import { workLabel } from "@/engine/works";
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
  channels,
  onContact,
  onEdit,
  onRestart,
}: {
  evaluation: Evaluation;
  ruleSetLabel: string;
  summary: AnswerSummaryLine[];
  canContact: boolean;
  channels: { phone: boolean; email: boolean };
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
  const matched = evaluation.results.filter((r) => r.status === "POTENTIALLY_ELIGIBLE");
  const toConfirm = evaluation.results.filter((r) => r.status === "NEEDS_REVIEW");
  const highlights = evaluation.results.flatMap((r) => r.highlights ?? []);
  const channelText =
    channels.phone && channels.email ? "Réponse par e-mail ou par téléphone, au choix" : channels.phone ? "Rappel téléphonique à votre demande" : "Réponse par e-mail";
  const showCta = Boolean(cta && canContact);

  return (
    <div className="space-y-8">
      <section className={cn("card overflow-hidden bg-gradient-to-br ring-2", style.bg, style.ring)} aria-labelledby="result-title">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-lift sm:size-14", style.iconBg)}>
              <Icon className="size-6 sm:size-7" aria-hidden />
            </span>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wider text-ink-500">{style.title}</p>
              <h2 id="result-title" className="text-xl font-bold leading-snug text-ink-950 sm:text-3xl">
                {evaluation.headline}
              </h2>
            </div>
          </div>
          {(matched.length > 0 || toConfirm.length > 0) && (
            <div className="mt-5 space-y-2">
              {matched.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {matched.length === 1 ? "1 aide peut correspondre à votre projet :" : `${matched.length} aides peuvent correspondre à votre projet :`}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {matched.map((r) => (
                      <li key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-pine-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
                        <Check className="size-4" aria-hidden />
                        {DISPOSITIF_INFO[r.id].name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {toConfirm.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-ink-900">À confirmer lors de l&apos;étude :</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {toConfirm.map((r) => (
                      <li key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-900">
                        <CircleHelp className="size-4" aria-hidden />
                        {DISPOSITIF_INFO[r.id].name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {highlights.map((h) => (
            <p key={h.title + h.until} className="mt-4 flex gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-50 px-4 py-3 text-sm text-ink-800">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
              <span>
                <strong className="text-amber-900">Bon à savoir : </strong>
                {h.title.toLowerCase()} pour {h.works.map((w) => workLabel(w).toLowerCase()).join(" et ")}, pour un devis signé au plus tard le{" "}
                {longDate(h.until)}, sous conditions (détail ci-dessous).
              </span>
            </p>
          ))}
          <div className="mt-5 space-y-3">
            <IndependenceBadge />
            <p className="text-sm leading-relaxed text-ink-600">{INDICATIVE_NOTICE}</p>
            <p className="text-xs text-ink-500">
              Date de référence : {longDate(evaluation.referenceDate)} · Barème « {ruleSetLabel} » (version {evaluation.ruleSetVersion}) · Moteur{" "}
              {evaluation.engineVersion}
            </p>
          </div>
          <div id="result-cta" className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {showCta && (
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
          {showCta && (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-600">
              {["Sans engagement", channelText, "Demande annulable à tout moment"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-4 shrink-0 text-pine-600" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          )}
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
      {showCta && cta && (
        <StickyCta triggerId="result-cta">
          <p className="hidden flex-1 text-sm text-ink-600 sm:block">Sans engagement · {channelText.toLowerCase()}</p>
          <button type="button" onClick={onContact} className="btn-primary w-full justify-center py-3 sm:w-auto">
            {cta}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </StickyCta>
      )}
      <p className="text-center">
        <button type="button" onClick={onRestart} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-600 underline">
          <RotateCcw className="size-4" aria-hidden /> Recommencer la simulation
        </button>
      </p>
    </div>
  );
}
