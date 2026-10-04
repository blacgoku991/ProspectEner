import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Ombres « cuites » : la lumière et les objets qui projettent une ombre sont
 * immobiles (seule la caméra bouge), la carte d'ombres n'est donc calculée
 * qu'au démarrage — une passe de rendu économisée à chaque image.
 */
export function StaticShadows() {
  const get = useThree((state) => state.get);
  const framesRef = useRef(0);

  useLayoutEffect(() => {
    const { gl } = get();
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    const canvas = gl.domElement;
    const onRestored = () => {
      get().gl.shadowMap.needsUpdate = true;
    };
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextrestored", onRestored);
      gl.shadowMap.autoUpdate = true;
    };
  }, [get]);

  // Quelques passes au démarrage, le temps que tout soit monté.
  useFrame((state) => {
    if (framesRef.current >= 3) return;
    framesRef.current += 1;
    state.gl.shadowMap.needsUpdate = true;
  });
  return null;
}

/** Signale le premier rendu effectif (pour le fondu depuis l'illustration statique). */
export function ReadySignal({ onReady }: { onReady?: () => void }) {
  const doneRef = useRef(false);
  const callbackRef = useRef(onReady);
  useEffect(() => {
    callbackRef.current = onReady;
  }, [onReady]);
  useFrame(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    requestAnimationFrame(() => callbackRef.current?.());
  });
  return null;
}

/** Demande une image lorsqu'une valeur change (mode de rendu « à la demande »). */
export function InvalidateOn({ value }: { value: unknown }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [value, invalidate]);
  return null;
}

/**
 * Qualité adaptative : si la cadence reste basse après le démarrage,
 * la résolution de rendu est ramenée à 1×.
 */
export function AdaptiveResolution() {
  const statsRef = useRef({ warmup: 1.2, elapsed: 0, frames: 0, slowWindows: 0, done: false });
  useFrame((state, delta) => {
    const stats = statsRef.current;
    if (stats.done) return;
    if (stats.warmup > 0) {
      stats.warmup -= delta;
      return;
    }
    stats.elapsed += delta;
    stats.frames += 1;
    if (stats.elapsed < 1.5) return;
    const fps = stats.frames / stats.elapsed;
    stats.elapsed = 0;
    stats.frames = 0;
    stats.slowWindows = fps < 42 ? stats.slowWindows + 1 : 0;
    if (stats.slowWindows >= 2) {
      if (state.viewport.dpr > 1) state.setDpr(1);
      stats.done = true;
    }
  });
  return null;
}
