import type { HouseFocus } from "./types";

/** Intensité cible (0 → 1) de chaque mise en évidence. */
export interface FocusWeights {
  isolation: number;
  chauffage: number;
  eauChaude: number;
  ventilation: number;
}

const NONE: FocusWeights = { isolation: 0, chauffage: 0, eauChaude: 0, ventilation: 0 };

/** "global" : toutes les mises en évidence, en plus discret. */
const GLOBAL: FocusWeights = { isolation: 0.55, chauffage: 0.7, eauChaude: 0.75, ventilation: 0.7 };

export function focusWeights(focus: HouseFocus): FocusWeights {
  switch (focus) {
    case "isolation":
      return { ...NONE, isolation: 1 };
    case "chauffage":
      return { ...NONE, chauffage: 1 };
    case "eau-chaude":
      return { ...NONE, eauChaude: 1 };
    case "ventilation":
      return { ...NONE, ventilation: 1 };
    case "global":
      return GLOBAL;
    case "none":
      return NONE;
  }
}
