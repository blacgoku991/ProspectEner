import { firstUnanswered, type QuestionContext, type QuestionId } from "@/engine/questionnaire";
import type { Answers } from "@/engine/types";
import type { PublicConfig } from "@/lib/public-config";
import type { SubmitSuccess } from "./ContactForm";

/** Session du simulateur conservée dans l'onglet (sessionStorage), sans coordonnées. */

export type Phase = "questions" | "result" | "contact" | "done";

export interface Persisted {
  v: 1;
  ruleSetVersion: string;
  referenceDate: string;
  answers: Answers;
  current: QuestionId;
  phase: Phase;
  returnToResult: boolean;
  done: SubmitSuccess | null;
}

export interface RestoredSession {
  answers: Answers;
  current: QuestionId;
  phase: Phase;
  returnToResult: boolean;
  done: SubmitSuccess | null;
  /** Session rouverte sur le résultat alors qu'une question restait sans réponse. */
  redirected?: true;
}

export const STORAGE_KEY = "pe-simulation";

export function loadPersisted(ruleSetVersion: string, referenceDate: string): Persisted | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Persisted;
    return saved.v === 1 && saved.ruleSetVersion === ruleSetVersion && saved.referenceDate === referenceDate ? saved : null;
  } catch {
    return null;
  }
}

export function withScope(answers: Answers, mode: PublicConfig["testMode"]): Answers {
  const { scope: _previous, ...rest } = answers;
  return mode === "ELIGIBILITE" ? { ...rest, scope: "PROFILE" } : rest;
}

/** Phases qui affichent le résultat (et le formulaire de contact). */
export const showsResult = (phase: Phase) => phase === "result" || phase === "contact";

/**
 * Session restaurée. La portée du test choisie dans les paramètres (test complet par défaut) prime.
 * Le résultat n'est jamais rouvert sur des réponses incomplètes (session antérieure à l'ajout d'une
 * question, portée modifiée…) : la personne reprend à la première question sans réponse, puis revient
 * au résultat.
 */
export function restoreSession(saved: Persisted | null, ctx: QuestionContext, mode: PublicConfig["testMode"]): RestoredSession {
  const answers = withScope(saved?.answers ?? {}, mode);
  const session: RestoredSession = {
    answers,
    current: saved?.current ?? "location",
    phase: saved?.phase ?? "questions",
    returnToResult: Boolean(saved?.returnToResult),
    done: saved?.done ?? null,
  };
  const missing = showsResult(session.phase) ? firstUnanswered(answers, ctx) : null;
  return missing ? { ...session, phase: "questions", current: missing, returnToResult: true, redirected: true } : session;
}
