import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
  type ColorRepresentation,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Vec3 = [number, number, number];

/** Gabarit de boîte unité : seulement cloné, jamais rendu. */
export const UNIT_BOX = new BoxGeometry(1, 1, 1);

const _position = new Vector3();
const _quaternion = new Quaternion();
const _euler = new Euler();
const _scale = new Vector3();

/** Matrice translation · rotation (XYZ) · échelle. */
export function trs(position: Vec3, rotation: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1]): Matrix4 {
  _euler.set(rotation[0], rotation[1], rotation[2]);
  _quaternion.setFromEuler(_euler);
  return new Matrix4().compose(
    _position.set(position[0], position[1], position[2]),
    _quaternion,
    _scale.set(scale[0], scale[1], scale[2]),
  );
}

/** Produit `parent · local` sans modifier les matrices d'entrée. */
export function within(parent: Matrix4, local: Matrix4): Matrix4 {
  return parent.clone().multiply(local);
}

interface BuilderOptions {
  /** Ajoute un attribut `color` par sommet (un seul matériau pour plusieurs teintes). */
  color?: boolean;
  /** Conserve les UV (nécessaires à certains shaders). */
  uv?: boolean;
}

/**
 * Fusionne de nombreuses pièces statiques en une seule géométrie
 * (un seul draw call par matériau).
 */
export class MeshBuilder {
  private readonly parts: BufferGeometry[] = [];
  private readonly withColor: boolean;
  private readonly withUv: boolean;

  constructor(options: BuilderOptions = {}) {
    this.withColor = options.color ?? true;
    this.withUv = options.uv ?? false;
  }

  get isEmpty(): boolean {
    return this.parts.length === 0;
  }

  add(source: BufferGeometry, matrix: Matrix4, color: ColorRepresentation = "#ffffff"): this {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    geometry.applyMatrix4(matrix);
    geometry.clearGroups();
    for (const name of Object.keys(geometry.attributes)) {
      const keep = name === "position" || name === "normal" || (name === "uv" && this.withUv);
      if (!keep) geometry.deleteAttribute(name);
    }
    if (this.withColor) {
      const c = new Color(color);
      const count = geometry.getAttribute("position").count;
      const data = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        data[i * 3] = c.r;
        data[i * 3 + 1] = c.g;
        data[i * 3 + 2] = c.b;
      }
      geometry.setAttribute("color", new BufferAttribute(data, 3));
    }
    this.parts.push(geometry);
    return this;
  }

  /** Boîte de dimensions `size` centrée en `position` (repère `parent` optionnel). */
  box(
    size: Vec3,
    position: Vec3,
    color?: ColorRepresentation,
    rotation: Vec3 = [0, 0, 0],
    parent?: Matrix4,
  ): this {
    const local = trs(position, rotation, size);
    return this.add(UNIT_BOX, parent ? within(parent, local) : local, color);
  }

  build(): BufferGeometry {
    const merged = this.parts.length > 0 ? mergeGeometries(this.parts, false) : new BufferGeometry();
    for (const part of this.parts) part.dispose();
    this.parts.length = 0;
    if (!merged) throw new Error("MeshBuilder: fusion des géométries impossible");
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    return merged;
  }
}

/** Petit générateur pseudo-aléatoire déterministe (mulberry32). */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
