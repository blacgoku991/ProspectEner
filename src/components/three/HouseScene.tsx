"use client";

import { Canvas, type RootState } from "@react-three/fiber";
import { ACESFilmicToneMapping, type WebGLRendererParameters } from "three";
import { CameraRig } from "./CameraRig";
import { focusWeights } from "./focus";
import { HeatPump } from "./HeatPump";
import { usePrefersReducedMotion } from "./hooks";
import { House } from "./House";
import { Insulation } from "./Insulation";
import { GroundOcclusion } from "./GroundOcclusion";
import { GroundShadow, Island } from "./Island";
import { HOUSE_ORIGIN } from "./layout";
import { Lighting } from "./Lighting";
import { EnergyMotes } from "./Particles";
import { RuntimeProvider } from "./runtime";
import { AdaptiveResolution, InvalidateOn, ReadySignal, StaticShadows } from "./SceneUtilities";
import { Trees } from "./Trees";
import type { HouseSceneProps } from "./types";
import { Ventilation } from "./Ventilation";
import { WaterTank } from "./WaterTank";

export type { HouseFocus, HouseSceneProps } from "./types";

const DPR: [number, number] = [1, 1.75];
const GL: WebGLRendererParameters = {
  alpha: true,
  antialias: true,
  stencil: false,
  powerPreference: "high-performance",
};
const CAMERA = { fov: 30, near: 0.5, far: 80, position: [8, 9, 20] as [number, number, number] };
/** Illustration décorative : le canvas ne capte jamais le pointeur ni le défilement. */
const CANVAS_STYLE = { pointerEvents: "none" } as const;

function handleCreated({ gl }: RootState): void {
  gl.toneMapping = ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.02;
  gl.setClearColor(0x000000, 0);
}

/**
 * Maison individuelle procédurale (aucun fichier externe) sur un îlot flottant,
 * avec mises en évidence animées des postes de rénovation énergétique.
 */
export default function HouseScene({
  focus = "none",
  interactive = true,
  paused = false,
  className,
  onReady,
}: HouseSceneProps) {
  const reducedMotion = usePrefersReducedMotion();
  const animate = !reducedMotion;
  const weights = focusWeights(focus);
  const frameloop = paused ? "never" : animate ? "always" : "demand";

  return (
    <Canvas
      className={className}
      aria-hidden="true"
      frameloop={frameloop}
      dpr={DPR}
      shadows="percentage"
      gl={GL}
      camera={CAMERA}
      style={CANVAS_STYLE}
      onCreated={handleCreated}
    >
      <RuntimeProvider animate={animate}>
        <Lighting />
        <StaticShadows />
        <CameraRig interactive={interactive} />
        <Island />
        <GroundOcclusion />
        <GroundShadow />
        <Trees />
        <group position={HOUSE_ORIGIN}>
          <House heating={weights.chauffage} hotWater={weights.eauChaude} />
          <HeatPump heating={weights.chauffage} />
          <WaterTank hotWater={weights.eauChaude} />
          <Ventilation airflow={weights.ventilation} />
          <Insulation insulation={weights.isolation} />
        </group>
        <EnergyMotes />
        <InvalidateOn value={focus} />
        <ReadySignal onReady={onReady} />
        {animate ? <AdaptiveResolution /> : null}
      </RuntimeProvider>
    </Canvas>
  );
}
