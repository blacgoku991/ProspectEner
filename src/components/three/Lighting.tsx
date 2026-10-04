import { useEffect, useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  type DirectionalLight,
} from "three";
import type { Vec3 } from "./geometry";

interface LightPanel {
  color: string;
  intensity: number;
  position: Vec3;
  scale: [number, number];
}

/* « Studio » procédural : panneaux lumineux qui donnent reflets et dégradés. */
const PANELS: readonly LightPanel[] = [
  { color: "#ffffff", intensity: 1.6, position: [0, 9, 0], scale: [16, 16] },
  { color: "#ffe2bf", intensity: 3.2, position: [-7, 4, 5], scale: [5, 4] },
  { color: "#dff1f7", intensity: 1.8, position: [7, 3, 5], scale: [4, 5] },
  { color: "#ffb26b", intensity: 2.2, position: [4, 2, -8], scale: [7, 2] },
  { color: "#6f8d82", intensity: 0.7, position: [0, -6, 0], scale: [18, 18] },
];

function createEnvironmentScene(): Scene {
  const scene = new Scene();
  scene.background = new Color("#c9c6bc");
  const plane = new PlaneGeometry(1, 1);
  for (const panel of PANELS) {
    const material = new MeshBasicMaterial({
      color: new Color(panel.color).multiplyScalar(panel.intensity),
      side: DoubleSide,
      toneMapped: false,
    });
    const mesh = new Mesh(plane, material);
    mesh.position.set(panel.position[0], panel.position[1], panel.position[2]);
    mesh.scale.set(panel.scale[0], panel.scale[1], 1);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  }
  return scene;
}

function disposeScene(scene: Scene): void {
  scene.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      if (object.material instanceof MeshBasicMaterial) object.material.dispose();
    }
  });
}

/** Lumière clé (ombres), contre-jour chaud, ambiance hémisphérique et environnement procédural. */
export function Lighting() {
  const get = useThree((state) => state.get);
  const keyRef = useRef<DirectionalLight>(null);

  useLayoutEffect(() => {
    const light = keyRef.current;
    if (!light) return;
    const camera = light.shadow.camera;
    camera.left = -5.4;
    camera.right = 5.4;
    camera.top = 5.4;
    camera.bottom = -5.4;
    camera.near = 3;
    camera.far = 22;
    camera.updateProjectionMatrix();
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.05;
    light.shadow.radius = 2.5;
    light.shadow.intensity = 1;
    light.shadow.needsUpdate = true;
  }, []);

  useEffect(() => {
    const { gl, scene, invalidate } = get();
    const pmrem = new PMREMGenerator(gl);
    const environmentScene = createEnvironmentScene();
    const target = pmrem.fromScene(environmentScene, 0.04);
    disposeScene(environmentScene);
    pmrem.dispose();
    scene.environment = target.texture;
    scene.environmentIntensity = 0.14;
    invalidate();
    return () => {
      scene.environment = null;
      target.dispose();
    };
  }, [get]);

  return (
    <>
      <hemisphereLight args={["#fff4e6", "#9db5a5", 0.5]} />
      <directionalLight ref={keyRef} castShadow position={[-7, 8.5, 5]} intensity={3.4} color="#fff0db" />
      <directionalLight position={[6, 4.5, -7]} intensity={1.1} color="#ffb877" />
      <directionalLight position={[6, 3, 7]} intensity={0.45} color="#d6ecf6" />
    </>
  );
}
