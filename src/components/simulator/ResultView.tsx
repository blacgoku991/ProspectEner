"use client";

import { ArrowRight, CalendarClock, ChevronDown, CircleHelp, Compass, Info, Pencil, RotateCcw, SearchCheck, SearchX, ShieldCheck } from "lucide-react";
import { FranceRenovNotice } from "@/components/site/FranceRenovNotice";
import { IndependenceBadge } from "@/components/site/IndependenceBadge";
import { StickyCta } from "@/components/site/StickyCta";
import type { AnswerSummaryLine, QuestionId } from "@/engine/questionnaire";
import type { Evaluation, OverallOutcome } from "@/engine/types";
import { workLabel } from "@/engine/works";
import { cn } from "@/lib/cn";
import { INDICATIVE_NOTICE } from "@/lib/legal/texts";
import { visitorVerdict } from "@/lib/requests/shared";

const OUTCOME_STYLE: Record<OverallOutcome, { icon: typeof SearchCheck; ring: string; bg: string; iconBg: string }> = {
  POTENTIALLY_ELIGIBLE: { icon: SearchCheck, ring: "ring-pine-500/30", bg: "from-pine-50 to-white", iconBg: "bg-pine-600" },
  NEEDS_REVIEW: { icon: CircleHelp, ring: "ring-amber-500/30", bg: "from-amber-50 to-white", iconBg: "bg-amber-500" },
  NOT_ELIGIBLE: { icon: SearchX, ring: "ring-ink-900/10", bg: "from-sand-100 to-white", iconBg: "bg-ink-600" },
  OUT_OF_SCOPE: { icon: Compass, ring: "ring-sky-600/20", bg: "from-[#eef7fb] to-white", iconBg: "bg-sky-700" },
};

/** Pourquoi aucun rendez-vous n'est proposé (résultat non retenu dans les paramètres). */
const NOT_ACCEPTED_TEXT: Record<OverallOutcome, string> = {
  POTENTIALLY_ELIGIBLE: "",
  NEEDS_REVIEW:
    "Certaines conditions n'ont pas pu être confirmées d'après vos réponses. Si vous avez répondu « Je ne sais pas », précisez ces réponses ci-dessous si vous le pouvez.",
  NOT_ELIGIBLE:
    "Selon vos réponses, votre situation ne remplit pas les conditions des aides que nous accompagnons. Si une réponse est inexacte, vous pouvez la modifier ci-dessous.",
  OUT_OF_SCOPE: "Votre situation sort du périmètre de ce simulateur.",
};

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Phrase de synthèse, sans nommer les aides. */
function leadText(outcome: OverallOutcome, matched: number, toConfirm: number, profile: boolean): string | null {
  if (outcome === "POTENTIALLY_ELIGIBLE") {
    const others = toConfirm === 0 ? "" : toConfirm === 1 ? ", et une autre reste à confirmer" : `, et ${toConfirm} autres restent à confirmer`;
    if (profile) {
      return `D'après vos réponses, ${matched === 1 ? "une aide peut vous être accessible" : `${matched} aides peuvent vous être accessibles`}, selon les travaux envisagés${others}.`;
    }
    return `D'après vos réponses, ${matched === 1 ? "une aide peut" : `${matched} aides peuvent`} correspondre à votre projet${others}.`;
  }
  if (outcome === "NEEDS_REVIEW" && toConfirm > 0) {
    if (profile) {
      return `${toConfirm === 1 ? "Une aide pourrait vous être accessible" : `${toConfirm} aides pourraient vous être accessibles`}, sous réserve de vérification.`;
    }
    return `${toConfirm === 1 ? "Une aide pourrait" : `${toConfirm} aides pourraient`} correspondre à votre projet, sous réserve de vérification.`;
  }
  return null;
}

/**
 * Résultat présenté au visiteur : un verdict simple, sans le détail des aides. Le détail est
 * présenté lors de l'étude du projet ; l'équipe le retrouve en entier dans l'administration.
 * Le formulaire de contact (`contact`) s'affiche juste sous le verdict : le résultat reste
 * toujours visible avant toute demande de coordonnées.
 */
export function ResultView({
  evaluation,
  summary,
  canContact,
  notAccepted = false,
  channels,
  contact,
  onContact,
  onEdit,
  onRestart,
}: {
  evaluation: Evaluation;
  summary: AnswerSummaryLine[];
  canContact: boolean;
  /** Formulaire ouvert, mais ce résultat ne donne pas lieu à un rendez-vous (paramètres). */
  notAccepted?: boolean;
  channels: { phone: boolean; email: boolean };
  /** Formulaire de demande de rappel, affiché sous le verdict. */
  contact?: React.ReactNode;
  /** Amène au formulaire. */
  onContact: () => void;
  onEdit: (q: QuestionId) => void;
  onRestart: () => void;
}) {
  const { outcome } = evaluation;
  const profile = evaluation.scope === "PROFILE";
  const verdict = visitorVerdict(evaluation);
  const style = OUTCOME_STYLE[outcome];
  const Icon = style.icon;
  const matched = evaluation.results.filter((r) => r.status === "POTENTIALLY_ELIGIBLE").length;
  const toConfirm = evaluation.results.filter((r) => r.status === "NEEDS_REVIEW").length;
  const lead = leadText(outcome, matched, toConfirm, profile);
  const highlights = evaluation.results.flatMap((r) => r.highlights ?? []);
  // Critères non remplis (sans nom d'aide), pour comprendre un résultat défavorable et corriger une réponse.
  const blocking =
    outcome === "NOT_ELIGIBLE"
      ? [...new Set(evaluation.results.flatMap((r) => r.criteria.filter((c) => c.status === "NOT_MET").map((c) => c.label)))].slice(0, 3)
      : [];
  const cta = outcome === "NOT_ELIGIBLE" ? "Être recontacté(e) quand même" : "Être recontacté(e)";
  const channelText =
    channels.phone && channels.email ? "Réponse par e-mail ou par téléphone, au choix" : channels.phone ? "Rappel téléphonique à votre demande" : "Réponse par e-mail";

  return (
    <div className="space-y-6">
      <section className={cn("card overflow-hidden bg-gradient-to-br ring-2", style.bg, style.ring)} aria-labelledby="result-title">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-lift sm:size-14", style.iconBg)}>
              <Icon className="size-6 sm:size-7" aria-hidden />
            </span>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold uppercase tracking-wider text-ink-500">{verdict.kicker}</p>
              <h2 id="result-title" className="text-2xl font-bold leading-tight text-ink-950 sm:text-3xl">
                {verdict.title}
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-[15px] leading-relaxed text-ink-700">
            {lead && <p className="font-semibold text-ink-900">{lead}</p>}
            <p>{evaluation.headline}</p>
            {(outcome === "POTENTIALLY_ELIGIBLE" || outcome === "NEEDS_REVIEW") && !notAccepted && (
              <p>
                {profile
                  ? "Un conseiller vous rappelle pour faire le point sur vos travaux, vous présenter les aides adaptées et vérifier les conditions avec vous."
                  : "Un conseiller vous présente le détail des aides adaptées à votre projet et vérifie les conditions avec vous."}
              </p>
            )}
            {blocking.length > 0 && (
              <div className="pt-1">
                <p className="font-semibold text-ink-900">Points bloquants d&apos;après vos réponses :</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {blocking.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            {outcome === "NOT_ELIGIBLE" && canContact && (
              <p>Les aides des collectivités locales ne sont pas évaluées par ce simulateur : un conseiller peut tout de même étudier votre projet.</p>
            )}
          </div>

          {highlights.map((h) => (
            <p key={h.title + h.until} className="mt-4 flex gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-50 px-4 py-3 text-sm text-ink-800">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
              <span>
                <strong className="text-amber-900">Bon à savoir : </strong>
                {profile
                  ? `les primes pour un ${h.works.map((w) => workLabel(w).toLowerCase()).join(" ou un ")} sont temporairement renforcées si le devis est signé au plus tard le ${longDate(h.until)}, sous conditions.`
                  : `pour votre projet (${h.works.map((w) => workLabel(w).toLowerCase()).join(", ")}), les aides sont temporairement renforcées si le devis est signé au plus tard le ${longDate(h.until)}, sous conditions.`}
              </span>
            </p>
          ))}

          <div id="result-cta" className="mt-6">
            {canContact ? (
              <button type="button" onClick={onContact} className="btn-primary w-full justify-center px-7 py-4 text-base sm:w-auto">
                {cta}
                <ArrowRight className="size-5" aria-hidden />
              </button>
            ) : notAccepted ? (
              <div className="flex gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm text-ink-700 ring-1 ring-inset ring-ink-900/10">
                <Info className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
                <p>
                  <strong className="text-ink-900">Nous ne pouvons pas vous proposer de rendez-vous. </strong>
                  {NOT_ACCEPTED_TEXT[outcome]} Le service public France Rénov&apos; vous conseille gratuitement, y compris sur les aides locales.
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-500">La prise de contact en ligne n&apos;est pas encore ouverte sur ce site.</p>
            )}
          </div>
          {canContact && (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-600">
              {["Sans engagement", channelText, "Demande annulable à tout moment"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-4 shrink-0 text-pine-600" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 space-y-2 border-t border-ink-900/[0.06] pt-5">
            <IndependenceBadge />
            <p className="text-xs leading-relaxed text-ink-500">{INDICATIVE_NOTICE}</p>
          </div>
        </div>
      </section>

      {canContact && contact}

      <details className="card group" open={notAccepted}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-sm font-semibold text-ink-800 hover:bg-sand-50 sm:px-8">
          Revoir ou modifier mes réponses
          <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
        </summary>
        <dl className="divide-y divide-ink-900/[0.06] px-6 pb-4 sm:px-8">
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
      </details>

      <FranceRenovNotice />
      {canContact && (
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
