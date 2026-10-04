"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CircleHelp, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HouseHero from "@/components/three/HouseHero";
import type { HouseFocus } from "@/components/three/types";
import { evaluate } from "@/engine/evaluate";
import {
  firstUnanswered,
  isAnswered,
  pruneAnswers,
  type QuestionContext,
  type QuestionId,
  questionText,
  STEPS,
  type StepId,
  summarizeAnswers,
  visibleQuestions,
} from "@/engine/questionnaire";
import type { RuleSet } from "@/engine/ruleset-schema";
import type { Answers } from "@/engine/types";
import { NO_STATE_DATA_NOTICE } from "@/lib/legal/texts";
import type { PublicConfig } from "@/lib/public-config";
import { trackStep } from "@/lib/funnel";
import { worksTextForRequest } from "@/lib/requests/shared";
import { cn } from "@/lib/cn";
import { Confirmation } from "./Confirmation";
import { ContactForm, type SubmitSuccess } from "./ContactForm";
import { QuestionView, questionNeedsContinue } from "./QuestionView";
import { ResultView } from "./ResultView";

type Phase = "questions" | "result" | "contact" | "done";

interface Persisted {
  v: 1;
  ruleSetVersion: string;
  referenceDate: string;
  answers: Answers;
  current: QuestionId;
  phase: Phase;
  returnToResult: boolean;
  done: SubmitSuccess | null;
}

const STORAGE_KEY = "pe-simulation";

function loadPersisted(ruleSetVersion: string, referenceDate: string): Persisted | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Persisted;
    return saved.v === 1 && saved.ruleSetVersion === ruleSetVersion && saved.referenceDate === referenceDate ? saved : null;
  } catch {
    return null;
  }
}

function stepOf(q: QuestionId): StepId {
  return (STEPS.find((s) => s.questions.includes(q)) ?? STEPS[0]!).id;
}

function focusFor(answers: Answers, current: QuestionId): HouseFocus {
  const works = answers.works ?? [];
  if (current === "insulationItems") return "isolation";
  if (current === "heatPumpType" || current === "heatingTarget" || current === "currentHeating") return "chauffage";
  if (current === "hotWaterTarget") return "eau-chaude";
  if (current === "ventilationTarget") return "ventilation";
  if (works.includes("RENOVATION_GLOBALE") || works.length > 1) return "global";
  if (works.includes("PAC") || works.includes("CHAUFFAGE")) return "chauffage";
  if (works.includes("ISOLATION")) return "isolation";
  if (works.includes("EAU_CHAUDE")) return "eau-chaude";
  if (works.includes("VENTILATION")) return "ventilation";
  return "none";
}

export default function Simulator({
  ruleSet,
  referenceDate,
  config,
}: {
  ruleSet: RuleSet;
  referenceDate: string;
  config: PublicConfig;
}) {
  const ctx: QuestionContext = useMemo(() => ({ rules: ruleSet.data, referenceDate }), [ruleSet, referenceDate]);
  // Composant rendu uniquement dans le navigateur : la session est restaurée dès l'initialisation.
  const [initial] = useState(() => loadPersisted(ruleSet.version, referenceDate));
  const [answers, setAnswers] = useState<Answers>(initial?.answers ?? {});
  const [current, setCurrent] = useState<QuestionId>(initial?.current ?? "location");
  const [phase, setPhase] = useState<Phase>(initial?.phase ?? "questions");
  const [returnToResult, setReturnToResult] = useState(Boolean(initial?.returnToResult));
  const [done, setDone] = useState<SubmitSuccess | null>(initial?.done ?? null);
  const [direction, setDirection] = useState(1);
  const trackedSteps = useRef(new Set<string>());
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      const data: Persisted = { v: 1, ruleSetVersion: ruleSet.version, referenceDate, answers, current, phase, returnToResult, done };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // stockage indisponible : la session n'est pas conservée
    }
  }, [answers, current, phase, returnToResult, done, ruleSet.version, referenceDate]);

  // ─── Historique du navigateur : le bouton « précédent » revient d'une question ──
  const navigate = useCallback((nextPhase: Phase, nextQuestion: QuestionId, push = true) => {
    setPhase(nextPhase);
    setCurrent(nextQuestion);
    const hash = nextPhase === "questions" ? `#q-${nextQuestion}` : `#${nextPhase === "result" ? "resultat" : nextPhase === "contact" ? "contact" : "confirmation"}`;
    if (push && window.location.hash !== hash) window.history.pushState(null, "", hash);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const h = window.location.hash;
      setDirection(-1);
      if (h.startsWith("#q-")) {
        setPhase((p) => (p === "done" ? p : "questions"));
        setCurrent(h.slice(3) as QuestionId);
      } else if (h === "#resultat") setPhase((p) => (p === "done" ? p : "result"));
      else if (h === "#contact") setPhase((p) => (p === "done" ? p : "contact"));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ─── Calculs dérivés ─────────────────────────────────────────────────────
  const visible = useMemo(() => visibleQuestions(answers, ctx), [answers, ctx]);
  // Tant que le code postal n'est pas saisi, la progression est estimée pour un territoire couvert.
  const estimated = useMemo(
    () => (answers.postalCode ? visible : visibleQuestions({ ...answers, postalCode: "75001" }, ctx)),
    [answers, ctx, visible],
  );
  const answeredCount = estimated.filter((q) => isAnswered(q, answers)).length;
  const progress = phase === "questions" ? Math.round((answeredCount / Math.max(estimated.length, 1)) * 100) : 100;
  const pruned = useMemo(() => pruneAnswers(answers, ctx), [answers, ctx]);
  const evaluation = useMemo(
    () => (phase === "questions" ? null : evaluate(pruned, ruleSet, referenceDate)),
    [phase, pruned, ruleSet, referenceDate],
  );
  const currentVisible = visible.includes(current) ? current : (firstUnanswered(answers, ctx) ?? visible[visible.length - 1] ?? "location");
  const stepId = stepOf(currentVisible);
  const visibleSteps = STEPS.filter((s) => s.questions.some((q) => estimated.includes(q)));

  useEffect(() => {
    if (phase === "questions") {
      if (!trackedSteps.current.has("start")) {
        trackedSteps.current.add("start");
        trackStep("questionnaire_start");
      }
      if (!trackedSteps.current.has(stepId)) {
        trackedSteps.current.add(stepId);
        trackStep(`step_${stepId}`);
      }
    } else if (phase === "result" && !trackedSteps.current.has("result")) {
      trackedSteps.current.add("result");
      trackStep("result");
    }
  }, [phase, stepId]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [currentVisible, phase]);

  // ─── Navigation dans le questionnaire ────────────────────────────────────
  const goNext = useCallback(
    (nextAnswers: Answers) => {
      setDirection(1);
      const nextVisible = visibleQuestions(nextAnswers, ctx);
      const missing = firstUnanswered(nextAnswers, ctx);
      if (returnToResult && missing === null) {
        setReturnToResult(false);
        navigate("result", currentVisible);
        return;
      }
      const idx = nextVisible.indexOf(currentVisible);
      const following = idx >= 0 ? nextVisible[idx + 1] : missing;
      if (following) navigate("questions", following);
      else if (missing) navigate("questions", missing);
      else navigate("result", currentVisible);
    },
    [ctx, currentVisible, navigate, returnToResult],
  );

  const answersRef = useRef<Answers>(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const update = useCallback(
    (patch: Partial<Answers>, advance = false) => {
      const next = { ...answersRef.current, ...patch };
      answersRef.current = next;
      setAnswers(next);
      if (advance) setTimeout(() => goNext(next), 220);
    },
    [goNext],
  );

  const goBack = () => {
    setDirection(-1);
    const idx = visible.indexOf(currentVisible);
    if (idx > 0) navigate("questions", visible[idx - 1]!);
  };

  const canContinue = isAnswered(currentVisible, answers) || currentVisible === "householdSize";

  const onContinue = () => {
    if (currentVisible === "householdSize" && !answers.householdSize) {
      const next = { ...answers, householdSize: 1 };
      setAnswers(next);
      goNext(next);
      return;
    }
    if (canContinue) goNext(answers);
  };

  const restart = () => {
    setAnswers({});
    setReturnToResult(false);
    setDone(null);
    trackedSteps.current.clear();
    navigate("questions", "location");
  };

  // ─── Confirmation ────────────────────────────────────────────────────────
  if (phase === "done" && done) {
    return <Confirmation result={done} config={config} />;
  }

  // ─── Résultat & contact ──────────────────────────────────────────────────
  if ((phase === "result" || phase === "contact") && evaluation) {
    const location = [pruned.postalCode, pruned.communeName].filter(Boolean).join(" ");
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 ref={headingRef} tabIndex={-1} className="sr-only">
          {phase === "result" ? "Résultat de votre simulation" : "Être recontacté(e) au sujet de votre projet"}
        </h1>
        {phase === "result" && (
          <ResultView
            evaluation={evaluation}
            summary={summarizeAnswers(pruned, ctx)}
            canContact={config.submissionsOpen}
            channels={config.channels}
            onContact={() => navigate("contact", currentVisible)}
            onEdit={(q) => {
              setReturnToResult(true);
              navigate("questions", q);
            }}
            onRestart={restart}
          />
        )}
        {phase === "contact" && (
          <div className="card p-6 sm:p-8">
            <button type="button" onClick={() => navigate("result", currentVisible)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
              <ArrowLeft className="size-4" aria-hidden /> Revenir au résultat
            </button>
            <h2 className="text-2xl font-bold text-ink-950">Être recontacté(e) au sujet de votre projet</h2>
            <p className="mt-2 text-ink-600">
              Un conseiller étudie votre projet et vous présente le détail des aides adaptées. Vos réponses et le résultat indicatif sont joints à votre
              demande ; {config.companyName} vous recontactera uniquement au sujet de ce projet.
            </p>
            <div className="mt-6">
              <ContactForm
                kind="SIMULATION"
                config={config}
                answers={pruned}
                ruleSetVersion={ruleSet.version}
                referenceDate={referenceDate}
                locationLabel={location || "non précisé"}
                worksText={worksTextForRequest("SIMULATION", pruned)}
                onSuccess={(r) => {
                  setDone(r);
                  navigate("done", currentVisible);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Questionnaire ───────────────────────────────────────────────────────
  const text = questionText(currentVisible, answers, ctx);
  const qIndex = visible.indexOf(currentVisible);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        <div className="mb-5" aria-label="Progression">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm">
            <p className="font-semibold text-ink-800">
              {STEPS.find((s) => s.id === stepId)?.title}
              <span className="ml-2 font-normal text-ink-500">
                Question {qIndex + 1} sur {estimated.length}
              </span>
            </p>
            <p className="font-semibold text-pine-700">{progress}%</p>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-ink-900/[0.07]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Avancement du questionnaire"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-pine-500 to-pine-700 transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <ol className="mt-3 hidden gap-2 sm:flex">
            {visibleSteps.map((s) => {
              const idx = visibleSteps.findIndex((x) => x.id === stepId);
              const me = visibleSteps.findIndex((x) => x.id === s.id);
              return (
                <li
                  key={s.id}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-1 text-center text-xs font-medium",
                    me < idx ? "bg-pine-50 text-pine-800" : me === idx ? "bg-ink-900 text-white" : "bg-ink-900/[0.04] text-ink-500",
                  )}
                  aria-current={me === idx ? "step" : undefined}
                >
                  {s.title.replace(/^(Le |La |L')/, "").replace(/^./, (c) => c.toUpperCase())}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="card relative overflow-hidden p-5 sm:p-8">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={currentVisible}
              custom={direction}
              initial={{ opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -28 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold leading-snug text-ink-950 outline-none sm:text-[1.75rem]">
                {text.title}
              </h1>
              {text.help && (
                <p className="mt-2 flex gap-2 text-sm leading-relaxed text-ink-600">
                  <CircleHelp className="mt-0.5 size-4 shrink-0 text-pine-600" aria-hidden />
                  {text.help}
                </p>
              )}
              <div className="mt-6">
                <QuestionView id={currentVisible} answers={answers} ctx={ctx} update={update} />
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink-900/[0.06] pt-5">
            <button
              type="button"
              onClick={goBack}
              disabled={qIndex <= 0}
              className="btn-ghost disabled:invisible"
            >
              <ArrowLeft className="size-4" aria-hidden /> Retour
            </button>
            {(questionNeedsContinue(currentVisible) || isAnswered(currentVisible, answers)) && (
              <button type="button" onClick={onContinue} disabled={!canContinue} className="btn-primary">
                {firstUnanswered(answers, ctx) === null && qIndex === visible.length - 1 ? "Voir mon résultat" : "Continuer"}
                <ArrowRight className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs text-ink-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-pine-600" aria-hidden />
          Vos réponses restent dans votre navigateur tant que vous n&apos;envoyez pas de demande. {NO_STATE_DATA_NOTICE}
        </p>
        {config.submissionsOpen && (
          <p className="mt-3 text-sm text-ink-600">
            Pas le temps de répondre ?{" "}
            <Link href="/rappel" className="font-semibold text-pine-700 underline underline-offset-2">
              Être recontacté(e) sans faire le test
            </Link>
          </p>
        )}
      </div>

      <aside className="hidden lg:block" aria-hidden>
        <div className="sticky top-32 space-y-4">
          <div className="relative h-[380px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-pine-50 via-sand-100 to-[#fff3e2] shadow-soft">
            <HouseHero focus={focusFor(answers, currentVisible)} className="absolute inset-0 aspect-auto" />
          </div>
          <div className="card p-5 text-sm text-ink-600">
            <p className="font-semibold text-ink-900">Le résultat s&apos;affiche avant toute demande de coordonnées.</p>
            <p className="mt-1">Un conseiller vous présente ensuite le détail des aides adaptées à votre projet.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
