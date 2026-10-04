"use client";

import { useEffect } from "react";
import { type FunnelStep, trackStep } from "@/lib/funnel";

/** Signale une étape du parcours (statistique agrégée, une fois par affichage). */
export function TrackStep({ step }: { step: FunnelStep }) {
  useEffect(() => {
    trackStep(step);
  }, [step]);
  return null;
}
