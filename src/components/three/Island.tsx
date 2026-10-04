import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, Color, LatheGeometry, Vector2, type Mesh, type ShaderMaterial } from "three";
import { ISLAND } from "./layout";
import { PALETTE } from "./palette";
import { BOB_AMPLITUDE, bobAt, useSceneRuntime } from "./runtime";
import { RADIAL_VERTEX, SHADOW_FRAGMENT } from "./shaders";
import { setUniform } from "./uniforms";

interface ProfilePoint {
  r: number;
  y: number;
  color: string;
}

function arc(cx: number, cy: number, radius: number, from: number, to: number, steps: number, color: string): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    points.push({ r: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), color });
  }
  return points;
}

/**
 * Profil de révolution de l'îlot, parcouru du centre du dessous vers le centre
 * du dessus (sens qui oriente les normales vers l'extérieur).
 */
function islandProfile(): ProfilePoint[] {
  const R = ISLAND.radius;
  const bottom = -ISLAND.thickness;
  return [
    { r: 0, y: bottom, color: PALETTE.soilDeep },
    { r: R - 0.33, y: bottom, color: PALETTE.soilDeep },
    ...arc(R - 0.33, bottom + 0.26, 0.26, -Math.PI / 2, 0, 5, PALETTE.soil),
    { r: R - 0.07, y: -0.2, color: PALETTE.soil },
    { r: R - 0.02, y: -0.165, color: PALETTE.soil },
    // Liseré de pelouse (léger débord) puis arrondi du dessus
    { r: R - 0.02, y: -0.16, color: PALETTE.lawnEdge },
    { r: R - 0.02, y: -0.1, color: PALETTE.lawnEdge },
    ...arc(R - 0.12, -0.1, 0.1, 0, Math.PI / 2, 5, PALETTE.lawnEdge),
    { r: R * 0.78, y: 0, color: PALETTE.lawn },
    { r: R * 0.5, y: 0, color: PALETTE.lawn },
    { r: R * 0.22, y: 0, color: PALETTE.lawn },
    { r: 0, y: 0, color: PALETTE.lawn },
  ];
}

function buildIslandGeometry(): LatheGeometry {
  const profile = islandProfile();
  const segments = 128;
  const geometry = new LatheGeometry(
    profile.map((p) => new Vector2(p.r, p.y)),
    segments,
  );
  const colors = new Float32Array(geometry.getAttribute("position").count * 3);
  const c = new Color();
  for (let i = 0; i <= segments; i++) {
    profile.forEach((point, j) => {
      c.set(point.color);
      const k = (i * profile.length + j) * 3;
      colors[k] = c.r;
      colors[k + 1] = c.g;
      colors[k + 2] = c.b;
    });
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return geometry;
}

export function Island() {
  const geometry = useMemo(() => buildIslandGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.94} metalness={0} />
    </mesh>
  );
}

/** Hauteur du sol virtuel qui reçoit l'ombre douce de l'îlot flottant. */
export const SHADOW_Y = -1.32;

/**
 * Ombre de contact douce sous l'îlot. Elle suit le mouvement vertical de la
 * caméra pour rester immobile à l'écran pendant que l'îlot flotte.
 */
export function GroundShadow() {
  const runtimeRef = useSceneRuntime();
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uColor: { value: new Color(PALETTE.ink900) }, uOpacity: { value: 0.4 } }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const bob = bobAt(runtimeRef.current.time);
    const lift = bob / BOB_AMPLITUDE;
    mesh.position.y = SHADOW_Y - bob;
    mesh.scale.setScalar(1 + lift * 0.035);
    setUniform(materialRef.current, "uOpacity", 0.4 * (1 - lift * 0.16));
  });

  return (
    <mesh ref={meshRef} position-y={SHADOW_Y} rotation-x={-Math.PI / 2} renderOrder={-1}>
      <planeGeometry args={[12, 12]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={RADIAL_VERTEX}
        fragmentShader={SHADOW_FRAGMENT}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
