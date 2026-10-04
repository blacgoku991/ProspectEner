/** Poste de rénovation mis en avant dans l'illustration 3D. */
export type HouseFocus = "none" | "isolation" | "chauffage" | "eau-chaude" | "ventilation" | "global";

export interface HouseSceneProps {
  /** Poste mis en évidence (transitions douces). Par défaut : "none". */
  focus?: HouseFocus;
  /** Parallaxe de caméra qui suit le pointeur. Par défaut : true. */
  interactive?: boolean;
  /** Suspend le rendu (ex. composant hors écran). Par défaut : false. */
  paused?: boolean;
  className?: string;
  /** Appelé une seule fois, après le premier rendu effectif de la scène. */
  onReady?: () => void;
}

export interface HouseHeroProps {
  focus?: HouseFocus;
  className?: string;
  /** Charge la scène 3D seulement à l'approche de l'écran (visuel placé bas dans la page). */
  lazy?: boolean;
}
