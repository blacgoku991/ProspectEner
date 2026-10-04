"use client";

import dynamic from "next/dynamic";

/** Le simulateur s'exécute uniquement dans le navigateur : les réponses n'en sortent qu'à l'envoi volontaire d'une demande. */
export const SimulatorLoader = dynamic(() => import("./Simulator"), {
  ssr: false,
  loading: () => (
    <div className="card mx-auto h-[420px] max-w-3xl animate-pulse" aria-busy="true" aria-label="Chargement du simulateur" />
  ),
});
