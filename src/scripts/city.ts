/**
 * Los Santos, la nuit — ville procédurale en WebGL pour l'accueil.
 * Un seul maillage instancié pour les immeubles (fenêtres et néons calculés dans le shader),
 * des phares qui filent sur les avenues, des projecteurs, un hélicoptère et la constellation de la Lyre.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export interface CityHandle {
  /** Progression du défilement dans le hero, de 0 à 1. */
  setScroll(p: number): void;
  /** Lance le travelling d'ouverture. */
  intro(): void;
  setActive(active: boolean): void;
  dispose(): void;
}

interface Options {
  reduced: boolean;
  lowPower: boolean;
}

const FOG = new THREE.Color(0x150a2e);
const HORIZON = new THREE.Color(0xff4f9a);

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FOG_CHUNK = /* glsl */ `
  uniform vec3 uFog;
  uniform float uFogDensity;
  vec3 applyFog(vec3 col, float depth) {
    float f = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
    return mix(col, uFog, clamp(f, 0.0, 1.0));
  }
`;

export function createCity(canvas: HTMLCanvasElement, { reduced, lowPower }: Options): CityHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !lowPower,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setClearColor(0x05050b, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  let dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.6);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 900);

  const shared = {
    uTime: { value: 0 },
    uFog: { value: FOG },
    uFogDensity: { value: 0.0058 },
    uHorizon: { value: HORIZON },
  };

  const rand = mulberry32(20261117);

  /* ------------------------------------------------------------ Ciel */

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(700, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: shared.uTime },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 top = vec3(0.006, 0.007, 0.022);
          vec3 mid = vec3(0.055, 0.022, 0.14);
          vec3 hor = vec3(0.86, 0.22, 0.5);
          vec3 sun = vec3(1.0, 0.66, 0.34);
          vec3 col = mix(mid, top, smoothstep(0.0, 0.5, h));
          col = mix(col, hor * 0.5, exp(-max(h, 0.0) * 8.5));
          float az = max(dot(normalize(d.xz + 1e-5), normalize(vec2(0.28, -1.0))), 0.0);
          col += sun * pow(az, 5.0) * exp(-max(h, 0.0) * 13.0) * 0.75;
          col += hor * pow(az, 2.0) * exp(-max(h, 0.0) * 5.0) * 0.14;
          // Brume au ras de l'horizon : le sol s'y fond sans ligne dure
          col = mix(vec3(0.082, 0.039, 0.18), col, smoothstep(-0.012, 0.085, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  sky.frustumCulled = false;
  scene.add(sky);

  /* ------------------------------------------------------------ Étoiles & Lyre */

  const starCount = lowPower ? 500 : 1100;
  const starPos = new Float32Array(starCount * 3);
  const starInfo = new Float32Array(starCount * 2);
  for (let i = 0; i < starCount; i++) {
    const u = rand() * Math.PI * 2;
    const v = Math.acos(1 - rand() * 0.86);
    const r = 620;
    starPos[i * 3] = r * Math.sin(v) * Math.cos(u);
    starPos[i * 3 + 1] = r * Math.cos(v) + 14;
    starPos[i * 3 + 2] = r * Math.sin(v) * Math.sin(u);
    starInfo[i * 2] = rand();
    starInfo[i * 2 + 1] = 0.6 + rand() * 1.9;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aInfo', new THREE.BufferAttribute(starInfo, 2));
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: shared.uTime, uDpr: { value: dpr } },
    vertexShader: /* glsl */ `
      attribute vec2 aInfo;
      uniform float uTime;
      uniform float uDpr;
      varying float vAlpha;
      void main() {
        float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aInfo.x * 1.8) + aInfo.x * 40.0);
        float h = normalize(position).y;
        vAlpha = tw * smoothstep(0.03, 0.3, h);
        gl_PointSize = aInfo.y * uDpr * 1.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(vec3(0.85, 0.88, 1.0) * a * 1.4, a);
      }
    `,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  // La Lyre : Véga et son parallélogramme, clin d'œil au nom du serveur.
  const lyra = new THREE.Group();
  const lyraPts: Array<[number, number, number]> = [
    [0, 1.0, 2.6], // Véga
    [0.55, 1.18, 1.1],
    [0.42, 0.58, 1.2],
    [1.0, 0.34, 1.1],
    [0.74, -0.62, 1.3],
    [0.18, -0.36, 1.3],
  ];
  const lyraLinks = [0, 2, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 2];
  const lyraScale = 34;
  const linePos: number[] = [];
  for (const idx of lyraLinks) {
    const [x, y] = lyraPts[idx];
    linePos.push(x * lyraScale, y * lyraScale, 0);
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  lyra.add(
    new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: 0xb9a8ff, transparent: true, opacity: 0.2, depthWrite: false }),
    ),
  );
  const flareTex = makeFlareTexture();
  for (const [x, y, s] of lyraPts) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: flareTex,
        color: s > 2 ? 0xcfe2ff : 0xd9ccff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: s > 2 ? 1 : 0.7,
      }),
    );
    sp.scale.setScalar(s * 9);
    sp.position.set(x * lyraScale, y * lyraScale, 0);
    lyra.add(sp);
  }
  const vega = lyra.children[1] as THREE.Sprite;
  lyra.position.set(-150, 215, -520);
  lyra.lookAt(0, 30, 130);
  scene.add(lyra);

  /* ------------------------------------------------------------ Sol */

  const BLOCK = 10;
  const ROAD = 3.4;
  const CELL = BLOCK + ROAD;
  const N = lowPower ? 16 : 24;
  const HALF = (N * CELL) / 2;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600),
    new THREE.ShaderMaterial({
      uniforms: { ...shared, uCell: { value: CELL }, uRoad: { value: ROAD }, uHalf: { value: HALF } },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        varying float vDepth;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vec4 mv = viewMatrix * w;
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${FOG_CHUNK}
        uniform float uCell;
        uniform float uRoad;
        uniform float uHalf;
        uniform float uTime;
        varying vec3 vWorld;
        varying float vDepth;
        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }
        void main() {
          vec2 p = vWorld.xz + uHalf;
          vec2 q = mod(p, uCell);
          float inCity = step(abs(vWorld.x), uHalf + 2.0) * step(abs(vWorld.z), uHalf + 2.0);
          float roadX = step(q.x, uRoad);
          float roadZ = step(q.y, uRoad);
          float road = max(roadX, roadZ) * inCity;
          vec3 col = mix(vec3(0.012, 0.012, 0.028), vec3(0.03, 0.028, 0.055), road);

          // Marquage central en pointillés
          float cx = abs(q.x - uRoad * 0.5);
          float cz = abs(q.y - uRoad * 0.5);
          float dashX = roadX * (1.0 - roadZ) * smoothstep(0.07, 0.03, cx) * step(0.5, fract(p.y * 0.42));
          float dashZ = roadZ * (1.0 - roadX) * smoothstep(0.07, 0.03, cz) * step(0.5, fract(p.x * 0.42));
          col += vec3(0.9, 0.75, 0.45) * (dashX + dashZ) * 0.16 * inCity;

          // Halos des lampadaires le long des avenues
          vec2 lampCell = vec2(6.7);
          vec2 lp = abs(mod(p + lampCell * 0.5, lampCell) - lampCell * 0.5);
          float lamp = exp(-dot(lp, lp) * 0.55) * road;
          float tone = hash21(floor((p + lampCell * 0.5) / lampCell));
          vec3 lampCol = mix(vec3(1.0, 0.72, 0.38), vec3(0.55, 0.8, 1.0), step(0.82, tone));
          col += lampCol * lamp * 0.55;

          // Reflets humides
          float wet = hash21(floor(p * 3.0)) * road;
          col += vec3(0.5, 0.25, 0.6) * wet * 0.018;

          col = applyFog(col, vDepth);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  /* ------------------------------------------------------------ Immeubles */

  interface Building {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    y: number;
    seed: number;
    neon: number;
  }
  const buildings: Building[] = [];
  const beacons: number[] = [];

  const clusters = [
    { x: 6, z: -6, r: 36, k: 1 },
    { x: 78, z: -58, r: 22, k: 0.62 },
    { x: -86, z: -30, r: 20, k: 0.5 },
  ];
  const densityAt = (x: number, z: number) => {
    let dmax = 0;
    for (const c of clusters) {
      const dd = (x - c.x) ** 2 + (z - c.z) ** 2;
      dmax = Math.max(dmax, c.k * Math.exp(-dd / (2 * c.r * c.r)));
    }
    return dmax;
  };

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const bx = -HALF + i * CELL + ROAD + BLOCK / 2;
      const bz = -HALF + j * CELL + ROAD + BLOCK / 2;
      const dens = densityAt(bx, bz);
      if (rand() < 0.05 - dens * 0.05) continue; // quelques places vides

      const pattern = rand();
      const lots: Array<[number, number, number, number]> = [];
      if (pattern < 0.22 + dens * 0.3) {
        lots.push([0, 0, BLOCK, BLOCK]);
      } else if (pattern < 0.6) {
        const alongX = rand() < 0.5;
        const cut = 0.38 + rand() * 0.24;
        if (alongX) {
          lots.push([-(BLOCK * (1 - cut)) / 2, 0, BLOCK * cut, BLOCK]);
          lots.push([(BLOCK * cut) / 2, 0, BLOCK * (1 - cut), BLOCK]);
        } else {
          lots.push([0, -(BLOCK * (1 - cut)) / 2, BLOCK, BLOCK * cut]);
          lots.push([0, (BLOCK * cut) / 2, BLOCK, BLOCK * (1 - cut)]);
        }
      } else {
        const q = BLOCK / 2;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) lots.push([(sx * q) / 2, (sz * q) / 2, q, q]);
      }

      for (const [ox, oz, lw, ld] of lots) {
        if (rand() < 0.07) continue;
        const margin = 0.5 + rand() * 0.7;
        const w = Math.max(1.6, lw - margin);
        const d = Math.max(1.6, ld - margin);
        const tall = rand() < 0.16 + dens * 0.25 ? 1.45 : 1;
        let h = 1.6 + rand() * 4.4 + dens * (14 + rand() * 40) * tall;
        h = Math.min(h, 74);
        const seed = rand();
        const neon = rand() < 0.1 + dens * 0.3 ? 1 + Math.floor(rand() * 3) : 0;
        const x = bx + ox;
        const z = bz + oz;
        buildings.push({ x, z, w, d, h, y: 0, seed, neon });

        // Tours à gradins : un volume plus étroit posé sur le premier
        if (h > 22 && rand() < 0.7) {
          const k = 0.5 + rand() * 0.25;
          const h2 = h * (0.22 + rand() * 0.3);
          buildings.push({ x, z, w: w * k, d: d * k, h: h2, y: h, seed: seed * 0.73 + 0.11, neon });
          if (h + h2 > 48 && rand() < 0.75) {
            buildings.push({ x, z, w: 0.22, d: 0.22, h: 5 + rand() * 7, y: h + h2, seed: 0.5, neon: 0 });
            beacons.push(x, h + h2 + 9, z);
          } else if (h + h2 > 30) {
            beacons.push(x + w * k * 0.3, h + h2 + 0.5, z);
          }
        } else if (h > 28) {
          beacons.push(x, h + 0.5, z);
        }
      }
    }
  }

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const info = new Float32Array(buildings.length * 2);
  const buildingMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute vec2 aInfo;
      varying vec3 vLocal;
      varying vec3 vScale;
      varying vec3 vN;
      varying vec2 vInfo;
      varying float vDepth;
      void main() {
        vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vLocal = position * vScale;
        vN = normal;
        vInfo = aInfo;
        vec4 mv = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${FOG_CHUNK}
      uniform float uTime;
      uniform vec3 uHorizon;
      varying vec3 vLocal;
      varying vec3 vScale;
      varying vec3 vN;
      varying vec2 vInfo;
      varying float vDepth;
      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      void main() {
        float seed = vInfo.x;
        vec3 base = mix(vec3(0.014, 0.016, 0.036), vec3(0.045, 0.034, 0.085), fract(seed * 3.17));
        vec3 col;
        if (vN.y > 0.5) {
          // Toit : légèrement plus clair, liseré sur le pourtour
          vec2 e = abs(vLocal.xz) / (vScale.xz * 0.5);
          float rim = smoothstep(0.86, 0.98, max(e.x, e.y));
          col = base * 1.5 + vec3(0.06, 0.05, 0.11) * rim;
        } else if (vN.y < -0.5) {
          col = base;
        } else {
          bool sideX = abs(vN.x) > 0.5;
          float u = sideX ? vLocal.z : vLocal.x;
          float w = sideX ? vScale.z : vScale.x;
          float v = vLocal.y;
          float cw = mix(0.5, 0.86, fract(seed * 7.13));
          float ch = mix(0.62, 0.9, fract(seed * 3.71));
          vec2 g = vec2((u + w * 0.5) / cw, v / ch);
          vec2 id = floor(g);
          vec2 f = fract(g);
          float face = sideX ? 17.0 : 3.0;
          float n = hash21(id + seed * 91.7 + face);
          float lit = step(0.8 - 0.3 * fract(seed * 5.3), n);
          // Quelques fenêtres s'allument et s'éteignent
          float tw = hash21(id * 1.7 + seed * 13.1 + face);
          lit *= step(0.12, fract(tw * 7.0 + uTime * 0.035 * (0.4 + tw)));
          float wx = smoothstep(0.1, 0.2, f.x) * smoothstep(0.9, 0.8, f.x);
          float wy = smoothstep(0.22, 0.32, f.y) * smoothstep(0.86, 0.76, f.y);
          // Pas de fenêtres au ras du sol ni sur l'arête du toit
          float band = smoothstep(0.4, 0.9, v) * smoothstep(vScale.y, vScale.y - 0.5, v);
          float win = wx * wy * lit * band;
          // Au loin, les fenêtres se fondent en une lueur moyenne (évite le scintillement)
          float far = clamp(max(fwidth(g.x), fwidth(g.y)) * 1.5 - 0.25, 0.0, 1.0);
          win = mix(win, 0.11 * band, far);
          float tone = hash21(id + seed * 3.3);
          vec3 warm = vec3(1.0, 0.74, 0.42);
          vec3 cool = vec3(0.5, 0.82, 1.0);
          vec3 rose = vec3(1.0, 0.42, 0.72);
          vec3 wc = tone < 0.62 ? warm : (tone < 0.88 ? cool : rose);
          float inten = 0.35 + 1.3 * hash21(id * 2.3 + seed);
          col = base + wc * win * inten * 1.5;

          // Lueur du crépuscule sur les façades tournées vers l'horizon
          float facing = max(dot(vN, normalize(vec3(0.28, 0.0, -1.0))), 0.0);
          col += uHorizon * facing * 0.035 * (0.25 + v / max(vScale.y, 1.0));

          // Néons : couronne lumineuse et arête verticale
          if (vInfo.y > 0.5) {
            vec3 neon = vInfo.y < 1.5 ? vec3(1.0, 0.2, 0.62) : (vInfo.y < 2.5 ? vec3(0.25, 0.85, 1.0) : vec3(0.58, 0.38, 1.0));
            float crown = smoothstep(vScale.y - 0.34, vScale.y - 0.22, v);
            float edge = smoothstep(0.16, 0.06, abs(u - (w * 0.5 - 0.3))) * step(vScale.y * 0.25, v);
            float pulse = 0.85 + 0.15 * sin(uTime * 1.3 + seed * 30.0);
            col += neon * (crown * 2.4 + edge * 1.5 * step(0.5, fract(seed * 11.0))) * pulse;
          }
        }
        col = applyFog(col, vDepth);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const city = new THREE.InstancedMesh(boxGeo, buildingMat, buildings.length);
  const m4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  buildings.forEach((b, i) => {
    pos.set(b.x, b.y, b.z);
    scl.set(b.w, b.h, b.d);
    city.setMatrixAt(i, m4.compose(pos, quat, scl));
    info[i * 2] = b.seed;
    info[i * 2 + 1] = b.neon;
  });
  boxGeo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 2));
  city.instanceMatrix.needsUpdate = true;
  city.frustumCulled = false;
  scene.add(city);

  /* ------------------------------------------------------------ Balises rouges des toits */

  const beaconGeo = new THREE.BufferGeometry();
  beaconGeo.setAttribute('position', new THREE.Float32BufferAttribute(beacons, 3));
  const beaconPhase = new Float32Array(beacons.length / 3);
  for (let i = 0; i < beaconPhase.length; i++) beaconPhase[i] = rand() * 6.28;
  beaconGeo.setAttribute('aPhase', new THREE.BufferAttribute(beaconPhase, 1));
  const beaconMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: shared.uTime, uDpr: { value: dpr } },
    vertexShader: /* glsl */ `
      attribute float aPhase;
      uniform float uTime;
      uniform float uDpr;
      varying float vA;
      void main() {
        vA = 0.25 + 0.75 * smoothstep(0.35, 1.0, sin(uTime * 2.2 + aPhase));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(170.0 / -mv.z, 1.5, 7.0) * uDpr;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vA;
        gl_FragColor = vec4(vec3(1.0, 0.12, 0.16) * a * 3.0, a);
      }
    `,
  });
  const beaconPoints = new THREE.Points(beaconGeo, beaconMat);
  beaconPoints.frustumCulled = false;
  scene.add(beaconPoints);

  /* ------------------------------------------------------------ Circulation */

  const carCount = lowPower ? 220 : 520;
  const carBox = new THREE.BoxGeometry(0.16, 0.07, 0.95);
  const carGeo = new THREE.InstancedBufferGeometry();
  carGeo.index = carBox.index;
  carGeo.setAttribute('position', carBox.getAttribute('position'));
  const carData = new Float32Array(carCount * 4);
  for (let i = 0; i < carCount; i++) {
    const axis = rand() < 0.5 ? 0 : 1;
    const lane = Math.floor(rand() * (N + 1));
    const dir = rand() < 0.5 ? 1 : -1;
    const centre = -HALF + lane * CELL + ROAD / 2;
    carData[i * 4] = axis;
    carData[i * 4 + 1] = centre + dir * 0.62 * (axis === 0 ? 1 : -1);
    carData[i * 4 + 2] = dir * (5 + rand() * 9);
    carData[i * 4 + 3] = rand() * N * CELL;
  }
  carGeo.setAttribute('aCar', new THREE.InstancedBufferAttribute(carData, 4));
  carGeo.instanceCount = carCount;
  const cars = new THREE.Mesh(
    carGeo,
    new THREE.ShaderMaterial({
      uniforms: { ...shared, uExtent: { value: N * CELL + ROAD } },
      vertexShader: /* glsl */ `
        attribute vec4 aCar;
        uniform float uTime;
        uniform float uExtent;
        varying vec3 vCol;
        varying float vDepth;
        void main() {
          float along = mod(aCar.w + uTime * aCar.z, uExtent) - uExtent * 0.5;
          vec3 p = position;
          vec3 world = aCar.x < 0.5
            ? vec3(along + p.z, p.y + 0.14, aCar.y + p.x)
            : vec3(aCar.y + p.x, p.y + 0.14, along + p.z);
          vCol = aCar.z > 0.0 ? vec3(1.0, 0.12, 0.1) : vec3(1.0, 0.9, 0.68);
          vec4 mv = viewMatrix * vec4(world, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${FOG_CHUNK}
        varying vec3 vCol;
        varying float vDepth;
        void main() {
          gl_FragColor = vec4(applyFog(vCol * 2.6, vDepth * 0.75), 1.0);
        }
      `,
    }),
  );
  cars.frustumCulled = false;
  scene.add(cars);

  /* ------------------------------------------------------------ Projecteurs & hélicoptère */

  const beamMat = (color: number, strength: number) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormalV = normalize(normalMatrix * normal);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uStrength;
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        void main() {
          float along = pow(1.0 - vUv.y, 1.6);
          float soft = pow(abs(dot(normalize(vNormalV), normalize(vViewDir))), 1.4);
          float a = along * soft * uStrength;
          gl_FragColor = vec4(uColor * a, a);
        }
      `,
    });

  const searchlights: Array<{ group: THREE.Group; phase: number; speed: number }> = [];
  const beamGeo = new THREE.CylinderGeometry(9, 0.25, 170, 20, 1, true);
  beamGeo.translate(0, 85, 0);
  const lightSpots: Array<[number, number, number, number]> = [
    [-4, 30, 6, 0xbfa8ff],
    [20, 24, -18, 0xff8fc6],
    [-22, 18, -22, 0x9fe3ff],
  ];
  for (const [x, y, z, color] of lightSpots) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.add(new THREE.Mesh(beamGeo, beamMat(color, 0.17)));
    scene.add(group);
    searchlights.push({ group, phase: rand() * 6.28, speed: 0.12 + rand() * 0.12 });
  }

  const heli = new THREE.Group();
  const heliConeGeo = new THREE.CylinderGeometry(0.2, 8, 62, 18, 1, true);
  heliConeGeo.translate(0, -31, 0);
  const heliCone = new THREE.Mesh(heliConeGeo, beamMat(0xdfeaff, 0.2));
  // Le dégradé du faisceau part du haut : on inverse la coordonnée v.
  const uvAttr = heliConeGeo.getAttribute('uv');
  for (let i = 0; i < uvAttr.count; i++) uvAttr.setY(i, 1 - uvAttr.getY(i));
  heli.add(heliCone);
  const heliLight = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: flareTex,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  heliLight.scale.setScalar(5);
  heli.add(heliLight);
  const heliBlink = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: flareTex,
      color: 0xff2030,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  heliBlink.scale.setScalar(3.4);
  heliBlink.position.set(0, 0.6, -1.4);
  heli.add(heliBlink);
  scene.add(heli);

  /* ------------------------------------------------------------ Rendu */

  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  if (!lowPower) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.78, 0.72, 0.16);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const state = { scroll: 0, intro: reduced ? 1 : 0, mx: 0, my: 0, tx: 0, ty: 0 };
  let width = 0;
  let height = 0;
  let portrait = false;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w === width && h === height) return;
    width = w;
    height = h;
    portrait = w / h < 0.9;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer?.setPixelRatio(dpr);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = portrait ? 52 : 38;
    camera.updateProjectionMatrix();
    starMat.uniforms.uDpr.value = dpr;
    beaconMat.uniforms.uDpr.value = dpr;
  }

  const target = new THREE.Vector3();
  function update(t: number) {
    shared.uTime.value = t;
    state.mx += (state.tx - state.mx) * 0.04;
    state.my += (state.ty - state.my) * 0.04;

    const ease = 1 - Math.pow(1 - state.intro, 3);
    const s = state.scroll;
    const drift = Math.sin(t * 0.045) * 0.11;
    const angle = (portrait ? 0.05 : -0.2) + drift + state.mx * 0.07;
    const radius = 198 - ease * 40 - s * 26;
    const camY = 62 - ease * 22 + Math.sin(t * 0.06) * 1.6 + s * 34 - state.my * 4;
    camera.position.set(Math.sin(angle) * radius, camY, Math.cos(angle) * radius);
    target.set(portrait ? 4 : -34, 19 + s * 80 + (1 - ease) * 10, 0);
    camera.lookAt(target);
    shared.uFogDensity.value = 0.0058 + (1 - ease) * 0.004;

    for (const sl of searchlights) {
      sl.group.rotation.z = Math.sin(t * sl.speed + sl.phase) * 0.55;
      sl.group.rotation.x = Math.cos(t * sl.speed * 0.8 + sl.phase * 2) * 0.4 - 0.15;
    }

    const ha = t * 0.14 + 1.4;
    heli.position.set(8 + Math.cos(ha) * 46, 52 + Math.sin(t * 0.5) * 2, -6 + Math.sin(ha) * 34);
    heliCone.rotation.x = Math.sin(t * 0.7) * 0.22;
    heliCone.rotation.z = Math.cos(t * 0.5) * 0.22;
    heliBlink.material.opacity = Math.sin(t * 6) > 0.4 ? 1 : 0;

    vega.material.opacity = 0.85 + Math.sin(t * 1.7) * 0.15;
  }

  function render() {
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  let elapsed = 0;
  let prevNow = 0;
  let raf = 0;
  let active = false;
  let frames = 0;
  let slowFrames = 0;
  let lastNow = 0;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    resize();
    // Temps propre à la scène : il se fige quand elle est en pause.
    if (prevNow) elapsed += Math.min(0.1, (now - prevNow) / 1000);
    prevNow = now;
    update(elapsed + 40);
    render();

    // Garde-fou : si la machine peine, on allège le rendu.
    if (lastNow) {
      const dt = now - lastNow;
      frames++;
      if (frames > 20 && dt > 34) slowFrames++;
      if (frames === 140) {
        if (slowFrames > 60) {
          if (dpr > 1) {
            dpr = 1;
            width = 0;
          } else if (composer) {
            composer = null;
          }
          frames = 0;
          slowFrames = 0;
        }
      }
    }
    lastNow = now;
  }

  function setActive(next: boolean) {
    if (next === active) return;
    active = next;
    cancelAnimationFrame(raf);
    lastNow = 0;
    prevNow = 0;
    if (active && !reduced) {
      raf = requestAnimationFrame(frame);
    } else if (active) {
      renderStill();
    }
  }

  function renderStill() {
    resize();
    update(40);
    render();
  }

  const onPointer = (e: PointerEvent) => {
    state.tx = (e.clientX / window.innerWidth) * 2 - 1;
    state.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  const onResize = () => {
    if (reduced) {
      width = 0;
      renderStill();
    }
  };
  const onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (active && !reduced) {
      lastNow = 0;
      prevNow = 0;
      raf = requestAnimationFrame(frame);
    }
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  // Première image immédiate, avant même le lever du voile.
  renderStill();

  return {
    setScroll(p) {
      state.scroll = Math.min(1, Math.max(0, p));
      if (reduced && active) renderStill();
    },
    intro() {
      if (reduced) return;
      const start = performance.now();
      const dur = 3200;
      const step = (now: number) => {
        state.intro = Math.min(1, (now - start) / dur);
        if (state.intro < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    setActive,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.dispose();
    },
  };
}

/** Texture d'éclat en croix (étoile à quatre branches) générée sur un canvas 2D. */
function makeFlareTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,255,255,.55)');
  g.addColorStop(0.4, 'rgba(255,255,255,.08)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';
  for (const horizontal of [true, false]) {
    const lg = horizontal
      ? ctx.createLinearGradient(0, 0, size, 0)
      : ctx.createLinearGradient(0, 0, 0, size);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,.9)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    if (horizontal) ctx.fillRect(0, size / 2 - 1, size, 2);
    else ctx.fillRect(size / 2 - 1, 0, 2, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
