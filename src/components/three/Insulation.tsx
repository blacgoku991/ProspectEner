import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  CylinderGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Shape,
  Vector3,
  type BufferGeometry,
  type Group,
  type MeshBasicMaterial,
  type ShaderMaterial,
} from "three";
import { MeshBuilder, trs } from "./geometry";
import { HOUSE, ROOF_TRIG, roofTopY } from "./layout";
import { PALETTE } from "./palette";
import { useDampedWeight, useSceneRuntime } from "./runtime";
import { SHELL_FRAGMENT, SHELL_VERTEX } from "./shaders";
import { setUniform } from "./uniforms";

const OFFSET = 0.07;
const WALL_TOP = 1.62;
const EAVE_Z = 1.36;
const ROOF_HALF_X = HOUSE.halfW + HOUSE.gable + 0.09;
const APEX_Y = roofTopY(0) + OFFSET / ROOF_TRIG.cos;

/** Enveloppe isolante : murs (sans dessus) + volume de toiture englobant les débords. */
function buildShell(): BufferGeometry {
  const builder = new MeshBuilder({ color: false });
  const wx = HOUSE.halfW + OFFSET;
  const wz = HOUSE.halfD + OFFSET;
  const front = new PlaneGeometry(wx * 2, WALL_TOP);
  const side = new PlaneGeometry(wz * 2, WALL_TOP);
  builder
    .add(front, trs([0, WALL_TOP / 2, wz]))
    .add(front, trs([0, WALL_TOP / 2, -wz], [0, Math.PI, 0]))
    .add(side, trs([-wx, WALL_TOP / 2, 0], [0, -Math.PI / 2, 0]))
    .add(side, trs([wx, WALL_TOP / 2, 0], [0, Math.PI / 2, 0]));
  front.dispose();
  side.dispose();

  const edgeY = roofTopY(EAVE_Z) + OFFSET / ROOF_TRIG.cos;
  const profile = new Shape();
  profile.moveTo(-EAVE_Z, WALL_TOP);
  profile.lineTo(EAVE_Z, WALL_TOP);
  profile.lineTo(EAVE_Z, edgeY);
  profile.lineTo(0, APEX_Y);
  profile.lineTo(-EAVE_Z, edgeY);
  profile.closePath();
  const roof = new ExtrudeGeometry(profile, { depth: ROOF_HALF_X * 2, bevelEnabled: false, curveSegments: 1 });
  builder.add(roof, trs([-ROOF_HALF_X, 0, 0], [0, Math.PI / 2, 0]));
  roof.dispose();
  return builder.build();
}

/** Arêtes de l'enveloppe en fins tubes : un trait net, quelle que soit la densité de pixels. */
function buildEdgeTubes(shell: BufferGeometry, radius: number): BufferGeometry {
  const edges = new EdgesGeometry(shell, 20);
  const position = edges.getAttribute("position");
  const tube = new CylinderGeometry(radius, radius, 1, 6, 1, true);
  const builder = new MeshBuilder({ color: false });
  const a = new Vector3();
  const b = new Vector3();
  const up = new Vector3(0, 1, 0);
  const direction = new Vector3();
  const rotation = new Quaternion();
  const scale = new Vector3();
  for (let i = 0; i + 1 < position.count; i += 2) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    const length = a.distanceTo(b);
    if (length < 1e-4) continue;
    direction.subVectors(b, a).divideScalar(length);
    rotation.setFromUnitVectors(up, direction);
    const middle = a.clone().add(b).multiplyScalar(0.5);
    builder.add(tube, new Matrix4().compose(middle, rotation, scale.set(1, length, 1)));
  }
  tube.dispose();
  edges.dispose();
  return builder.build();
}

export function Insulation({ insulation }: { insulation: number }) {
  const runtimeRef = useSceneRuntime();
  const weightRef = useDampedWeight(insulation, 2.2);
  const geometries = useMemo(() => {
    const shell = buildShell();
    return { shell, edges: buildEdgeTubes(shell, 0.014) };
  }, []);
  useEffect(
    () => () => {
      geometries.shell.dispose();
      geometries.edges.dispose();
    },
    [geometries],
  );
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(PALETTE.pine400) },
      uColorHi: { value: new Color(PALETTE.pine200) },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uMinY: { value: 0 },
      uMaxY: { value: APEX_Y },
    }),
    [],
  );

  const groupRef = useRef<Group>(null);
  const shellMaterialRef = useRef<ShaderMaterial>(null);
  const edgeMaterialRef = useRef<MeshBasicMaterial>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const weight = weightRef.current;
    group.visible = weight > 0.004;
    if (!group.visible) return;
    const time = runtimeRef.current.time;
    const breath = Math.sin(time * 2.2);
    group.scale.setScalar(1 + 0.008 * breath * weight);
    setUniform(shellMaterialRef.current, "uOpacity", weight * (0.88 + 0.12 * breath));
    setUniform(shellMaterialRef.current, "uTime", time);
    if (edgeMaterialRef.current) edgeMaterialRef.current.opacity = weight * (0.75 + 0.2 * breath);
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh geometry={geometries.shell} renderOrder={2}>
        <shaderMaterial
          ref={shellMaterialRef}
          uniforms={uniforms}
          vertexShader={SHELL_VERTEX}
          fragmentShader={SHELL_FRAGMENT}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={geometries.edges} renderOrder={3}>
        <meshBasicMaterial
          ref={edgeMaterialRef}
          color={PALETTE.pine400}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
