import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";

/** État d'animation partagé (mutable, lu dans les boucles `useFrame`). */
export interface SceneRuntime {
  /** Temps d'animation cumulé (s), figé lorsque les animations sont coupées. */
  time: number;
  /** false si l'utilisateur préfère réduire les animations. */
  animate: boolean;
  /** Pointeur normalisé [-1, 1] sur la fenêtre (y vers le haut). */
  pointerX: number;
  pointerY: number;
}

/** Pas de temps maximal : évite les sauts après une pause ou un onglet masqué. */
export const MAX_STEP = 1 / 20;

const RuntimeContext = createContext<RefObject<SceneRuntime> | null>(null);

export function useSceneRuntime(): RefObject<SceneRuntime> {
  const runtimeRef = useContext(RuntimeContext);
  if (!runtimeRef) throw new Error("useSceneRuntime doit être utilisé dans <RuntimeProvider>");
  return runtimeRef;
}

function Ticker() {
  const runtimeRef = useSceneRuntime();
  useFrame((_, delta) => {
    const runtime = runtimeRef.current;
    if (runtime.animate) runtime.time += Math.min(delta, MAX_STEP);
  }, -10);
  return null;
}

export function RuntimeProvider({ animate, children }: { animate: boolean; children: ReactNode }) {
  const runtimeRef = useRef<SceneRuntime>({ time: 0, animate, pointerX: 0, pointerY: 0 });
  useEffect(() => {
    runtimeRef.current.animate = animate;
  }, [animate]);
  return (
    <RuntimeContext.Provider value={runtimeRef}>
      <Ticker />
      {children}
    </RuntimeContext.Provider>
  );
}

/**
 * Valeur amortie (0 → 1) qui suit `target` en douceur.
 * Sans animation, la cible est appliquée immédiatement.
 */
export function useDampedWeight(target: number, lambda = 2.6): RefObject<number> {
  const runtimeRef = useSceneRuntime();
  const valueRef = useRef(0);
  useFrame((_, delta) => {
    valueRef.current = runtimeRef.current.animate
      ? MathUtils.damp(valueRef.current, target, lambda, Math.min(delta, MAX_STEP))
      : target;
  }, -5);
  return valueRef;
}

/* Mouvement de flottaison : partagé par la caméra et l'ombre portée. */

const TAU = Math.PI * 2;

/** Lente rotation apparente de l'îlot (rad). */
export function swayAt(time: number): number {
  return 0.2 * Math.sin((time * TAU) / 26) + 0.03 * Math.sin((time * TAU) / 9.5);
}

/** Flottaison verticale de l'îlot. */
export const BOB_AMPLITUDE = 0.07;
export function bobAt(time: number): number {
  return BOB_AMPLITUDE * Math.sin((time * TAU) / 6.8);
}
