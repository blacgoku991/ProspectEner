/**
 * L'étoile d'Elyra en volume : un cristal à quatre branches, irisé, entouré d'anneaux et de poussière.
 * Sert d'emblème 3D en tête des pages intérieures. Réagit au pointeur et au défilement.
 */
import * as THREE from 'three';

export interface CrystalHandle {
  setActive(active: boolean): void;
  dispose(): void;
}

interface Options {
  reduced: boolean;
  colors: [string, string];
}

function starGeometry() {
  const tipY = 1.62;
  const tipX = 1.16;
  const inner = 0.215;
  const depth = 0.44;
  const outline: Array<[number, number]> = [
    [tipX, 0],
    [inner, inner],
    [0, tipY],
    [-inner, inner],
    [-tipX, 0],
    [-inner, -inner],
    [0, -tipY],
    [inner, -inner],
  ];
  const pos: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const [ax, ay] = outline[i];
    const [bx, by] = outline[(i + 1) % outline.length];
    pos.push(0, 0, depth, ax, ay, 0, bx, by, 0); // face avant
    pos.push(0, 0, -depth, bx, by, 0, ax, ay, 0); // face arrière
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createCrystal(canvas: HTMLCanvasElement, { reduced, colors }: Options): CrystalHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 8.4);

  const c1 = new THREE.Color(colors[0]);
  const c2 = new THREE.Color(colors[1]);
  const uniforms = {
    uTime: { value: 0 },
    uC1: { value: c1 },
    uC2: { value: c2 },
    uC3: { value: new THREE.Color('#ffc56e') },
  };

  const rig = new THREE.Group();
  scene.add(rig);

  /* ---- Cristal ---- */
  const geo = starGeometry();
  const gem = new THREE.Mesh(
    geo,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vView;
        varying vec3 vPos;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          vPos = position;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uC1;
        uniform vec3 uC2;
        uniform vec3 uC3;
        varying vec3 vN;
        varying vec3 vView;
        varying vec3 vPos;
        void main() {
          vec3 n = normalize(vN);
          vec3 v = normalize(vView);
          float ndv = abs(dot(n, v));
          float fres = pow(1.0 - ndv, 2.2);
          // Irisation : la teinte glisse avec l'orientation de la facette
          float band = 0.5 + 0.5 * sin(n.x * 3.2 + n.y * 2.1 + vPos.y * 1.4 + uTime * 0.5);
          vec3 base = mix(uC1, uC2, band);
          base = mix(base, uC3, smoothstep(0.55, 1.0, 0.5 + 0.5 * sin(n.y * 4.0 - uTime * 0.35 + 1.7)) * 0.65);
          vec3 l1 = normalize(vec3(0.5, 0.8, 0.9));
          vec3 l2 = normalize(vec3(-0.7, -0.3, 0.6));
          float diff = max(dot(n, l1), 0.0) * 0.75 + max(dot(n, l2), 0.0) * 0.35;
          float spec = pow(max(dot(reflect(-l1, n), v), 0.0), 26.0) + pow(max(dot(reflect(-l2, n), v), 0.0), 40.0) * 0.6;
          vec3 col = base * (0.22 + diff * 0.9);
          col += vec3(1.0) * spec * 0.85;
          col += mix(uC2, vec3(1.0), 0.55) * fres * 0.9;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 1),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
  );
  const star = new THREE.Group();
  star.add(gem, edges);
  rig.add(star);

  /* ---- Halo ---- */
  const haloTex = radialTexture();
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTex,
      color: c2,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  halo.scale.setScalar(7.4);
  halo.position.z = -1.2;
  rig.add(halo);

  /* ---- Anneaux et satellites ---- */
  const rings: Array<{ pivot: THREE.Group; sat: THREE.Sprite; radius: number; speed: number; phase: number }> = [];
  const ringDefs: Array<[number, number, number, number]> = [
    [2.25, 1.15, 0.25, 0.42],
    [2.75, -0.5, 0.9, -0.3],
    [3.15, 0.35, -0.7, 0.22],
  ];
  ringDefs.forEach(([radius, rx, ry, speed], i) => {
    const pivot = new THREE.Group();
    pivot.rotation.set(rx, ry, 0);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.006, 6, 160),
      new THREE.MeshBasicMaterial({
        color: i === 1 ? c2 : c1,
        transparent: true,
        opacity: 0.5 - i * 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    pivot.add(ring);
    const sat = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTex,
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sat.scale.setScalar(0.36 - i * 0.05);
    pivot.add(sat);
    rig.add(pivot);
    rings.push({ pivot, sat, radius, speed, phase: i * 2.1 });
  });

  /* ---- Poussière d'étoiles ---- */
  const count = 420;
  const dustPos = new Float32Array(count * 3);
  const dustInfo = new Float32Array(count);
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    const r = 2 + rnd() * 2.6;
    const a = rnd() * Math.PI * 2;
    const b = Math.acos(2 * rnd() - 1);
    dustPos[i * 3] = r * Math.sin(b) * Math.cos(a);
    dustPos[i * 3 + 1] = r * Math.cos(b) * 0.8;
    dustPos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
    dustInfo[i] = rnd();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('aInfo', new THREE.BufferAttribute(dustInfo, 1));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { ...uniforms, uDpr: { value: dpr } },
      vertexShader: /* glsl */ `
        attribute float aInfo;
        uniform float uTime;
        uniform float uDpr;
        varying float vA;
        varying float vMix;
        void main() {
          vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.8 + aInfo * 2.0) + aInfo * 50.0));
          vMix = aInfo;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (1.2 + aInfo * 2.6) * uDpr * (8.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uC1;
        uniform vec3 uC2;
        varying float vA;
        varying float vMix;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA;
          gl_FragColor = vec4(mix(uC1, uC2, vMix) * a * 1.6 + vec3(a * 0.25), a);
        }
      `,
    }),
  );
  rig.add(dust);

  /* ---- Boucle ---- */
  const state = { tx: 0, ty: 0, x: 0, y: 0, spin: 0 };
  let width = 0;
  let height = 0;

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Sur un cadre étroit, on recule pour garder les anneaux entiers.
    camera.position.z = camera.aspect < 1 ? 8.4 / camera.aspect : 8.4;
    camera.updateProjectionMatrix();
  }

  function update(t: number) {
    uniforms.uTime.value = t;
    state.x += (state.tx - state.x) * 0.05;
    state.y += (state.ty - state.y) * 0.05;
    const scroll = window.scrollY * 0.0016;
    star.rotation.y = t * 0.35 + state.x * 0.9 + scroll * 2.2;
    star.rotation.x = Math.sin(t * 0.4) * 0.12 + state.y * 0.5;
    star.rotation.z = Math.sin(t * 0.25) * 0.1;
    star.position.y = Math.sin(t * 0.8) * 0.1;
    rig.rotation.y = state.x * 0.25;
    rig.rotation.x = state.y * 0.18;
    rig.position.y = scroll * 0.9;
    for (const r of rings) {
      r.pivot.rotation.z = t * r.speed * 0.4;
      const a = t * r.speed * 1.6 + r.phase;
      r.sat.position.set(Math.cos(a) * r.radius, Math.sin(a) * r.radius, 0);
    }
    dust.rotation.y = t * 0.04;
    halo.material.opacity = 0.48 + Math.sin(t * 1.3) * 0.08;
  }

  let raf = 0;
  let active = false;
  let elapsed = 0;
  let prev = 0;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (prev) elapsed += Math.min(0.1, (now - prev) / 1000);
    prev = now;
    resize();
    update(elapsed + 3);
    renderer.render(scene, camera);
  }
  function still() {
    width = 0;
    resize();
    update(3);
    renderer.render(scene, camera);
  }

  const onPointer = (e: PointerEvent) => {
    state.tx = (e.clientX / window.innerWidth) * 2 - 1;
    state.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  const onResize = () => {
    if (reduced) still();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('resize', onResize);

  still();

  return {
    setActive(next) {
      if (next === active) return;
      active = next;
      cancelAnimationFrame(raf);
      prev = 0;
      if (active && !reduced) raf = requestAnimationFrame(frame);
      else if (active) still();
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    },
  };
}

function radialTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,.4)');
  g.addColorStop(0.6, 'rgba(255,255,255,.08)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
