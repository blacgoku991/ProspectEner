import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Mesh,
  type MeshStandardMaterial,
  type ShaderMaterial,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AirFlow, type FlowPath } from "./AirFlow";
import { MeshBuilder, trs, within } from "./geometry";
import { HEAT_PUMP, HOUSE } from "./layout";
import { PALETTE } from "./palette";
import { MAX_STEP, useDampedWeight, useSceneRuntime } from "./runtime";
import { HALO_FRAGMENT, RADIAL_VERTEX } from "./shaders";
import { setUniform } from "./uniforms";

const { width: W, height: H, depth: D, centerY: CY, fanRadius: R } = HEAT_PUMP;
const [FX, FY, FZ] = HEAT_PUMP.fan;

interface HeatPumpGeometries {
  body: BufferGeometry;
  fan: BufferGeometry;
  ring: BufferGeometry;
}

function buildHeatPump(): HeatPumpGeometries {
  const body = new MeshBuilder();
  // Dalle, pieds et caisson arrondi
  body.box([W + 0.2, 0.04, D + 0.2], [0, 0.02, 0], PALETTE.stone);
  for (const x of [-W / 2 + 0.13, W / 2 - 0.13]) {
    body.box([0.09, 0.06, D - 0.06], [x, 0.07, 0], PALETTE.hpDark);
  }
  const casing = new RoundedBoxGeometry(W, H, D, 3, 0.04);
  body.add(casing, trs([0, CY, 0]), PALETTE.hpCasing);
  casing.dispose();

  // Bouche du ventilateur, grille concentrique et croisillon
  const face = CY + FY;
  const mouth = new CylinderGeometry(R + 0.012, R + 0.012, 0.012, 36);
  body.add(mouth, trs([FX, face, FZ + 0.002], [Math.PI / 2, 0, 0]), PALETTE.hpDark);
  mouth.dispose();
  for (const r of [R * 0.98, R * 0.68, R * 0.38]) {
    const ring = new TorusGeometry(r, 0.0065, 5, 40);
    body.add(ring, trs([FX, face, FZ + 0.034]), PALETTE.hpCasing);
    ring.dispose();
  }
  body
    .box([R * 2, 0.011, 0.008], [FX, face, FZ + 0.034], PALETTE.hpCasing)
    .box([0.011, R * 2, 0.008], [FX, face, FZ + 0.034], PALETTE.hpCasing);

  // Panneau de service : ouïes et pastille de marque
  const px = (FX + R + W / 2) / 2 + 0.01;
  for (let i = 0; i < 5; i++) {
    body.box([0.17, 0.012, 0.006], [px, CY - 0.17 + i * 0.045, D / 2 + 0.002], PALETTE.wallShade);
  }
  body.box([0.08, 0.022, 0.006], [px, CY + 0.19, D / 2 + 0.003], PALETTE.pine500);

  // Goulotte des liaisons frigorifiques jusqu'au mur
  const wallX = -HOUSE.halfW - HEAT_PUMP.position[0];
  const runStart = W / 2 - 0.02;
  body.box([wallX - runStart, 0.09, 0.07], [(wallX + runStart) / 2, 0.24, -0.06], PALETTE.hpCasing);

  // Hélice : moyeu + 3 pales elliptiques vrillées
  const fan = new MeshBuilder({ color: false });
  const hub = new CylinderGeometry(0.045, 0.05, 0.04, 16);
  fan.add(hub, trs([0, 0, 0], [Math.PI / 2, 0, 0]));
  hub.dispose();
  const blade = new SphereGeometry(1, 14, 8);
  for (let k = 0; k < 3; k++) {
    const spin = trs([0, 0, 0], [0, 0, (k * Math.PI * 2) / 3]);
    fan.add(blade, within(spin, trs([0, R * 0.52, 0], [0, 0.45, 0], [0.065, R * 0.48, 0.008])));
  }
  blade.dispose();

  return {
    body: body.build(),
    fan: fan.build(),
    ring: new TorusGeometry(R + 0.016, 0.013, 8, 56),
  };
}

/* Trajets de l'air chaud : du ventilateur vers la maison (repère maison). */
const [HX, , HZ] = HEAT_PUMP.position;
const START: [number, number, number] = [HX + FX, CY + FY, HZ + FZ + 0.08];
const WARM_AIR_PATHS: readonly FlowPath[] = [
  [START, [HX + 0.3, 1.1, 1.42], [-1.45, 1.38, 1.98], [-0.86, 1.06, 1.66], [-0.62, 0.72, 1.03]],
  [
    [START[0] - 0.05, START[1] - 0.06, START[2]],
    [HX + 0.25, 0.68, 1.58],
    [-1.5, 0.74, 2.12],
    [-0.9, 0.56, 1.72],
    [-0.55, 0.44, 1.03],
  ],
  [
    [START[0] + 0.06, START[1] + 0.1, START[2] - 0.02],
    [HX + 0.2, 1.42, 1.22],
    [-1.45, 1.96, 1.68],
    [-0.95, 1.76, 1.34],
    [-0.78, 1.5, 1.03],
  ],
];

const HALO_COLOR = new Color(PALETTE.ember);

export function HeatPump({ heating }: { heating: number }) {
  const runtimeRef = useSceneRuntime();
  const weightRef = useDampedWeight(heating);
  const geometries = useMemo(() => buildHeatPump(), []);
  useEffect(
    () => () => {
      geometries.body.dispose();
      geometries.fan.dispose();
      geometries.ring.dispose();
    },
    [geometries],
  );
  const haloUniforms = useMemo(() => ({ uColor: { value: HALO_COLOR }, uOpacity: { value: 0 } }), []);

  const fanRef = useRef<Mesh>(null);
  const ringMaterialRef = useRef<MeshStandardMaterial>(null);
  const haloMaterialRef = useRef<ShaderMaterial>(null);
  const spinRef = useRef(0);

  useFrame((_, delta) => {
    const runtime = runtimeRef.current;
    const weight = weightRef.current;
    const pulse = 0.85 + 0.15 * Math.sin(runtime.time * 3.1);
    if (runtime.animate && fanRef.current) {
      spinRef.current += (2.4 + 9 * weight) * Math.min(delta, MAX_STEP);
      fanRef.current.rotation.z = -spinRef.current;
    }
    if (ringMaterialRef.current) ringMaterialRef.current.emissiveIntensity = 0.4 + 4 * weight * pulse;
    setUniform(haloMaterialRef.current, "uOpacity", weight * pulse);
  });

  return (
    <>
      <group position={HEAT_PUMP.position}>
        <mesh geometry={geometries.body} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.5} metalness={0.05} />
        </mesh>
        <mesh ref={fanRef} geometry={geometries.fan} position={[FX, CY + FY, FZ + 0.016]}>
          <meshStandardMaterial color={PALETTE.ink600} roughness={0.45} metalness={0.3} />
        </mesh>
        <mesh geometry={geometries.ring} position={[FX, CY + FY, FZ + 0.02]}>
          <meshStandardMaterial
            ref={ringMaterialRef}
            color={PALETTE.ember}
            emissive={PALETTE.ember}
            emissiveIntensity={0.35}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[FX, CY + FY, FZ + 0.07]} renderOrder={3}>
          <planeGeometry args={[0.85, 0.85]} />
          <shaderMaterial
            ref={haloMaterialRef}
            uniforms={haloUniforms}
            vertexShader={RADIAL_VERTEX}
            fragmentShader={HALO_FRAGMENT}
            transparent
            depthWrite={false}
          />
        </mesh>
      </group>
      <AirFlow
        paths={WARM_AIR_PATHS}
        weightRef={weightRef}
        colorStart={PALETTE.ember}
        colorEnd={PALETTE.amber}
        particlesPerPath={16}
        speed={0.2}
        size={0.15}
        ribbonRadius={0.026}
        ribbonOpacity={0.95}
        seed={11}
      />
    </>
  );
}
