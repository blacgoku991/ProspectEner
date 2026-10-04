export * from "./types";
export * from "./territory";
export * from "./construction";
export * from "./income";
export * from "./works";
export * from "./ruleset-schema";
export * from "./questionnaire";
export { evaluate, overallOutcome, HEADLINES } from "./evaluate";
export { RULESET_2026_10 } from "./rulesets/2026-10";

import { RULESET_2026_10 } from "./rulesets/2026-10";
/** Jeu de règles embarqué, utilisé pour initialiser la base (seed) et pour les tests. */
export const DEFAULT_RULESET = RULESET_2026_10;
export { coverageForCategory, DISPOSITIF_INFO, type CategoryCoverage } from "./coverage";
export { REFERENCE_SCENARIOS, type ReferenceScenario } from "./scenarios";
