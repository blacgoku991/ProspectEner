import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils } from "three";
import { computeFraming } from "./framing";
import { MAX_STEP, bobAt, swayAt, useSceneRuntime } from "./runtime";

/** Amplitude de la parallaxe (rad). */
const PARALLAX_AZIMUTH = 0.12;
const PARALLAX_ELEVATION = 0.05;

/**
 * Caméra en orbite lente autour de l'îlot (le « balancement » de la maquette),
 * légère flottaison verticale et parallaxe qui suit le pointeur.
 * Aucun contrôle d'orbite : le défilement de la page n'est jamais capturé.
 */
export function CameraRig({ interactive }: { interactive: boolean }) {
  const runtimeRef = useSceneRuntime();
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const framing = useMemo(() => computeFraming(width / Math.max(height, 1)), [width, height]);
  const parallaxRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!interactive) return;
    const runtime = runtimeRef.current;
    const onMove = (event: PointerEvent) => {
      runtime.pointerX = MathUtils.clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
      runtime.pointerY = MathUtils.clamp(1 - (event.clientY / window.innerHeight) * 2, -1, 1);
    };
    const onLeave = () => {
      runtime.pointerX = 0;
      runtime.pointerY = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      onLeave();
    };
  }, [interactive, runtimeRef]);

  useFrame((state, delta) => {
    const runtime = runtimeRef.current;
    const parallax = parallaxRef.current;
    const follow = interactive && runtime.animate;
    if (runtime.animate) {
      const dt = Math.min(delta, MAX_STEP);
      parallax.x = MathUtils.damp(parallax.x, follow ? runtime.pointerX : 0, 2.2, dt);
      parallax.y = MathUtils.damp(parallax.y, follow ? runtime.pointerY : 0, 2.2, dt);
    } else {
      parallax.x = 0;
      parallax.y = 0;
    }

    const camera = state.camera;
    if ("fov" in camera && camera.fov !== framing.fov) {
      camera.fov = framing.fov;
      camera.updateProjectionMatrix();
    }
    const azimuth = framing.azimuth + swayAt(runtime.time) + parallax.x * PARALLAX_AZIMUTH;
    const elevation = framing.elevation - parallax.y * PARALLAX_ELEVATION;
    // La caméra descend quand l'îlot « monte » : l'ombre au sol suit la caméra.
    const targetY = framing.targetY - bobAt(runtime.time);
    const d = framing.distance;
    camera.position.set(
      d * Math.cos(elevation) * Math.sin(azimuth),
      targetY + d * Math.sin(elevation),
      d * Math.cos(elevation) * Math.cos(azimuth),
    );
    camera.lookAt(0, targetY, 0);
  });

  return null;
}
