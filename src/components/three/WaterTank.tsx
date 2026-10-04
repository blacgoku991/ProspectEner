import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CylinderGeometry, SphereGeometry, type BufferGeometry, type MeshStandardMaterial } from "three";
import { AirFlow, type FlowPath } from "./AirFlow";
import { MeshBuilder, trs } from "./geometry";
import { ANNEX, TANK } from "./layout";
import { PALETTE } from "./palette";
import { useDampedWeight, useSceneRuntime } from "./runtime";

const { radius: R, height: H } = TANK;
const LEG = 0.06;

interface TankGeometries {
  body: BufferGeometry;
  glow: BufferGeometry;
}

function buildTank(): TankGeometries {
  const body = new MeshBuilder();
  const shell = new CylinderGeometry(R, R, H, 32);
  const dome = new SphereGeometry(R, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const leg = new CylinderGeometry(0.018, 0.018, LEG, 6);
  body
    .add(shell, trs([0, LEG + H / 2, 0]), PALETTE.tank)
    .add(dome, trs([0, LEG + H, 0], [0, 0, 0], [1, 0.42, 1]), PALETTE.tank)
    .add(dome, trs([0, LEG, 0], [Math.PI, 0, 0], [1, 0.2, 1]), PALETTE.sand200);
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3 + 0.4;
    body.add(leg, trs([Math.cos(a) * R * 0.7, LEG / 2, Math.sin(a) * R * 0.7]), PALETTE.hpDark);
  }
  for (const g of [shell, dome, leg]) g.dispose();

  // Bandeau lumineux + afficheur : la partie qui « chauffe »
  const glow = new MeshBuilder({ color: false });
  const band = new CylinderGeometry(R + 0.006, R + 0.006, 0.05, 32, 1, true);
  glow.add(band, trs([0, LEG + H * 0.64, 0]));
  glow.add(band, trs([0, LEG + H * 0.3, 0], [0, 0, 0], [1, 0.5, 1]));
  band.dispose();
  glow.box([0.1, 0.055, 0.02], [0, LEG + H * 0.47, R + 0.004]);
  return { body: body.build(), glow: glow.build() };
}

/* Eau chaude distribuée vers la maison le long du tuyau de départ (repère maison). */
const [TX, , TZ] = TANK.position;
const HOT_WATER_PATHS: readonly FlowPath[] = [
  [
    [TX - R + 0.01, TANK.hotPipeY, TZ],
    [(TX - R + ANNEX.x0) / 2, TANK.hotPipeY, TZ],
    [ANNEX.x0 + 0.02, TANK.hotPipeY, TZ],
  ],
];

export function WaterTank({ hotWater }: { hotWater: number }) {
  const runtimeRef = useSceneRuntime();
  const weightRef = useDampedWeight(hotWater);
  const geometries = useMemo(() => buildTank(), []);
  useEffect(
    () => () => {
      geometries.body.dispose();
      geometries.glow.dispose();
    },
    [geometries],
  );
  const bodyMaterialRef = useRef<MeshStandardMaterial>(null);
  const glowMaterialRef = useRef<MeshStandardMaterial>(null);

  useFrame(() => {
    const weight = weightRef.current;
    const pulse = 0.88 + 0.12 * Math.sin(runtimeRef.current.time * 2.4);
    if (bodyMaterialRef.current) bodyMaterialRef.current.emissiveIntensity = 0.7 * weight * pulse;
    if (glowMaterialRef.current) glowMaterialRef.current.emissiveIntensity = 0.7 + 1.7 * weight * pulse;
  });

  return (
    <>
      <group position={TANK.position}>
        <mesh geometry={geometries.body} castShadow receiveShadow>
          <meshStandardMaterial
            ref={bodyMaterialRef}
            vertexColors
            roughness={0.3}
            metalness={0.05}
            emissive={PALETTE.amber}
            emissiveIntensity={0}
          />
        </mesh>
        <mesh geometry={geometries.glow}>
          <meshStandardMaterial
            ref={glowMaterialRef}
            color={PALETTE.ember}
            emissive={PALETTE.ember}
            emissiveIntensity={0.7}
            roughness={0.35}
          />
        </mesh>
      </group>
      <AirFlow
        paths={HOT_WATER_PATHS}
        weightRef={weightRef}
        colorStart={PALETTE.ember}
        colorEnd={PALETTE.amber}
        particlesPerPath={6}
        speed={0.42}
        size={0.15}
        ribbonRadius={0.034}
        ribbonOpacity={0.9}
        seed={23}
      />
    </>
  );
}
