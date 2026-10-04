import { useEffect, useMemo } from "react";
import { CanvasTexture } from "three";
import { ANNEX, BUSHES, HEAT_PUMP, HOUSE, HOUSE_ORIGIN, ISLAND, TREES } from "./layout";
import { PALETTE } from "./palette";

const SIZE = 512;
/** Côté (unités monde) couvert par la texture, centrée sur l'îlot. */
const EXTENT = 8;
const PX = SIZE / EXTENT;
const [OX, , OZ] = HOUSE_ORIGIN;

const toPx = (value: number) => (value / EXTENT + 0.5) * SIZE;

/**
 * Occlusion ambiante « peinte » au pied des objets (maison, arbres, massifs),
 * générée une seule fois dans un canvas 2D : aucun passe de rendu par image.
 */
function paintOcclusion(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, (ISLAND.radius - 0.2) * PX, 0, Math.PI * 2);
  ctx.clip();

  const blob = (x: number, z: number, radius: number, strength: number) => {
    const cx = toPx(x);
    const cy = toPx(z);
    const r = radius * PX;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, `rgba(255,255,255,${strength})`);
    gradient.addColorStop(0.5, `rgba(255,255,255,${strength * 0.5})`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  };

  // Rectangle flou (astuce de l'ombre portée décalée, compatible partout)
  const softRect = (x0: number, z0: number, x1: number, z1: number, blur: number, strength: number) => {
    const offset = SIZE * 2;
    ctx.shadowColor = `rgba(255,255,255,${strength})`;
    ctx.shadowBlur = blur * PX;
    ctx.shadowOffsetX = offset;
    ctx.fillStyle = "#fff";
    ctx.fillRect(toPx(x0) - offset, toPx(z0), (x1 - x0) * PX, (z1 - z0) * PX);
    ctx.shadowColor = "transparent";
  };

  // Maison, annexe, terrasse et pompe à chaleur (repère maison → îlot)
  const w = HOUSE.halfW + 0.04;
  const d = HOUSE.halfD + 0.04;
  softRect(OX - w, OZ - d, OX + w, OZ + d, 0.32, 0.85);
  softRect(OX + ANNEX.x0, OZ + ANNEX.z0 - 0.04, OX + ANNEX.x1 + 0.06, OZ + ANNEX.z1, 0.26, 0.7);
  softRect(OX - 1.5, OZ + HOUSE.halfD, OX + 0.08, OZ + HOUSE.halfD + 1.0, 0.12, 0.28);
  const [hx, , hz] = HEAT_PUMP.position;
  softRect(OX + hx - 0.55, OZ + hz - 0.28, OX + hx + 0.55, OZ + hz + 0.28, 0.14, 0.55);

  for (const tree of TREES) {
    const radius = tree.kind === "pine" ? tree.height * 0.34 : tree.height * 0.36;
    blob(tree.x, tree.z, radius, tree.kind === "pine" ? 0.75 : 0.6);
  }
  for (const bush of BUSHES) blob(bush.x, bush.z, bush.r * 1.5, 0.75);
  ctx.restore();
}

function buildOcclusionTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (ctx) paintOcclusion(ctx);
  return new CanvasTexture(canvas);
}

export function GroundOcclusion() {
  const texture = useMemo(() => buildOcclusionTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position-y={0.004} rotation-x={-Math.PI / 2} renderOrder={1}>
      <planeGeometry args={[EXTENT, EXTENT]} />
      <meshBasicMaterial color={PALETTE.ink900} alphaMap={texture} transparent opacity={0.42} depthWrite={false} />
    </mesh>
  );
}
