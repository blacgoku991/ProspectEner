/* Shaders GLSL de la scène (compilés par three.js, aucun eval). */

/** Particules « énergie » : mouvement entièrement calculé sur GPU. */
export const MOTES_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uScale;
uniform float uHeight;
uniform float uBase;
attribute float aSeed;
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float speed = 0.05 + 0.08 * fract(aSeed * 7.13);
  float y = mod(position.y - uBase + uTime * speed, uHeight);
  float phase = aSeed * 6.2831853;
  vec3 p = vec3(
    position.x + sin(uTime * 0.31 + phase) * 0.22,
    uBase + y,
    position.z + cos(uTime * 0.27 + phase * 1.7) * 0.22
  );
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float k = y / uHeight;
  float twinkle = 0.6 + 0.4 * sin(uTime * (1.2 + fract(aSeed * 3.3)) + phase * 4.0);
  vAlpha = smoothstep(0.0, 0.15, k) * (1.0 - smoothstep(0.62, 1.0, k)) * twinkle;
  vColor = aColor;
  gl_PointSize = aSize * uScale / max(-mvPosition.z, 0.001);
}
`;

/** Particules de flux : positions mises à jour côté CPU le long de courbes. */
export const FLOW_POINTS_VERTEX = /* glsl */ `
uniform float uScale;
uniform vec3 uColorA;
uniform vec3 uColorB;
attribute float aProgress;
attribute float aSize;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float t = clamp(aProgress, 0.0, 1.0);
  vAlpha = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.7, 1.0, t));
  vColor = mix(uColorA, uColorB, t);
  gl_PointSize = aSize * uScale * (0.7 + 0.45 * vAlpha) / max(-mvPosition.z, 0.001);
}
`;

export const POINTS_FRAGMENT = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float halo = 1.0 - smoothstep(0.0, 1.0, d);
  halo *= halo;
  float core = 1.0 - smoothstep(0.0, 0.42, d);
  vec3 color = mix(vColor, vec3(1.0, 0.98, 0.93), core * 0.5);
  gl_FragColor = vec4(color, min(1.0, (halo * 0.7 + core * 0.45) * vAlpha * uOpacity));
  #include <colorspace_fragment>
}
`;

/** Rubans de flux d'air : tirets qui défilent le long du tube (uv.x). */
export const RIBBON_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const RIBBON_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uRepeat;
uniform float uSpeed;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec2 vUv;

void main() {
  float flow = fract(vUv.x * uRepeat - uTime * uSpeed);
  float dash = smoothstep(0.0, 0.2, flow) * (1.0 - smoothstep(0.32, 0.7, flow));
  float ends = smoothstep(0.0, 0.1, vUv.x) * (1.0 - smoothstep(0.8, 1.0, vUv.x));
  vec3 color = mix(uColorA, uColorB, vUv.x);
  gl_FragColor = vec4(color, (0.32 + 0.68 * dash) * ends * uOpacity);
  #include <colorspace_fragment>
}
`;

/** Enveloppe isolante : effet de Fresnel + bande de balayage verticale. */
export const SHELL_VERTEX = /* glsl */ `
uniform float uMinY;
uniform float uMaxY;
varying vec3 vNormalW;
varying vec3 vViewW;
varying float vHeight;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewW = cameraPosition - worldPosition.xyz;
  vHeight = (position.y - uMinY) / (uMaxY - uMinY);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const SHELL_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uColorHi;
uniform float uOpacity;
uniform float uTime;
varying vec3 vNormalW;
varying vec3 vViewW;
varying float vHeight;

void main() {
  vec3 n = normalize(vNormalW);
  vec3 v = normalize(vViewW);
  float fresnel = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 2.0);
  float band = fract(uTime * 0.2) * 1.4 - 0.2;
  float scan = 1.0 - smoothstep(0.0, 0.09, abs(vHeight - band));
  float strata = smoothstep(0.86, 1.0, abs(sin(vHeight * 3.14159265 * 11.0)));
  float alpha = 0.2 + 0.45 * fresnel + 0.45 * scan + 0.08 * strata;
  vec3 color = mix(uColor, uColorHi, clamp(scan * 0.8 + fresnel * 0.35, 0.0, 1.0));
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  #include <colorspace_fragment>
}
`;

/** Disque à dégradé radial (ombre portée douce, halos lumineux). */
export const RADIAL_VERTEX = RIBBON_VERTEX;

export const SHADOW_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  // d = 1 au bord du plan ; alpha nul au-delà de d = 0.7 (aucune « marche » au bord du canvas)
  float d = length(vUv - 0.5) * 2.0;
  float core = 1.0 - smoothstep(0.3, 0.6, d);
  float halo = 1.0 - smoothstep(0.25, 0.7, d);
  float alpha = core * 0.65 + halo * halo * 0.35;
  gl_FragColor = vec4(uColor, alpha * uOpacity);
  #include <colorspace_fragment>
}
`;

export const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float alpha = 1.0 - smoothstep(0.0, 1.0, d);
  gl_FragColor = vec4(uColor, alpha * alpha * uOpacity);
  #include <colorspace_fragment>
}
`;
