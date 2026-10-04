import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Préférence système « réduire les animations » (false côté serveur). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
}

export type WebGLSupport = "unknown" | "supported" | "unsupported";

let webglSupport: WebGLSupport | null = null;

/** Test unique (mis en cache) : three.js r163+ exige WebGL 2. */
function detectWebGL(): WebGLSupport {
  if (webglSupport) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    webglSupport = context ? "supported" : "unsupported";
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = "unsupported";
  }
  return webglSupport;
}

const noopSubscribe = () => () => {};

/** "unknown" pendant le rendu serveur et l'hydratation, puis le résultat du test. */
export function useWebGLSupport(): WebGLSupport {
  return useSyncExternalStore(noopSubscribe, detectWebGL, () => "unknown");
}

/** Visibilité de l'élément dans la fenêtre (avec marge), pour suspendre le rendu hors écran. */
export function useInView(ref: RefObject<Element | null>, rootMargin = "160px 0px"): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setInView(entry.isIntersecting);
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return inView;
}
