import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, type InstancedMesh, type Matrix4 } from "three";
import { createRandom, trs } from "./geometry";
import { BUSHES, TREES } from "./layout";
import { PALETTE } from "./palette";

interface Instance {
  matrix: Matrix4;
  color: string;
}

interface TreeInstances {
  trunks: Matrix4[];
  cones: Instance[];
  crowns: Instance[];
}

/* Étages des sapins : base, hauteur et rayon relatifs à la hauteur totale. */
const PINE_TIERS = [
  { base: 0.2, height: 0.46, radius: 0.3, color: PALETTE.pine700 },
  { base: 0.42, height: 0.38, radius: 0.235, color: PALETTE.pine600 },
  { base: 0.62, height: 0.38, radius: 0.165, color: PALETTE.pine500 },
] as const;

function buildTreeInstances(): TreeInstances {
  const rand = createRandom(1337);
  const trunks: Matrix4[] = [];
  const cones: Instance[] = [];
  const crowns: Instance[] = [];

  for (const tree of TREES) {
    const { x, z, height: h } = tree;
    const yaw = rand() * Math.PI * 2;
    if (tree.kind === "pine") {
      trunks.push(trs([x, 0, z], [0, yaw, 0], [1, h * 0.3, 1]));
      PINE_TIERS.forEach((tier, k) => {
        cones.push({
          matrix: trs([x, tier.base * h, z], [0, yaw + k * 0.45, 0], [tier.radius * h, tier.height * h, tier.radius * h]),
          color: tier.color,
        });
      });
    } else {
      trunks.push(trs([x, 0, z], [0, yaw, 0], [1.15, h * 0.5, 1.15]));
      crowns.push({
        matrix: trs([x, h * 0.62, z], [rand(), yaw, rand()], [h * 0.36, h * 0.38, h * 0.36]),
        color: PALETTE.pine500,
      });
      crowns.push({
        matrix: trs(
          [x + Math.cos(yaw) * h * 0.2, h * 0.47, z + Math.sin(yaw) * h * 0.2],
          [rand(), yaw, rand()],
          [h * 0.22, h * 0.21, h * 0.22],
        ),
        color: PALETTE.pine400,
      });
    }
  }

  for (const bush of BUSHES) {
    crowns.push({
      matrix: trs([bush.x, bush.r * 0.55, bush.z], [rand(), rand() * 6, 0], [bush.r * 1.18, bush.r, bush.r * 1.18]),
      color: rand() > 0.45 ? PALETTE.pine500 : PALETTE.pine600,
    });
  }
  return { trunks, cones, crowns };
}

function applyInstances(mesh: InstancedMesh | null, instances: readonly Instance[]): void {
  if (!mesh) return;
  const color = new Color();
  instances.forEach((instance, i) => {
    mesh.setMatrixAt(i, instance.matrix);
    mesh.setColorAt(i, color.set(instance.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/** Arbres et massifs low-poly : 3 draw calls au total (instanciation). */
export function Trees() {
  const instances = useMemo(() => buildTreeInstances(), []);
  const geometries = useMemo(
    () => ({
      trunk: new CylinderGeometry(0.05, 0.075, 1, 6).translate(0, 0.5, 0),
      cone: new ConeGeometry(1, 1, 7, 1).translate(0, 0.5, 0),
      crown: new IcosahedronGeometry(1, 1),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometries.trunk.dispose();
      geometries.cone.dispose();
      geometries.crown.dispose();
    },
    [geometries],
  );

  const trunksRef = useRef<InstancedMesh>(null);
  const conesRef = useRef<InstancedMesh>(null);
  const crownsRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    applyInstances(
      trunksRef.current,
      instances.trunks.map((matrix) => ({ matrix, color: PALETTE.trunk })),
    );
    applyInstances(conesRef.current, instances.cones);
    applyInstances(crownsRef.current, instances.crowns);
  }, [instances]);

  return (
    <group>
      <instancedMesh ref={trunksRef} args={[geometries.trunk, undefined, instances.trunks.length]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={conesRef} args={[geometries.cone, undefined, instances.cones.length]} castShadow receiveShadow>
        <meshStandardMaterial flatShading roughness={0.78} />
      </instancedMesh>
      <instancedMesh ref={crownsRef} args={[geometries.crown, undefined, instances.crowns.length]} castShadow receiveShadow>
        <meshStandardMaterial flatShading roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
