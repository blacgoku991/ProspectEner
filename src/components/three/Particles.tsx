import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, type ShaderMaterial } from "three";
import { createRandom } from "./geometry";
import { PALETTE } from "./palette";
import { useSceneRuntime } from "./runtime";
import { MOTES_VERTEX, POINTS_FRAGMENT } from "./shaders";
import { pointScale, setUniform } from "./uniforms";

const COUNT = 56;
const BASE_Y = -0.4;
const HEIGHT = 4.2;

function buildMotes(): BufferGeometry {
  const rand = createRandom(2024);
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const sizes = new Float32Array(COUNT);
  const amber = new Color(PALETTE.amber);
  const teal = new Color(PALETTE.pine400);
  const mint = new Color(PALETTE.pine300);
  for (let i = 0; i < COUNT; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 1.4 + Math.sqrt(rand()) * 3.4;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = BASE_Y + rand() * HEIGHT;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    const pick = rand();
    const color = pick < 0.5 ? amber : pick < 0.8 ? teal : mint;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    seeds[i] = rand();
    sizes[i] = 0.07 + rand() * 0.08;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
  return geometry;
}

/** Poussières lumineuses « énergie » qui dérivent lentement autour de l'îlot. */
export function EnergyMotes() {
  const runtimeRef = useSceneRuntime();
  const geometry = useMemo(() => buildMotes(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScale: { value: 800 },
      uHeight: { value: HEIGHT },
      uBase: { value: BASE_Y },
      uOpacity: { value: 1 },
    }),
    [],
  );
  const materialRef = useRef<ShaderMaterial>(null);

  useFrame((state) => {
    setUniform(materialRef.current, "uTime", runtimeRef.current.time + 40);
    setUniform(materialRef.current, "uScale", pointScale(state));
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={6}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={MOTES_VERTEX}
        fragmentShader={POINTS_FRAGMENT}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
