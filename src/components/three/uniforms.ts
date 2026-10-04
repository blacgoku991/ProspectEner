import type { RootState } from "@react-three/fiber";
import type { ShaderMaterial } from "three";

/** Met à jour un uniform numérique (sans effet si le matériau n'est pas monté). */
export function setUniform(material: ShaderMaterial | null, name: string, value: number): void {
  const uniform = material?.uniforms[name];
  if (uniform) uniform.value = value;
}

/**
 * Facteur de taille des points (px par unité monde à distance 1),
 * pour des particules en perspective indépendantes de la résolution.
 */
export function pointScale(state: RootState): number {
  const camera = state.camera;
  const fov = "fov" in camera ? camera.fov : 30;
  return (state.size.height * state.viewport.dpr) / (2 * Math.tan((fov * Math.PI) / 360));
}
