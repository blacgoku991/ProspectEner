"use client";

import { useState } from "react";

export function ClearLocalData() {
  const [done, setDone] = useState(false);
  return (
    <div className="not-prose flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn-ghost"
        onClick={() => {
          try {
            sessionStorage.removeItem("pe-simulation");
            sessionStorage.removeItem("pe-acq");
          } catch {
            // stockage indisponible
          }
          setDone(true);
        }}
      >
        Effacer les données enregistrées dans ce navigateur
      </button>
      {done && <span role="status" className="text-sm text-pine-700">Réponses et paramètres de session effacés.</span>}
    </div>
  );
}
