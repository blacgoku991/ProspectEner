export * from "./types";
export * from "./territory";
export * from "./construction";
export * from "./income";
export * from "./works";
export * from "./ruleset-schema";
export * from "./questionnaire";
export { evaluate, overallOutcome, HEADLINES, PROFILE_HEADLINES } from "./evaluate";
export { RULESET_2026_10 } from "./rulesets/2026-10";
export { RULESET_2026_10_2 } from "./rulesets/2026-10-2";

import { RULESET_2026_10 } from "./rulesets/2026-10";
import { RULESET_2026_10_2 } from "./rulesets/2026-10-2";
/** Jeux de règles embarqués, du plus ancien au plus récent. */
export const EMBEDDED_RULESETS = [RULESET_2026_10, RULESET_2026_10_2] as const;
/** Jeu de règles embarqué le plus récent, utilisé pour initialiser la base (seed) et pour les tests. */
export const DEFAULT_RULESET = RULESET_2026_10_2;
export { coverageForCategory, DISPOSITIF_INFO, type CategoryCoverage } from "./coverage";
export { REFERENCE_SCENARIOS, type ReferenceScenario } from "./scenarios";
