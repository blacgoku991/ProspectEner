import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MeshStandardMaterial } from "three";
import { buildHouseGeometries } from "./houseGeometry";
import { PALETTE } from "./palette";
import { useDampedWeight } from "./runtime";

interface HouseProps {
  /** Mise en avant « chauffage » : les vitrages s'illuminent davantage. */
  heating: number;
  /** Mise en avant « eau chaude » : l'annexe rayonne. */
  hotWater: number;
}

/** Maison + annexe + terrasse : 5 draw calls (géométries fusionnées par matériau). */
export function House({ heating, hotWater }: HouseProps) {
  const geometries = useMemo(() => buildHouseGeometries(), []);
  useEffect(
    () => () => {
      for (const geometry of Object.values(geometries)) geometry.dispose();
    },
    [geometries],
  );
  const heatRef = useDampedWeight(heating);
  const waterRef = useDampedWeight(hotWater);
  const glassRef = useRef<MeshStandardMaterial>(null);
  const interiorRef = useRef<MeshStandardMaterial>(null);

  useFrame(() => {
    if (glassRef.current) glassRef.current.emissiveIntensity = 1.15 + 0.85 * heatRef.current;
    if (interiorRef.current) interiorRef.current.emissiveIntensity = 0.12 + 1.3 * waterRef.current;
  });

  return (
    <group>
      <mesh geometry={geometries.matte} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.8} metalness={0} />
      </mesh>
      <mesh geometry={geometries.glass}>
        <meshStandardMaterial
          ref={glassRef}
          color={PALETTE.glass}
          emissive={PALETTE.amber}
          emissiveIntensity={1.15}
          roughness={0.18}
          metalness={0}
        />
      </mesh>
      <mesh geometry={geometries.solar} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.24} metalness={0.55} envMapIntensity={1.6} />
      </mesh>
      <mesh geometry={geometries.metal} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.35} metalness={0.55} />
      </mesh>
      <mesh geometry={geometries.interior} receiveShadow>
        <meshStandardMaterial
          ref={interiorRef}
          color={PALETTE.interior}
          emissive={PALETTE.amber}
          emissiveIntensity={0.12}
          roughness={0.9}
        />
      </mesh>
    </group>
  );
}
