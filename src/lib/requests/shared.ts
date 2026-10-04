import type { Answers, WorkCategory } from "@/engine/types";
import { describeWorks, selectedWorkItems, WORK_CATEGORY_LABELS } from "@/engine/works";

/** Libellé des travaux utilisé dans la phrase de demande (identique navigateur / serveur). */
export function worksTextForRequest(kind: "SIMULATION" | "QUICK_CALLBACK", answers: Pick<Answers, "works"> & Answers): string {
  if (kind === "SIMULATION") return describeWorks(selectedWorkItems(answers).filter((w) => w !== "AUTRE_PROJET")) || describeWorks([]);
  const labels = (answers.works ?? []).map((w: WorkCategory) => WORK_CATEGORY_LABELS[w].toLowerCase());
  if (labels.length === 0) return "rénovation énergétique";
  if (labels.length === 1) return labels[0] as string;
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

export const STATUS_LABELS = {
  NOUVEAU: "Nouveau",
  A_VERIFIER: "À vérifier",
  CONTACTE: "Contacté",
  ETUDE_EN_COURS: "Étude en cours",
  TERMINE: "Terminé",
  SANS_SUITE: "Sans suite",
  CONTACT_ANNULE: "Contact annulé",
} as const;

export const OUTCOME_LABELS = {
  POTENTIALLY_ELIGIBLE: "Potentiellement éligible",
  NEEDS_REVIEW: "Vérification nécessaire",
  NOT_ELIGIBLE: "Critères non remplis",
  OUT_OF_SCOPE: "Hors périmètre",
  NOT_EVALUATED: "Non évalué (rappel rapide)",
} as const;

export const KIND_LABELS = {
  SIMULATION: "Simulation complète",
  QUICK_CALLBACK: "Demande de rappel rapide",
} as const;

export const CHANNEL_LONG_LABELS = {
  PHONE: "Rappel téléphonique",
  EMAIL: "Réponse par e-mail",
} as const;
