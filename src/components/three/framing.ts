import { MathUtils } from "three";
import type { Vec3 } from "./geometry";
import { CHIMNEY, HOUSE, HOUSE_ORIGIN, ISLAND, RIDGE_Y, TREES, VENT } from "./layout";

export interface Framing {
  /** Distance caméra → cible. */
  distance: number;
  /** Hauteur du point visé (sur l'axe de l'îlot). */
  targetY: number;
  azimuth: number;
  elevation: number;
  /** Champ vertical (degrés). */
  fov: number;
}

/** Azimut de repos : façade avant vue de trois quarts droit. */
const BASE_AZIMUTH = 0.34;
/** Débattement à couvrir (balancement + parallaxe). */
const SWING = 0.3;

function ring(radius: number, y: number, count: number): Vec3[] {
  return Array.from({ length: count }, (_, i): Vec3 => {
    const a = (i / count) * Math.PI * 2;
    return [Math.cos(a) * radius, y, Math.sin(a) * radius];
  });
}

function fromHouse(x: number, y: number, z: number): Vec3 {
  return [x + HOUSE_ORIGIN[0], y + HOUSE_ORIGIN[1], z + HOUSE_ORIGIN[2]];
}

/** Points qui doivent rester dans le cadre (repère de l'îlot). */
const KEY_POINTS: readonly Vec3[] = [
  ...ring(ISLAND.radius + 0.03, 0, 32),
  ...ring(ISLAND.radius - 0.25, -ISLAND.thickness, 24),
  ...ring(3.7, -1.32, 16),
  fromHouse(-(HOUSE.halfW + HOUSE.gable), RIDGE_Y + 0.14, 0),
  fromHouse(HOUSE.halfW + HOUSE.gable, RIDGE_Y + 0.14, 0),
  fromHouse(CHIMNEY.x, CHIMNEY.topY + 0.2, CHIMNEY.z),
  fromHouse(VENT.x - 0.45, VENT.capY + VENT.plume + 0.08, VENT.z),
  fromHouse(VENT.x + 0.45, VENT.capY + VENT.plume + 0.08, VENT.z),
  ...TREES.map((tree): Vec3 => [tree.x, tree.height, tree.z]),
];

function requiredDistance(azimuth: number, elevation: number, targetY: number, tanH: number, tanV: number): number {
  // Repère caméra : o = direction cible → caméra, r = droite, u = haut
  const ox = Math.cos(elevation) * Math.sin(azimuth);
  const oy = Math.sin(elevation);
  const oz = Math.cos(elevation) * Math.cos(azimuth);
  const rLen = Math.hypot(oz, ox);
  const rx = oz / rLen;
  const rz = -ox / rLen;
  const ux = oy * rz;
  const uy = oz * rx - ox * rz;
  const uz = -oy * rx;
  let distance = 0;
  for (const [px, py, pz] of KEY_POINTS) {
    const y = py - targetY;
    const xc = px * rx + pz * rz;
    const yc = px * ux + y * uy + pz * uz;
    const zc = px * ox + y * oy + pz * oz;
    distance = Math.max(distance, zc + Math.abs(xc) / tanH, zc + Math.abs(yc) / tanV);
  }
  return distance;
}

/**
 * Cadrage adapté au format : en portrait la caméra plonge davantage et
 * recule pour que l'îlot tienne en largeur ; en paysage elle se rapproche.
 */
export function computeFraming(aspect: number): Framing {
  const portrait = 1 - MathUtils.smoothstep(aspect, 0.7, 1.3);
  const fov = MathUtils.lerp(28, 34, portrait);
  const elevation = MathUtils.lerp(0.42, 0.52, portrait);
  const margin = MathUtils.lerp(0.9, 0.95, portrait);
  const tanV = Math.tan(MathUtils.degToRad(fov / 2)) * margin;
  const tanH = tanV * aspect;

  let best = { distance: Number.POSITIVE_INFINITY, targetY: 1 };
  for (let targetY = 0.2; targetY <= 1.8; targetY += 0.04) {
    let distance = 0;
    for (const offset of [-SWING, 0, SWING]) {
      distance = Math.max(distance, requiredDistance(BASE_AZIMUTH + offset, elevation, targetY, tanH, tanV));
    }
    if (distance < best.distance) best = { distance, targetY };
  }
  return { ...best, azimuth: BASE_AZIMUTH, elevation, fov };
}
