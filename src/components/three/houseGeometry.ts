import {
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  TorusGeometry,
  type BufferGeometry,
  type Matrix4,
} from "three";
import { MeshBuilder, trs, within, type Vec3 } from "./geometry";
import {
  ANNEX,
  CHIMNEY,
  HOUSE,
  RIDGE_Y,
  ROOF_TRIG,
  SLOPE_END,
  SLOPE_START,
  TANK,
  VENT,
  roofTopY,
} from "./layout";
import { PALETTE } from "./palette";

export interface HouseGeometries {
  /** Murs, toiture, menuiseries, terrasse… (couleurs par sommet). */
  matte: BufferGeometry;
  /** Vitrages éclairés de l'intérieur. */
  glass: BufferGeometry;
  /** Panneaux solaires + quadrillage (couleurs par sommet). */
  solar: BufferGeometry;
  /** Sortie de ventilation, tuyauteries (couleurs par sommet). */
  metal: BufferGeometry;
  /** Parois intérieures de l'annexe (lueur chaude). */
  interior: BufferGeometry;
}

interface Builders {
  matte: MeshBuilder;
  glass: MeshBuilder;
  solar: MeshBuilder;
  metal: MeshBuilder;
  interior: MeshBuilder;
}

const { halfW: W, halfD: D, wallH: H, roofT: T } = HOUSE;

/* Repères de façade : (u, v, n) → monde, n = normale sortante. */
const FRONT = trs([0, 0, D]);
const LEFT = trs([-W, 0, 0], [0, -Math.PI / 2, 0]);
const RIGHT = trs([W, 0, 0], [0, Math.PI / 2, 0]);

/**
 * Repère posé sur un pan de toit : `s` = distance le long de la pente depuis
 * le faîtage, `h` = hauteur au-dessus de la sous-face, `x` = décalage latéral.
 */
function roofFrame(side: 1 | -1, s: number, h: number, x = 0): Matrix4 {
  const { sin, cos } = ROOF_TRIG;
  return trs([x, RIDGE_Y - s * sin + h * cos, side * (s * cos + h * sin)], [side * HOUSE.pitch, 0, 0]);
}

interface WindowSpec {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  mullion?: boolean;
  sill?: boolean;
}

const FRAME = 0.045;
const FRAME_DEPTH = 0.05;

function addWindow(b: Builders, facade: Matrix4, w: WindowSpec): void {
  const width = w.u1 - w.u0;
  const height = w.v1 - w.v0;
  const uc = (w.u0 + w.u1) / 2;
  const vc = (w.v0 + w.v1) / 2;
  const fz = FRAME_DEPTH / 2 - 0.01;
  b.glass.box([width, height, 0.02], [uc, vc, 0.004], undefined, undefined, facade);
  b.matte
    .box([width + FRAME * 2, FRAME, FRAME_DEPTH], [uc, w.v1 + FRAME / 2, fz], PALETTE.frame, undefined, facade)
    .box([width + FRAME * 2, FRAME, FRAME_DEPTH], [uc, w.v0 - FRAME / 2, fz], PALETTE.frame, undefined, facade)
    .box([FRAME, height, FRAME_DEPTH], [w.u0 - FRAME / 2, vc, fz], PALETTE.frame, undefined, facade)
    .box([FRAME, height, FRAME_DEPTH], [w.u1 + FRAME / 2, vc, fz], PALETTE.frame, undefined, facade);
  if (w.mullion) {
    b.matte.box([0.028, height, FRAME_DEPTH * 0.8], [uc, vc, fz], PALETTE.frame, undefined, facade);
  }
  if (w.sill) {
    b.matte.box([width + 0.16, 0.035, 0.1], [uc, w.v0 - FRAME - 0.0175, 0.045], PALETTE.sill, undefined, facade);
  }
}

function addOculus(b: Builders, facade: Matrix4, v: number, radius: number): void {
  const disc = new CylinderGeometry(radius, radius, 0.02, 20);
  const ring = new TorusGeometry(radius + 0.02, 0.026, 6, 28);
  b.glass.add(disc, within(facade, trs([0, v, 0.004], [Math.PI / 2, 0, 0])));
  b.matte.add(ring, within(facade, trs([0, v, 0.014])), PALETTE.frame);
  disc.dispose();
  ring.dispose();
}

function addBody(b: Builders): void {
  // Volume principal, soubassement et bandeau d'étage
  b.matte
    .box([W * 2, H, D * 2], [0, H / 2, 0], PALETTE.wall)
    .box([W * 2 + 0.04, 0.14, D * 2 + 0.04], [0, 0.07, 0], PALETTE.plinth)
    .box([W * 2 + 0.03, 0.05, D * 2 + 0.03], [0, 1.12, 0], PALETTE.wallShade);

  // Combles : prisme triangulaire (pignons)
  const gable = new Shape();
  gable.moveTo(-D, H);
  gable.lineTo(D, H);
  gable.lineTo(0, RIDGE_Y);
  gable.closePath();
  const prism = new ExtrudeGeometry(gable, { depth: W * 2, bevelEnabled: false, curveSegments: 1 });
  b.matte.add(prism, trs([-W, 0, 0], [0, Math.PI / 2, 0]), PALETTE.wall);
  prism.dispose();
}

function addRoof(b: Builders): void {
  const length = SLOPE_END - SLOPE_START;
  const mid = (SLOPE_START + SLOPE_END) / 2;
  const width = (W + HOUSE.gable) * 2;
  for (const side of [1, -1] as const) {
    b.matte.box([width, T, length], [0, 0, 0], PALETTE.roof, undefined, roofFrame(side, mid, T / 2));
    // Rives et égout soulignés d'un liseré clair
    for (const sx of [-1, 1]) {
      b.matte.box(
        [0.035, T + 0.025, length + 0.02],
        [0, 0, 0],
        PALETTE.roofEdge,
        undefined,
        roofFrame(side, mid, T / 2, sx * (width / 2 + 0.0175)),
      );
    }
    b.matte.box([width + 0.07, T + 0.025, 0.035], [0, 0, 0], PALETTE.roofEdge, undefined, roofFrame(side, SLOPE_END + 0.0175, T / 2));
    // Gouttière
    b.matte.box([width + 0.04, 0.055, 0.075], [0, 0, 0], PALETTE.frame, undefined, roofFrame(side, SLOPE_END - 0.035, -0.035));
  }
  // Faîtière
  b.matte.box([width + 0.05, 0.11, 0.16], [0, RIDGE_Y + T / ROOF_TRIG.cos - 0.015, 0], PALETTE.roof);

  // Descente d'eau pluviale (angle avant gauche)
  const pipe = new CylinderGeometry(0.026, 0.026, H - 0.1, 8);
  b.matte.add(pipe, trs([-W + 0.07, (H - 0.1) / 2 + 0.05, D + 0.05]), PALETTE.frame);
  pipe.dispose();
}

function addChimney(b: Builders): void {
  const { x, z, size, topY } = CHIMNEY;
  const bottomY = roofTopY(Math.abs(z) + size / 2) - 0.25;
  b.matte
    .box([size, topY - bottomY, size], [x, (topY + bottomY) / 2, z], PALETTE.chimney)
    .box([size + 0.08, 0.06, size + 0.08], [x, topY + 0.03, z], PALETTE.roof);
  const flue = new CylinderGeometry(0.05, 0.05, 0.14, 10);
  b.metal.add(flue, trs([x + 0.04, topY + 0.13, z]), PALETTE.ink600);
  flue.dispose();
}

function addVent(b: Builders): void {
  const { x, z, radius, capY } = VENT;
  const { sin, cos } = ROOF_TRIG;
  const baseY = roofTopY(z) - 0.12;
  const stackTop = capY - 0.07;
  const stack = new CylinderGeometry(radius, radius, stackTop - baseY, 14);
  const neck = new CylinderGeometry(radius * 0.55, radius * 0.55, 0.06, 10);
  const cap = new CylinderGeometry(0.118, 0.118, 0.03, 16);
  const hat = new ConeGeometry(0.118, 0.06, 16);
  b.metal
    .add(stack, trs([x, (stackTop + baseY) / 2, z]), PALETTE.metal)
    .add(neck, trs([x, stackTop + 0.03, z]), PALETTE.ink600)
    .add(cap, trs([x, capY - 0.015, z]), PALETTE.metal)
    .add(hat, trs([x, capY + 0.03, z]), PALETTE.metal);
  // Bavette d'étanchéité, posée dans le plan du toit
  const h = T + 0.008;
  b.metal.box([0.24, 0.016, 0.28], [0, 0, 0], PALETTE.ink600, undefined, roofFrame(1, (z - h * sin) / cos, h, x));
  for (const g of [stack, neck, cap, hat]) g.dispose();
}

function addSolarPanels(b: Builders): void {
  const rows: Array<readonly [number, number]> = [
    [0.3, 0.72],
    [0.76, 1.18],
  ];
  const x0 = -1.4;
  const x1 = 0.58;
  const gap = 0.035;
  const columns = 4;
  const colW = (x1 - x0 - gap * (columns - 1)) / columns;
  const thickness = 0.03;
  const lineY = thickness / 2 + 0.002;
  for (const [s0, s1] of rows) {
    const len = s1 - s0;
    for (let c = 0; c < columns; c++) {
      const frame = roofFrame(1, (s0 + s1) / 2, T + 0.035, x0 + colW / 2 + c * (colW + gap));
      const box = (size: Vec3, pos: Vec3, color: string) => b.solar.box(size, pos, color, undefined, frame);
      box([colW, thickness, len], [0, 0, 0], PALETTE.solar);
      // Cadre alu
      box([colW, 0.006, 0.014], [0, lineY, len / 2 - 0.007], "#a9b8c6");
      box([colW, 0.006, 0.014], [0, lineY, -len / 2 + 0.007], "#a9b8c6");
      box([0.014, 0.006, len], [colW / 2 - 0.007, lineY, 0], "#a9b8c6");
      box([0.014, 0.006, len], [-colW / 2 + 0.007, lineY, 0], "#a9b8c6");
      // Quadrillage des cellules
      for (let k = 1; k < 3; k++) {
        box([0.006, 0.004, len - 0.02], [-colW / 2 + (k * colW) / 3, lineY - 0.001, 0], PALETTE.solarLine);
      }
      for (let k = 1; k < 4; k++) {
        box([colW - 0.02, 0.004, 0.006], [0, lineY - 0.001, -len / 2 + (k * len) / 4], PALETTE.solarLine);
      }
    }
  }
}

function addOpenings(b: Builders): void {
  // Façade avant : baie vitrée, porte, cuisine + 3 fenêtres d'étage
  addWindow(b, FRONT, { u0: -1.25, u1: -0.3, v0: 0.14, v1: 1.0, mullion: true });
  addWindow(b, FRONT, { u0: 0.92, u1: 1.32, v0: 0.46, v1: 0.98, mullion: true, sill: true });
  for (const uc of [-0.775, 0.38, 1.12]) {
    addWindow(b, FRONT, { u0: uc - 0.22, u1: uc + 0.22, v0: 1.27, v1: 1.72, mullion: true, sill: true });
  }

  // Porte d'entrée vitrée, marquise, applique et emmarchement
  const door = { u0: 0.17, u1: 0.59, v0: 0.12, v1: 1.0 };
  const du = (door.u0 + door.u1) / 2;
  const dh = door.v1 - door.v0;
  b.matte
    .box([door.u1 - door.u0, dh, 0.04], [du, door.v0 + dh / 2, 0], PALETTE.door, undefined, FRONT)
    .box([door.u1 - door.u0 + FRAME * 2, FRAME, FRAME_DEPTH], [du, door.v1 + FRAME / 2, 0.015], PALETTE.frame, undefined, FRONT)
    .box([FRAME, dh, FRAME_DEPTH], [door.u0 - FRAME / 2, door.v0 + dh / 2, 0.015], PALETTE.frame, undefined, FRONT)
    .box([FRAME, dh, FRAME_DEPTH], [door.u1 + FRAME / 2, door.v0 + dh / 2, 0.015], PALETTE.frame, undefined, FRONT)
    .box([0.8, 0.055, 0.42], [du, 1.14, 0.21], PALETTE.roof, undefined, FRONT)
    .box([0.8, 0.02, 0.02], [du, 1.14, 0.425], PALETTE.roofEdge, undefined, FRONT)
    .box([0.64, 0.12, 0.3], [du, 0.06, 0.15], PALETTE.stone, undefined, FRONT)
    .box([0.05, 0.03, 0.06], [0.74, 0.86, 0.03], PALETTE.frame, undefined, FRONT);
  b.glass
    .box([0.075, 0.6, 0.02], [du + 0.1, 0.6, 0.018], undefined, undefined, FRONT)
    .box([0.045, 0.09, 0.05], [0.74, 0.8, 0.03], undefined, undefined, FRONT);
  b.metal.box([0.022, 0.16, 0.035], [du - 0.13, 0.58, 0.035], PALETTE.metal, undefined, FRONT);

  // Pignon gauche
  addWindow(b, LEFT, { u0: -0.24, u1: 0.24, v0: 0.46, v1: 0.98, mullion: true, sill: true });
  addWindow(b, LEFT, { u0: -0.22, u1: 0.22, v0: 1.27, v1: 1.72, mullion: true, sill: true });
  addOculus(b, LEFT, 2.22, 0.13);

  // Pignon droit (au-dessus de l'annexe)
  addWindow(b, RIGHT, { u0: -0.22, u1: 0.22, v0: 1.36, v1: 1.74, mullion: true, sill: true });
  addOculus(b, RIGHT, 2.22, 0.13);
}

function addAnnex(b: Builders): void {
  const A = ANNEX;
  const width = A.x1 - A.x0;
  const depth = A.z1 - A.z0;
  const xc = (A.x0 + A.x1) / 2;
  const zc = (A.z0 + A.z1) / 2;
  const innerX0 = A.x0;
  const innerX1 = A.x1 - A.wall;
  const innerZ0 = A.z0 + A.wall;
  const innerW = innerX1 - innerX0;
  const innerD = A.z1 - innerZ0;
  const innerXc = (innerX0 + innerX1) / 2;
  const innerZc = (innerZ0 + A.z1) / 2;
  const roofX1 = A.x1 + 0.08;
  const roofZ0 = A.z0 - 0.08;

  b.matte
    // Murs arrière et latéral, soubassement
    .box([width, A.h, A.wall], [xc, A.h / 2, A.z0 + A.wall / 2], PALETTE.wall)
    .box([A.wall, A.h, depth], [A.x1 - A.wall / 2, A.h / 2, zc], PALETTE.wall)
    .box([width + 0.02, 0.14, A.wall + 0.04], [xc + 0.01, 0.07, A.z0 + A.wall / 2 - 0.01], PALETTE.plinth)
    .box([A.wall + 0.04, 0.14, depth], [A.x1 - A.wall / 2 + 0.01, 0.07, zc - 0.01], PALETTE.plinth)
    // Sol intérieur
    .box([innerW, 0.05, innerD], [innerXc, 0.025, innerZc], PALETTE.sand200)
    // Toiture plate + acrotère clair
    .box([roofX1 - A.x0, A.roofT, A.z1 - roofZ0], [(A.x0 + roofX1) / 2, A.h + A.roofT / 2, (roofZ0 + A.z1) / 2], PALETTE.roof)
    .box([0.03, A.roofT + 0.02, A.z1 - roofZ0], [roofX1 + 0.015, A.h + A.roofT / 2, (roofZ0 + A.z1) / 2], PALETTE.roofEdge)
    .box([roofX1 - A.x0 + 0.03, A.roofT + 0.02, 0.03], [(A.x0 + roofX1) / 2 + 0.015, A.h + A.roofT / 2, roofZ0 - 0.015], PALETTE.roofEdge)
    // Coupe (écorché) soulignée en vert pin
    .box([A.wall, A.h, 0.014], [A.x1 - A.wall / 2, A.h / 2, A.z1 + 0.007], PALETTE.pine600)
    .box([roofX1 - A.x0, A.roofT, 0.014], [(A.x0 + roofX1) / 2, A.h + A.roofT / 2, A.z1 + 0.007], PALETTE.pine600)
    .box([innerW, 0.05, 0.014], [innerXc, 0.025, A.z1 + 0.007], PALETTE.pine600)
    // Boîtier de régulation au mur
    .box([0.15, 0.2, 0.04], [2.47, 0.72, innerZ0 + 0.03], PALETTE.hpCasing);
  b.glass.box([0.05, 0.03, 0.02], [2.47, 0.76, innerZ0 + 0.055]);

  // Parois intérieures lumineuses (fond, côtés, plafond)
  const inset = 0.006;
  b.interior
    .box([innerW, A.h - 0.05, 0.008], [innerXc, A.h / 2 + 0.025, innerZ0 + inset], undefined)
    .box([0.008, A.h - 0.05, innerD], [innerX1 - inset, A.h / 2 + 0.025, innerZc], undefined)
    .box([0.008, A.h - 0.05, innerD], [innerX0 + 0.022, A.h / 2 + 0.025, innerZc], undefined)
    .box([innerW, 0.008, innerD], [innerXc, A.h - inset, innerZc], undefined);

  // Tuyauteries cuivre : départ eau chaude et arrivée eau froide vers la maison
  const [tx, ty, tz] = TANK.position;
  const startX = tx - TANK.radius + 0.01;
  const run = new CylinderGeometry(0.02, 0.02, startX - innerX0, 8);
  const flange = new CylinderGeometry(0.034, 0.034, 0.03, 10);
  for (const y of [TANK.hotPipeY, TANK.coldPipeY]) {
    b.metal
      .add(run, trs([(startX + innerX0) / 2, y, tz], [0, 0, Math.PI / 2]), PALETTE.copper)
      .add(flange, trs([innerX0 + 0.035, y, tz], [0, 0, Math.PI / 2]), PALETTE.copper);
  }
  // Soupape / évacuation au sommet du ballon
  const topY = ty + 0.06 + TANK.height + 0.06;
  const riser = new CylinderGeometry(0.016, 0.016, A.h - topY, 8);
  b.metal.add(riser, trs([tx, (A.h + topY) / 2, tz]), PALETTE.copper);
  for (const g of [run, flange, riser]) g.dispose();
}

function addTerraceAndPath(b: Builders): void {
  // Terrasse bois devant la baie vitrée
  const x0 = -1.48;
  const x1 = 0.06;
  const z0 = D + 0.02;
  const z1 = D + 0.98;
  const planks = 6;
  const pitch = (z1 - z0) / planks;
  b.matte.box([x1 - x0, 0.05, z1 - z0], [(x0 + x1) / 2, 0.025, (z0 + z1) / 2], PALETTE.deckGap);
  for (let i = 0; i < planks; i++) {
    b.matte.box([x1 - x0 - 0.012, 0.028, pitch - 0.016], [(x0 + x1) / 2, 0.064, z0 + pitch * (i + 0.5)], PALETTE.deck);
  }

  // Pas japonais jusqu'au bord de l'îlot
  const stone = new CylinderGeometry(0.17, 0.17, 0.03, 12);
  const offsets = [0.04, -0.07, 0.05, -0.04, 0.06, -0.02];
  offsets.forEach((dx, i) => {
    b.matte.add(stone, trs([0.38 + dx, 0.012, D + 0.62 + i * 0.4], [0, i * 0.7, 0], [1.25, 1, 1]), PALETTE.stone);
  });
  stone.dispose();
}

export function buildHouseGeometries(): HouseGeometries {
  const b: Builders = {
    matte: new MeshBuilder(),
    glass: new MeshBuilder({ color: false }),
    solar: new MeshBuilder(),
    metal: new MeshBuilder(),
    interior: new MeshBuilder({ color: false }),
  };
  addBody(b);
  addRoof(b);
  addChimney(b);
  addVent(b);
  addSolarPanels(b);
  addOpenings(b);
  addAnnex(b);
  addTerraceAndPath(b);
  return {
    matte: b.matte.build(),
    glass: b.glass.build(),
    solar: b.solar.build(),
    metal: b.metal.build(),
    interior: b.interior.build(),
  };
}
