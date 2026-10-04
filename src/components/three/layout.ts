import type { Vec3 } from "./geometry";

/**
 * Plan de masse de la maquette (unités arbitraires, ~1 u ≈ 2,5 m).
 * Îlot centré sur l'origine, dessus à y = 0, façade principale vers +z.
 */

export const ISLAND = {
  radius: 4,
  thickness: 0.68,
} as const;

/** Décalage du repère « maison » dans le repère de l'îlot. */
export const HOUSE_ORIGIN: Vec3 = [-0.42, 0, -0.38];

export const HOUSE = {
  /** Demi-largeur (x) et demi-profondeur (z) du volume principal. */
  halfW: 1.5,
  halfD: 1,
  /** Hauteur des murs (égout). */
  wallH: 1.9,
  /** Pente du toit (rad) ≈ 38°. */
  pitch: 0.66,
  roofT: 0.09,
  /** Débord d'égout mesuré le long de la pente. */
  eave: 0.3,
  /** Débord en pignon. */
  gable: 0.16,
} as const;

const SIN_P = Math.sin(HOUSE.pitch);
const COS_P = Math.cos(HOUSE.pitch);
const TAN_P = Math.tan(HOUSE.pitch);

export const RIDGE_Y = HOUSE.wallH + HOUSE.halfD * TAN_P;
/** Longueur de pente du faîtage jusqu'au nu du mur. */
export const SLOPE_TO_WALL = HOUSE.halfD / COS_P;
/** Bornes de pente (depuis le faîtage) couvertes par un pan de toit. */
export const SLOPE_START = -HOUSE.roofT * TAN_P;
export const SLOPE_END = SLOPE_TO_WALL + HOUSE.eave;

/** Hauteur du dessus de la couverture à la distance horizontale |z| du faîtage. */
export function roofTopY(z: number): number {
  return RIDGE_Y - Math.abs(z) * TAN_P + HOUSE.roofT / COS_P;
}

export const ROOF_TRIG = { sin: SIN_P, cos: COS_P, tan: TAN_P } as const;

/** Annexe technique (toit plat, façade avant en écorché). */
export const ANNEX = {
  x0: 1.5,
  x1: 2.75,
  z0: -0.85,
  z1: 0.75,
  h: 1.15,
  wall: 0.1,
  roofT: 0.09,
} as const;

/** Ballon d'eau chaude, posé dans l'annexe. */
export const TANK = {
  position: [2.12, 0.05, -0.14] as Vec3,
  radius: 0.21,
  height: 0.74,
  /** Hauteurs des tuyaux eau chaude (départ) et eau froide (arrivée). */
  hotPipeY: 0.58,
  coldPipeY: 0.4,
} as const;

/** Unité extérieure de pompe à chaleur. */
export const HEAT_PUMP = {
  position: [-2.32, 0, 0.42] as Vec3,
  width: 0.86,
  height: 0.6,
  depth: 0.34,
  /** Hauteur du centre du caisson (plot + pieds). */
  centerY: 0.39,
  /** Centre du ventilateur dans le repère du caisson. */
  fan: [-0.14, 0, 0.17] as Vec3,
  fanRadius: 0.215,
} as const;

/** Sortie de ventilation (VMC) en toiture, pan avant. */
export const VENT = {
  x: 1.02,
  z: 0.3,
  radius: 0.06,
  /** Hauteur du chapeau (sommet de la sortie). */
  capY: roofTopY(0.3) + 0.34,
  /** Hauteur du panache d'air (mise en avant « ventilation »). */
  plume: 0.78,
} as const;

/** Souche de cheminée, pan arrière. */
export const CHIMNEY = {
  x: -0.86,
  z: -0.46,
  size: 0.3,
  topY: 3.08,
} as const;

export type TreeKind = "pine" | "round";

export interface TreeSpec {
  kind: TreeKind;
  /** Position au sol, repère de l'îlot. */
  x: number;
  z: number;
  height: number;
}

export const TREES: readonly TreeSpec[] = [
  { kind: "pine", x: -3.25, z: -0.8, height: 2.15 },
  { kind: "pine", x: -3.45, z: 0.42, height: 1.3 },
  { kind: "round", x: 2.45, z: -2.25, height: 1.75 },
  { kind: "round", x: 3.3, z: -0.65, height: 1.2 },
  { kind: "pine", x: 3.15, z: 1.62, height: 1.15 },
];

export interface BushSpec {
  x: number;
  z: number;
  r: number;
}

export const BUSHES: readonly BushSpec[] = [
  { x: -2.45, z: 1.7, r: 0.32 },
  { x: -2.0, z: 2.15, r: 0.22 },
  { x: 0.78, z: 0.88, r: 0.2 },
  { x: 0.95, z: 2.3, r: 0.17 },
  { x: -0.95, z: 2.6, r: 0.2 },
  { x: 2.62, z: 2.28, r: 0.2 },
];
