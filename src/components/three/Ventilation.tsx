import { AirFlow, type FlowPath } from "./AirFlow";
import type { Vec3 } from "./geometry";
import { VENT } from "./layout";
import { PALETTE } from "./palette";
import { useDampedWeight } from "./runtime";

/** Volutes d'air vicié qui s'échappent en hélice au-dessus de la sortie de toit. */
function helix(phase: number, turns: number, height: number): FlowPath {
  const steps = 18;
  const points: Vec3[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const angle = phase + t * turns * Math.PI * 2;
    const radius = 0.08 + 0.3 * t * t + 0.08 * t;
    points.push([VENT.x + Math.cos(angle) * radius, VENT.capY + 0.02 + height * t, VENT.z + Math.sin(angle) * radius]);
  }
  return points;
}

const EXHAUST_PATHS: readonly FlowPath[] = [0, 1, 2].map((i) => helix((i * Math.PI * 2) / 3, 1.1, VENT.plume));

/* Air neuf qui entre par les fenêtres de l'étage (repère maison). */
const INTAKE_PATHS: readonly FlowPath[] = [
  [
    [-1.25, 2.7, 2.75],
    [-1.05, 2.35, 2.05],
    [-0.86, 1.86, 1.42],
    [-0.775, 1.5, 1.02],
  ],
  [
    [1.95, 2.6, 2.7],
    [1.6, 2.25, 2.0],
    [1.25, 1.8, 1.4],
    [1.12, 1.5, 1.02],
  ],
];

export function Ventilation({ airflow }: { airflow: number }) {
  const weightRef = useDampedWeight(airflow);
  return (
    <>
      <AirFlow
        paths={EXHAUST_PATHS}
        weightRef={weightRef}
        colorStart={PALETTE.pine500}
        colorEnd={PALETTE.pine300}
        particlesPerPath={11}
        speed={0.16}
        size={0.13}
        ribbonRadius={0.022}
        ribbonOpacity={0.9}
        seed={31}
      />
      <AirFlow
        paths={INTAKE_PATHS}
        weightRef={weightRef}
        colorStart={PALETTE.pine300}
        colorEnd={PALETTE.pine500}
        particlesPerPath={9}
        speed={0.22}
        size={0.12}
        ribbonRadius={0.02}
        ribbonOpacity={0.85}
        seed={37}
      />
    </>
  );
}
