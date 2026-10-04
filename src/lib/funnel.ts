/** Étapes du parcours mesurées de façon agrégée (aucun identifiant, aucune réponse). */
export const FUNNEL_STEPS = [
  "landing",
  "questionnaire_start",
  "step_logement",
  "step_projet",
  "step_energie",
  "step_avancement",
  "step_foyer",
  "result",
  "contact_form",
  "quick_form",
  "submitted",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const FUNNEL_LABELS: Record<FunnelStep, string> = {
  landing: "Visite de l'accueil",
  questionnaire_start: "Début du questionnaire",
  step_logement: "Étape logement",
  step_projet: "Étape projet",
  step_energie: "Étape énergie",
  step_avancement: "Étape avancement",
  step_foyer: "Étape foyer",
  result: "Résultat affiché",
  contact_form: "Formulaire de contact commencé",
  quick_form: "Formulaire de rappel rapide commencé",
  submitted: "Demande envoyée",
};

/** Envoi d'un signal d'étape (navigateur), sans cookie ni identifiant. */
export function trackStep(step: FunnelStep): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ step });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/stats", new Blob([body], { type: "application/json" }));
    else void fetch("/api/stats", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {
    // statistiques facultatives
  }
}
