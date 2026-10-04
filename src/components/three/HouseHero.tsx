"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { HouseFallback } from "./HouseFallback";
import { useInView, useWebGLSupport } from "./hooks";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import type { HouseFocus, HouseHeroProps } from "./types";

export type { HouseFocus, HouseHeroProps } from "./types";

/* La scène (three.js) n'est chargée que côté client, après l'hydratation. */
const HouseScene = dynamic(() => import("./HouseScene"), { ssr: false, loading: () => null });

const BASE_DESCRIPTION =
  "Illustration : une maison individuelle moderne posée sur un îlot de verdure, avec des murs clairs, " +
  "une toiture sombre équipée de panneaux solaires, des fenêtres éclairées, une pompe à chaleur extérieure, " +
  "un ballon d'eau chaude visible dans une annexe ouverte et une sortie de ventilation sur le toit.";

const FOCUS_DESCRIPTION: Record<HouseFocus, string> = {
  none: "",
  isolation: "L'enveloppe isolante des murs et de la toiture est mise en évidence.",
  chauffage: "La pompe à chaleur est mise en évidence : de l'air chaud circule vers la maison.",
  "eau-chaude": "Le ballon d'eau chaude est mis en évidence : l'eau chaude part vers la maison.",
  ventilation: "La ventilation est mise en évidence : l'air circule autour de la sortie de toit.",
  global:
    "Tous les postes sont mis en évidence : isolation, chauffage, eau chaude et ventilation.",
};

/**
 * Visuel d'en-tête : maison 3D (chargée à la demande) avec repli statique
 * pendant le chargement, sans WebGL ou en cas d'erreur. Le rendu est suspendu
 * lorsque le visuel sort de l'écran.
 */
export default function HouseHero({ focus = "none", className }: HouseHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const webgl = useWebGLSupport();
  const inView = useInView(containerRef);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // Perte de contexte WebGL (GPU réinitialisé…) : on réaffiche l'illustration.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const onLost = () => setContextLost(true);
    const onRestored = () => setContextLost(false);
    element.addEventListener("webglcontextlost", onLost, true);
    element.addEventListener("webglcontextrestored", onRestored, true);
    return () => {
      element.removeEventListener("webglcontextlost", onLost, true);
      element.removeEventListener("webglcontextrestored", onRestored, true);
    };
  }, []);

  const handleReady = useCallback(() => setReady(true), []);
  const handleError = useCallback(() => setFailed(true), []);

  const showScene = webgl === "supported" && !failed;
  const sceneVisible = showScene && ready && !contextLost;
  const description = `${BASE_DESCRIPTION} ${FOCUS_DESCRIPTION[focus]}`.trim();

  return (
    <div ref={containerRef} className={twMerge(clsx("relative isolate aspect-[5/4] w-full", className))}>
      <p className="sr-only">{description}</p>
      <HouseFallback
        className={clsx(
          "pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700 ease-out",
          sceneVisible ? "opacity-0" : "opacity-100",
        )}
      />
      {showScene ? (
        <div
          aria-hidden="true"
          className={clsx(
            "absolute inset-0 transition-opacity duration-1000 ease-out",
            sceneVisible ? "opacity-100" : "opacity-0",
          )}
        >
          <SceneErrorBoundary onError={handleError}>
            <HouseScene focus={focus} paused={!inView} onReady={handleReady} className="h-full w-full" />
          </SceneErrorBoundary>
        </div>
      ) : null}
    </div>
  );
}
