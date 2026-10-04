import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DynamicDrawUsage,
  Matrix4,
  TubeGeometry,
  Vector3,
  type Group,
  type Points,
  type ShaderMaterial,
} from "three";
import { MeshBuilder, createRandom, type Vec3 } from "./geometry";
import { useSceneRuntime } from "./runtime";
import { FLOW_POINTS_VERTEX, POINTS_FRAGMENT, RIBBON_FRAGMENT, RIBBON_VERTEX } from "./shaders";
import { pointScale, setUniform } from "./uniforms";

export type FlowPath = readonly Vec3[];

export interface AirFlowProps {
  /** Trajets (points de contrôle d'une Catmull-Rom), constants. */
  paths: readonly FlowPath[];
  /** Intensité amortie (0 → masqué). */
  weightRef: RefObject<number>;
  colorStart: string;
  colorEnd: string;
  particlesPerPath?: number;
  /** Progression par seconde le long d'un trajet. */
  speed?: number;
  /** Taille des particules (unités monde). */
  size?: number;
  /** Rayon des rubans ; 0 pour n'afficher que les particules. */
  ribbonRadius?: number;
  ribbonOpacity?: number;
  seed?: number;
}

const SAMPLES = 64;
const IDENTITY = new Matrix4();

interface FlowData {
  /** Échantillons régulièrement espacés de chaque trajet (x, y, z). */
  samples: Float32Array[];
  phases: Float32Array;
  speeds: Float32Array;
  pathIndex: Uint16Array;
  points: BufferGeometry;
  ribbons: BufferGeometry | null;
}

function buildFlow(paths: readonly FlowPath[], perPath: number, size: number, ribbonRadius: number, seed: number): FlowData {
  const rand = createRandom(seed);
  const curves = paths.map((path) => new CatmullRomCurve3(path.map((p) => new Vector3(p[0], p[1], p[2]))));
  const samples = curves.map((curve) => {
    const data = new Float32Array(SAMPLES * 3);
    curve.getSpacedPoints(SAMPLES - 1).forEach((p, i) => {
      data[i * 3] = p.x;
      data[i * 3 + 1] = p.y;
      data[i * 3 + 2] = p.z;
    });
    return data;
  });

  const count = paths.length * perPath;
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const pathIndex = new Uint16Array(count);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pathIndex[i] = Math.floor(i / perPath);
    phases[i] = (i % perPath) / perPath + rand() * 0.06;
    speeds[i] = 0.85 + rand() * 0.3;
    sizes[i] = size * (0.7 + rand() * 0.6);
  }
  const points = new BufferGeometry();
  const position = new BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage);
  const progress = new BufferAttribute(new Float32Array(count), 1).setUsage(DynamicDrawUsage);
  points.setAttribute("position", position);
  points.setAttribute("aProgress", progress);
  points.setAttribute("aSize", new BufferAttribute(sizes, 1));

  let ribbons: BufferGeometry | null = null;
  if (ribbonRadius > 0) {
    const builder = new MeshBuilder({ color: false, uv: true });
    for (const curve of curves) {
      const tube = new TubeGeometry(curve, 72, ribbonRadius, 5, false);
      builder.add(tube, IDENTITY);
      tube.dispose();
    }
    ribbons = builder.build();
  }
  return { samples, phases, speeds, pathIndex, points, ribbons };
}

/** Flux d'air animé : particules qui suivent des courbes + rubans en tirets. */
export function AirFlow({
  paths,
  weightRef,
  colorStart,
  colorEnd,
  particlesPerPath = 12,
  speed = 0.2,
  size = 0.07,
  ribbonRadius = 0.012,
  ribbonOpacity = 0.75,
  seed = 1,
}: AirFlowProps) {
  const runtimeRef = useSceneRuntime();
  const flow = useMemo(
    () => buildFlow(paths, particlesPerPath, size, ribbonRadius, seed),
    [paths, particlesPerPath, size, ribbonRadius, seed],
  );
  useEffect(
    () => () => {
      flow.points.dispose();
      flow.ribbons?.dispose();
    },
    [flow],
  );

  const pointUniforms = useMemo(
    () => ({
      uScale: { value: 800 },
      uOpacity: { value: 0 },
      uColorA: { value: new Color(colorStart) },
      uColorB: { value: new Color(colorEnd) },
    }),
    [colorStart, colorEnd],
  );
  const ribbonUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uRepeat: { value: 3 },
      uSpeed: { value: speed * 2.2 },
      uColorA: { value: new Color(colorStart) },
      uColorB: { value: new Color(colorEnd) },
    }),
    [colorStart, colorEnd, speed],
  );

  const groupRef = useRef<Group>(null);
  const pointsRef = useRef<Points>(null);
  const pointsMaterialRef = useRef<ShaderMaterial>(null);
  const ribbonMaterialRef = useRef<ShaderMaterial>(null);

  useFrame((state) => {
    const group = groupRef.current;
    const points = pointsRef.current;
    if (!group || !points) return;
    const weight = weightRef.current;
    group.visible = weight > 0.004;
    if (!group.visible) return;

    const time = runtimeRef.current.time;
    const position = points.geometry.getAttribute("position");
    const progress = points.geometry.getAttribute("aProgress");
    const last = SAMPLES - 1;
    for (let i = 0; i < flow.phases.length; i++) {
      const data = flow.samples[flow.pathIndex[i] ?? 0];
      if (!data) continue;
      const u = (((flow.phases[i] ?? 0) + time * speed * (flow.speeds[i] ?? 1)) % 1 + 1) % 1;
      const f = u * last;
      const i0 = Math.min(Math.floor(f), last - 1);
      const k = f - i0;
      const a = i0 * 3;
      const b = a + 3;
      const wobble = Math.sin(time * 2.3 + i * 1.7) * 0.012;
      position.setXYZ(
        i,
        (data[a] ?? 0) + ((data[b] ?? 0) - (data[a] ?? 0)) * k + wobble,
        (data[a + 1] ?? 0) + ((data[b + 1] ?? 0) - (data[a + 1] ?? 0)) * k,
        (data[a + 2] ?? 0) + ((data[b + 2] ?? 0) - (data[a + 2] ?? 0)) * k - wobble,
      );
      progress.setX(i, u);
    }
    position.needsUpdate = true;
    progress.needsUpdate = true;

    setUniform(pointsMaterialRef.current, "uOpacity", weight);
    setUniform(pointsMaterialRef.current, "uScale", pointScale(state));
    setUniform(ribbonMaterialRef.current, "uOpacity", weight * ribbonOpacity);
    setUniform(ribbonMaterialRef.current, "uTime", time);
  });

  return (
    <group ref={groupRef} visible={false}>
      {flow.ribbons ? (
        <mesh geometry={flow.ribbons} renderOrder={4}>
          <shaderMaterial
            ref={ribbonMaterialRef}
            uniforms={ribbonUniforms}
            vertexShader={RIBBON_VERTEX}
            fragmentShader={RIBBON_FRAGMENT}
            transparent
            depthWrite={false}
          />
        </mesh>
      ) : null}
      <points ref={pointsRef} geometry={flow.points} frustumCulled={false} renderOrder={5}>
        <shaderMaterial
          ref={pointsMaterialRef}
          uniforms={pointUniforms}
          vertexShader={FLOW_POINTS_VERTEX}
          fragmentShader={POINTS_FRAGMENT}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  );
}
