// Geometry helpers: every model is built from primitives, painted with vertex colours
// and merged, so one toon material draws a whole animal body (or the whole island) in one call.
import * as THREE from './vendor/three.module.js';
import { mergeGeometries } from './vendor/addons/utils/BufferGeometryUtils.js';

const _c = new THREE.Color();

// 4-step toon ramp shared by all lit materials
const ramp = new Uint8Array([90, 160, 215, 255]);
export const gradientMap = new THREE.DataTexture(ramp, ramp.length, 1, THREE.RedFormat);
gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

export const toonMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap });
export const outlineMat = new THREE.MeshBasicMaterial({ color: 0x2a1d17, side: THREE.BackSide });

// paint a geometry one colour (optionally a vertical gradient: color at top, color2 at bottom)
export function paint(geo, color, color2 = null, emissive = 0) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  const pos = g.attributes.position, n = pos.count;
  const col = new Float32Array(n * 3);
  let minY = Infinity, maxY = -Infinity;
  if (color2 !== null) for (let i = 0; i < n; i++) { const y = pos.getY(i); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const a = new THREE.Color(color), b = color2 !== null ? new THREE.Color(color2) : a;
  for (let i = 0; i < n; i++) {
    const t = color2 !== null ? (pos.getY(i) - minY) / (maxY - minY || 1) : 1;
    _c.copy(b).lerp(a, t);
    col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// place a painted geometry: position, rotation (euler xyz), scale (number or [x,y,z])
export function place(g, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
    Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s));
  g.applyMatrix4(m);
  return g;
}

export const P = (geo, color, p, r, s, color2) => place(paint(geo, color, color2), p, r, s);
export const sphere = (seg = 14) => new THREE.SphereGeometry(0.5, seg, Math.max(6, Math.round(seg * 0.7)));
export const box = () => new THREE.BoxGeometry(1, 1, 1);
export const cyl = (rt = 0.5, rb = 0.5, seg = 10) => new THREE.CylinderGeometry(rt, rb, 1, seg);
export const cone = (seg = 8) => new THREE.ConeGeometry(0.5, 1, seg);
export const ico = (d = 0) => new THREE.IcosahedronGeometry(0.5, d);

export function merge(list) {
  const g = mergeGeometries(list.filter(Boolean), false);
  g.computeBoundingSphere();
  return g;
}

export function mesh(list, mat = toonMat, shadow = true) {
  const m = new THREE.Mesh(Array.isArray(list) ? merge(list) : list, mat);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

// small seeded random so the island looks the same every visit
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
