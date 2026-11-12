// The island diorama: sea, beach, grass top, trees, hut, pond, the nest and the egg.
import * as THREE from './vendor/three.module.js';
import { P, paint, place, sphere, cyl, cone, box, ico, mesh, merge, toonMat, gradientMap, rng } from './geo.js';
import { EGGS } from './animals.js';

export const NEST = new THREE.Vector3(0, 0, 3.3);
const R = (a) => 8.4 + 0.55 * Math.sin(3 * a + 1) + 0.35 * Math.sin(5 * a + 2) + 0.18 * Math.sin(9 * a + 0.5);
export const islandRadius = R;

function blobShape(rf, n = 96) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, r = rf(a); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  return s;
}
function slab(rf, depth, bevel, top, c1, c2) {
  let g = new THREE.ExtrudeGeometry(blobShape(rf), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, top - depth - bevel, 0);
  return paint(g, c1, c2);
}

// ---- reusable scenery pieces (painted geometry lists) ----
function roundTree(L, x, z, s, rnd) {
  const h = 1.3 * s;
  L.push(P(cyl(0.12, 0.18, 7), '#8a5a36', [x, h / 2, z], [0, 0, (rnd() - 0.5) * 0.15], [s, h, s]));
  const greens = ['#5fb84a', '#4fa83f', '#74c855'];
  for (let i = 0; i < 4; i++) {
    const a = rnd() * 6.28, d = i ? 0.45 * s : 0, y = h + (i ? 0.1 : 0.55) * s;
    L.push(P(ico(1), greens[i % 3], [x + Math.cos(a) * d, y, z + Math.sin(a) * d], [rnd(), rnd(), 0], (i ? 0.95 : 1.35) * s, greens[(i + 1) % 3]));
  }
}
function pineTree(L, x, z, s) {
  L.push(P(cyl(0.1, 0.14, 6), '#7a4e2e', [x, 0.35 * s, z], [0, 0, 0], [s, 0.7 * s, s]));
  for (let i = 0; i < 3; i++) L.push(P(cone(7), i % 2 ? '#3f9a54' : '#4fae5f', [x, (0.9 + i * 0.55) * s, z], [0, i, 0], [(1.5 - i * 0.38) * s, 0.95 * s, (1.5 - i * 0.38) * s], '#2f7a44'));
}
function palm(L, x, z, s, lean) {
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    L.push(P(cyl(0.11, 0.13, 6), i % 2 ? '#c99a62' : '#b5844e', [x + Math.sin(lean) * t * t * 1.2 * s, (0.3 + i * 0.42) * s, z + Math.cos(lean) * t * t * 1.2 * s], [Math.cos(lean) * t * 0.5, 0, -Math.sin(lean) * t * 0.5], [s, 0.44 * s, s]));
  }
  const tx = x + Math.sin(lean) * 1.0 * s, ty = 2.75 * s, tz = z + Math.cos(lean) * 1.0 * s;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    L.push(P(sphere(8), i % 2 ? '#4fb04a' : '#62c454', [tx + Math.cos(a) * 0.75 * s, ty - 0.12 * s, tz + Math.sin(a) * 0.75 * s], [0, -a, 0.45], [1.5 * s, 0.1 * s, 0.42 * s]));
  }
  L.push(P(sphere(6), '#7a5232', [tx + 0.12, ty - 0.25 * s, tz], [0, 0, 0], 0.22 * s));
  L.push(P(sphere(6), '#7a5232', [tx - 0.1, ty - 0.28 * s, tz + 0.1], [0, 0, 0], 0.22 * s));
}
const rock = (L, x, z, s, rnd, y = 0) => L.push(P(ico(0), rnd() > 0.5 ? '#b8b0a4' : '#a39b90', [x, y + 0.15 * s, z], [rnd() * 3, rnd() * 3, rnd() * 3], [s, 0.65 * s, s * 0.9], '#857d72'));
function bush(L, x, z, s, rnd, berries) {
  for (let i = 0; i < 3; i++) L.push(P(ico(1), i % 2 ? '#5bb04a' : '#6cc257', [x + (i - 1) * 0.35 * s, 0.3 * s, z + (rnd() - 0.5) * 0.3], [rnd(), rnd(), 0], (0.75 - Math.abs(i - 1) * 0.15) * s, '#4a9a3c'));
  if (berries) for (let i = 0; i < 5; i++) L.push(P(sphere(6), berries, [x + (rnd() - 0.5) * 0.8 * s, 0.35 * s + rnd() * 0.3 * s, z + 0.3 * s], [0, 0, 0], 0.09));
}
function flower(L, x, z, c, rnd) {
  L.push(P(cyl(0.015, 0.015, 4), '#4f9a3a', [x, 0.12, z], [0, 0, 0], [1, 0.24, 1]));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; L.push(P(sphere(5), c, [x + Math.cos(a) * 0.06, 0.25, z + Math.sin(a) * 0.06], [0, 0, 0], [0.07, 0.03, 0.07])); }
  L.push(P(sphere(5), '#ffd23d', [x, 0.26, z], [0, 0, 0], 0.05));
}
const tuft = (L, x, z, rnd) => { for (let i = 0; i < 3; i++) L.push(P(cone(4), rnd() > 0.5 ? '#79c955' : '#5fb348', [x + (i - 1) * 0.06, 0.1, z + (rnd() - 0.5) * 0.08], [(rnd() - 0.5) * 0.5, rnd() * 3, (i - 1) * 0.4], [0.07, 0.25 + rnd() * 0.1, 0.07])); };
function mushroom(L, x, z, s) {
  L.push(P(cyl(0.06, 0.08, 6), '#fff4e0', [x, 0.12 * s, z], [0, 0, 0], [s, 0.24 * s, s]));
  L.push(P(sphere(10), '#ff5a4a', [x, 0.26 * s, z], [0, 0, 0], [0.34 * s, 0.2 * s, 0.34 * s]));
  for (let i = 0; i < 3; i++) L.push(P(sphere(5), '#ffffff', [x + (i - 1) * 0.08 * s, 0.33 * s, z + (i === 1 ? 0.07 : -0.03) * s], [0, 0, 0], 0.045 * s));
}
function fence(L, x1, z1, x2, z2) {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, z2 - z1) / 0.8));
  const ang = Math.atan2(x2 - x1, z2 - z1);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
    L.push(P(box(), '#e8c48a', [x, 0.32, z], [0, ang, 0], [0.13, 0.64, 0.13], '#b58a52'));
    L.push(P(cone(4), '#e8c48a', [x, 0.7, z], [0, ang + Math.PI / 4, 0], [0.18, 0.12, 0.18]));
  }
  const len = Math.hypot(x2 - x1, z2 - z1);
  for (const y of [0.28, 0.5]) L.push(P(box(), '#d9b070', [(x1 + x2) / 2, y, (z1 + z2) / 2], [0, ang, 0], [0.06, 0.08, len]));
}
function hut(L, x, z, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const at = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  L.push(P(box(), '#f4e3c0', [x, 0.8, z], [0, rot, 0], [2.4, 1.6, 2.0], '#d9c296'));
  // roof
  const roofL = P(box(), '#e2603f', [0, 0, 0], [0, 0, 0], [1.55, 0.14, 2.4], '#c44a30');
  for (const sd of [-1, 1]) {
    const g = P(box(), sd > 0 ? '#e2603f' : '#d4553a', [0, 0, 0], [0, 0, 0], [1.6, 0.16, 2.5]);
    const m = new THREE.Matrix4().makeRotationZ(-sd * 0.62); g.applyMatrix4(m);
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(sd * 0.6, 2.05, 0));
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(rot)); g.applyMatrix4(new THREE.Matrix4().makeTranslation(x, 0, z));
    L.push(g);
  }
  roofL.dispose?.();
  L.push(P(cyl(0.08, 0.08, 6), '#c44a30', [x, 2.52, z], [Math.PI / 2, 0, rot], [1, 2.5, 1]));
  // gable fill
  const tri = new THREE.Shape(); tri.moveTo(-1.2, 0); tri.lineTo(1.2, 0); tri.lineTo(0, 0.9); tri.lineTo(-1.2, 0);
  for (const sd of [-1, 1]) {
    const g = paint(new THREE.ShapeGeometry(tri), '#f4e3c0');
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 1.6, sd * 1.0)); if (sd < 0) g.applyMatrix4(new THREE.Matrix4().makeRotationY(0));
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(rot)); g.applyMatrix4(new THREE.Matrix4().makeTranslation(x, 0, z)); L.push(g);
  }
  // door + windows on the front (+z local)
  let [dx, dz] = at(0, 1.01);
  L.push(P(box(), '#9a6236', [dx, 0.55, dz], [0, rot, 0], [0.6, 1.1, 0.06]));
  L.push(P(sphere(6), '#ffd04a', ...[[at(0.18, 1.05)[0], 0.55, at(0.18, 1.05)[1]]], [0, 0, 0], 0.06));
  for (const sx of [-1, 1]) {
    [dx, dz] = at(sx * 0.78, 1.01);
    L.push(P(box(), '#8fd3ff', [dx, 1.0, dz], [0, rot, 0], [0.42, 0.42, 0.05]));
    L.push(P(box(), '#ffffff', [dx, 1.0, dz], [0, rot, 0], [0.5, 0.06, 0.07]));
    L.push(P(box(), '#ffffff', [dx, 1.0, dz], [0, rot, 0], [0.06, 0.5, 0.07]));
    [dx, dz] = at(sx * 0.78, 1.08);
    L.push(P(box(), '#9a6236', [dx, 0.74, dz], [0, rot, 0], [0.55, 0.1, 0.12]));
    for (let k = 0; k < 3; k++) L.push(P(sphere(5), ['#ff6a8a', '#ffd23d', '#ffffff'][k], [dx + (k - 1) * 0.15 * Math.cos(rot), 0.82, dz - (k - 1) * 0.15 * Math.sin(rot)], [0, 0, 0], 0.09));
  }
  // egg sign above the door
  [dx, dz] = at(0, 1.05);
  L.push(P(sphere(10), '#fff3d6', [dx, 1.42, dz], [0, 0, 0], [0.26, 0.34, 0.1]));
  L.push(P(sphere(6), '#8cc265', [dx + 0.05, 1.47, dz + 0.04], [0, 0, 0], 0.07));
  // chimney
  [dx, dz] = at(0.55, -0.4);
  L.push(P(box(), '#b8b0a4', [dx, 2.35, dz], [0, rot, 0], [0.32, 0.7, 0.32]));
}
function pond(L, x, z, obstacles) {
  const sh = blobShape((a) => 1.5 + 0.2 * Math.sin(3 * a), 40);
  const ring = paint(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.18, bevelSegments: 1 }).rotateX(-Math.PI / 2), '#c9b48a');
  ring.translate(x, -0.02, z); L.push(ring);
  const w = paint(new THREE.ShapeGeometry(blobShape((a) => 1.38 + 0.2 * Math.sin(3 * a), 40)).rotateX(-Math.PI / 2), '#5cc8e8');
  w.translate(x, 0.135, z); L.push(w);
  for (let i = 0; i < 3; i++) { const a = i * 2.1; L.push(P(cyl(0.25, 0.25, 10), '#5fb84a', [x + Math.cos(a) * 0.7, 0.15, z + Math.sin(a) * 0.6], [0, a, 0], [1, 0.03, 1])); }
  L.push(P(sphere(6), '#ff8ab0', [x + 0.7, 0.19, z], [0, 0, 0], [0.12, 0.08, 0.12]));
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3; rockAt(L, x + Math.cos(a) * 1.75, z + Math.sin(a) * 1.65, 0.3 + (i % 3) * 0.08, i); }
  obstacles.push({ x, z, r: 1.9 });
}
function rockAt(L, x, z, s, i) { L.push(P(ico(0), i % 2 ? '#b8b0a4' : '#a39b90', [x, 0.08, z], [i, i * 2, 0], [s, 0.5 * s, s], '#857d72')); }

// ---- egg ----
function eggGeometry() {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, y = t;
    const r = Math.pow(Math.sin(Math.PI * t), 0.85) * 0.5 * (1.08 - 0.28 * t);
    pts.push(new THREE.Vector2(Math.max(r, 0.0001), y));
  }
  const g = new THREE.LatheGeometry(pts, 36);
  g.scale(1.25, 1.45, 1.25);
  return g;
}
function eggTexture(type, crack, seed) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  const c = cv.getContext('2d'), e = EGGS[type], rnd = rng(seed);
  const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, shade(e.base, -0.1)); g.addColorStop(0.5, e.base); g.addColorStop(1, shade(e.base, 0.08));
  c.fillStyle = g; c.fillRect(0, 0, 512, 256);
  // decorations per egg type
  if (type === 3) { c.fillStyle = e.spot; for (const y of [95, 150]) { c.beginPath(); for (let x = 0; x <= 512; x += 8) c.lineTo(x, y + Math.sin(x / 512 * Math.PI * 8) * 9); c.lineTo(512, y + 18); for (let x = 512; x >= 0; x -= 8) c.lineTo(x, y + 18 + Math.sin(x / 512 * Math.PI * 8) * 9); c.fill(); } }
  if (type === 1) { c.fillStyle = e.spot2; c.fillRect(0, 118, 512, 16); for (let x = 0; x < 512; x += 32) { c.beginPath(); c.ellipse(x + 16, 126, 12, 6, 0.6, 0, 7); c.fill(); } }
  const n = type === 2 ? 26 : 34;
  for (let i = 0; i < n; i++) {
    const x = rnd() * 512, y = 30 + rnd() * 200, r = (type === 0 ? 8 : 5) + rnd() * 12;
    c.fillStyle = rnd() > 0.35 ? e.spot : e.spot2;
    if (type === 2) { star(c, x, y, r * 0.8); continue; }
    c.beginPath(); c.ellipse(x, y, r, r * 0.8, rnd() * 3, 0, 7); c.fill();
    if (x < 30) { c.beginPath(); c.ellipse(x + 512, y, r, r * 0.8, 0, 0, 7); c.fill(); }
  }
  if (type === 4) { c.strokeStyle = '#ffb02a'; c.lineWidth = 5; for (let i = 0; i < 6; i++) { c.beginPath(); let x = i * 85 + 20, y = 40; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 40; y += 30; c.lineTo(x, y); } c.stroke(); } }
  // cracks grow with the stage (0..3)
  if (crack > 0) {
    c.strokeStyle = '#3a2418'; c.lineCap = 'round'; c.lineJoin = 'round';
    const lines = [3, 6, 10][crack - 1], cr = rng(77);
    for (let i = 0; i < lines; i++) {
      let x = (i / lines) * 512 + cr() * 30, y = 70 + cr() * 30;
      c.lineWidth = 5 - crack * 0.5; c.beginPath(); c.moveTo(x, y);
      const steps = 2 + crack * 2;
      for (let k = 0; k < steps; k++) { x += (cr() - 0.5) * 50; y += (cr() > 0.5 ? 1 : -1) * (10 + cr() * 14); c.lineTo(x, y); }
      c.stroke();
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function star(c, x, y, r) { c.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); }
function shade(hex, k) { const col = new THREE.Color(hex); const hsl = {}; col.getHSL(hsl); col.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + k))); return '#' + col.getHexString(); }

export function buildWorld(scene) {
  const rnd = rng(7);
  const obstacles = [];
  const L = [];

  // sea: one big plane with a radial gradient (shallow turquoise around the island → deep blue)
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const c2 = cv.getContext('2d');
  const gr = c2.createRadialGradient(256, 256, 30, 256, 256, 256);
  gr.addColorStop(0, '#8ff0e6'); gr.addColorStop(0.16, '#5fd8e0'); gr.addColorStop(0.3, '#34aee0'); gr.addColorStop(0.6, '#2a8fd6'); gr.addColorStop(1, '#2a7fcc');
  c2.fillStyle = gr; c2.fillRect(0, 0, 512, 512);
  const seaTex = new THREE.CanvasTexture(cv); seaTex.colorSpace = THREE.SRGBColorSpace;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshBasicMaterial({ map: seaTex }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.55; scene.add(sea);

  // beach + grass slabs
  L.push(slab((a) => R(a) + 1.5, 0.35, 0.25, -0.18, '#f6e2a8', '#d9b775'));
  L.push(slab(R, 0.3, 0.16, 0.0, '#86cc52', '#8a6038'));
  // a few darker grass patches + a dirt path from the hut to the nest
  for (let i = 0; i < 9; i++) { const a = rnd() * 6.28, d = 2 + rnd() * 5; L.push(P(cyl(1, 1, 14), i % 2 ? '#74b845' : '#93d662', [Math.cos(a) * d, 0.005, Math.sin(a) * d], [0, rnd(), 0], [0.7 + rnd() * 0.9, 0.01, 0.5 + rnd() * 0.6])); }
  for (let i = 0; i < 16; i++) { const t = i / 15, x = Math.sin(t * 5) * 0.7, z = -4.0 + t * 5.4; L.push(P(cyl(1, 1, 12), i % 2 ? '#dcbc80' : '#d4b072', [x, 0.012, z], [0, rnd(), 0], [0.78, 0.01, 0.55]));
    if (i % 3 === 1) for (const sd of [-1, 1]) L.push(P(ico(0), '#c9c0b0', [x + sd * 0.95, 0.04, z], [rnd(), rnd(), 0], [0.22, 0.1, 0.18]));
    if (i % 2 === 0) for (const sd of [-1, 1]) flower(L, x + sd * (1.1 + rnd() * 0.4), z + rnd() * 0.3, ['#ff6a8a', '#ffd23d', '#ffffff', '#b07aff'][(i + (sd > 0 ? 1 : 0)) % 4], rnd); }

  // hut (the hatchery) at the back
  { const HL = []; hut(HL, 0, 0, 0); HL.forEach((g) => { g.scale(1.25, 1.25, 1.25); g.translate(0, 0, -5.4); L.push(g); }); } obstacles.push({ x: 0, z: -5.4, r: 2.1 });
  // trees around the rim (leave the front open for the camera)
  const treeSpots = [[-5.6, -3.8, 1.15], [-3.2, -6.2, 1.0], [3.4, -6.4, 1.1], [5.8, -3.6, 1.2], [-7.0, -0.6, 0.95], [7.2, -0.2, 1.0], [-2.0, -7.3, 0.85], [2.0, -7.6, 0.8]];
  treeSpots.forEach(([x, z, s], i) => { (i % 3 === 2 ? pineTree : roundTree)(L, x, z, s, rnd); obstacles.push({ x, z, r: 0.9 * s }); });
  // palms on the beach
  [[-8.7, 2.5, 1.0, 1.0], [9.0, 3.2, 1.05, -1.2], [-6.5, 6.8, 0.9, 2.4], [7.8, -5.6, 1.0, -0.6]].forEach(([x, z, s, lean]) => palm(L, x, z, s, lean));
  // pond on the left, bushes, rocks, flowers, mushrooms
  pond(L, -4.3, 1.9, obstacles);
  [[4.6, 1.4, 1, '#ff5a6a'], [-6.6, -2.5, 0.8, null], [6.6, -2.2, 0.9, '#5a7aff'], [-1.8, -3.0, 0.7, null], [2.6, -3.4, 0.75, '#ff5a6a']].forEach(([x, z, s, b]) => { bush(L, x, z, s, rnd, b); obstacles.push({ x, z, r: 0.7 * s }); });
  for (let i = 0; i < 12; i++) { const a = rnd() * 6.28, rr = R(a) + 0.6 + rnd() * 0.6; rock(L, Math.cos(a) * rr, Math.sin(a) * rr, 0.35 + rnd() * 0.5, rnd, -0.2); }
  [[5.6, 3.6, 0.9], [-2.6, 5.4, 0.6], [3.0, -1.2, 0.5]].forEach(([x, z, s]) => { rock(L, x, z, s, rnd); obstacles.push({ x, z, r: 0.5 * s }); });
  const fcol = ['#ff6a8a', '#ffffff', '#ffd23d', '#b07aff', '#ff9a4a'];
  for (let i = 0; i < 46; i++) { const a = rnd() * 6.28, d = 1.5 + rnd() * (R(a) - 2.2); const x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.hypot(x - NEST.x, z - NEST.z) < 1.8) continue; flower(L, x, z, fcol[i % 5], rnd); }
  for (let i = 0; i < 60; i++) { const a = rnd() * 6.28, d = 1 + rnd() * (R(a) - 1.3); const x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.hypot(x - NEST.x, z - NEST.z) < 1.6) continue; tuft(L, x, z, rnd); }
  [[-5.2, -1.4], [6.0, 0.8], [1.5, -5.2]].forEach(([x, z], i) => mushroom(L, x, z, 1 + i * 0.2));
  fence(L, -3.8, -3.6, -1.6, -3.9); fence(L, 1.6, -3.9, 3.8, -3.6);
  obstacles.push({ x: -2.7, z: -3.75, r: 0.6 }, { x: -1.9, z: -3.85, r: 0.5 }, { x: 2.7, z: -3.75, r: 0.6 }, { x: 1.9, z: -3.85, r: 0.5 });

  // nest: stone base, straw ring, twigs
  L.push(P(cyl(1.25, 1.35, 16), '#b8b0a4', [NEST.x, 0.08, NEST.z], [0, 0, 0], [1, 0.16, 1], '#968e82'));
  L.push(place(paint(new THREE.TorusGeometry(0.85, 0.32, 10, 24), '#e9c46a', '#b98a3a'), [NEST.x, 0.38, NEST.z], [Math.PI / 2, 0, 0], [1, 1, 0.75]));
  L.push(P(cyl(0.85, 0.85, 16), '#a8772e', [NEST.x, 0.3, NEST.z], [0, 0, 0], [1, 0.08, 1]));
  for (let i = 0; i < 26; i++) { const a = (i / 26) * 6.28 + rnd() * 0.2; L.push(P(cyl(0.025, 0.025, 4), i % 2 ? '#c9993f' : '#f0d27a', [NEST.x + Math.cos(a) * 0.9, 0.45 + rnd() * 0.12, NEST.z + Math.sin(a) * 0.9], [rnd() * 0.6, -a, Math.PI / 2 + (rnd() - 0.5) * 0.8], [1, 0.7, 1])); }
  obstacles.push({ x: NEST.x, z: NEST.z, r: 2.0 }, { x: NEST.x, z: NEST.z + 1.8, r: 1.8 });

  const ground = mesh(L);
  ground.castShadow = true; ground.receiveShadow = true;
  scene.add(ground);

  // foam ring around the beach (pulses)
  const foamG = new THREE.ShapeGeometry((() => { const s = blobShape((a) => R(a) + 2.05); s.holes.push(new THREE.Path(blobShape((a) => R(a) + 1.65).getPoints().reverse())); return s; })());
  foamG.rotateX(-Math.PI / 2);
  const foam = new THREE.Mesh(foamG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }));
  foam.position.y = -0.5; scene.add(foam);
  const foam2 = foam.clone(); foam2.material = foam.material.clone(); scene.add(foam2);

  // clouds
  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const cl = []; const n = 4 + (i % 3);
    for (let k = 0; k < n; k++) cl.push(P(sphere(10), '#ffffff', [k * 1.1 - n * 0.55, Math.sin(k * 1.7) * 0.35, (k % 2) * 0.5], [0, 0, 0], [1.6 + (k % 2) * 0.6, 1.2 + (k % 3) * 0.3, 1.3], '#e3eefa'));
    const m = mesh(cl, toonMat, false); m.receiveShadow = false;
    m.position.set(-30 + i * 15, 9 + (i % 2) * 3, -26 - (i % 3) * 6); m.scale.setScalar(1.3 + (i % 2) * 0.4);
    scene.add(m); clouds.push(m);
  }

  // egg + its glow disc
  const eggGroup = new THREE.Group(); eggGroup.position.copy(NEST).setY(0.32); eggGroup.scale.setScalar(1.15); scene.add(eggGroup);
  const eggMat = new THREE.MeshToonMaterial({ gradientMap, map: null, emissive: 0x000000 });
  const egg = new THREE.Mesh(eggGeometry(), eggMat); egg.castShadow = true; eggGroup.add(egg);
  const eggOl = new THREE.Mesh(egg.geometry, new THREE.MeshBasicMaterial({ color: 0x2a1d17, side: THREE.BackSide }));
  eggOl.scale.setScalar(1.045); eggOl.position.y = -0.03; egg.add(eggOl);
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,200,90,1)'); g.addColorStop(1, 'rgba(255,160,60,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(NEST.x, 0.36, NEST.z); scene.add(glow);

  // heat lamp (appears with the first Warm Lamp level) and a treat bowl (first Treats level)
  const lamp = mesh([
    P(cyl(0.07, 0.09, 8), '#5a6478', [0, 1.1, 0], [0, 0, 0], [1, 2.2, 1]),
    P(cyl(0.05, 0.05, 8), '#5a6478', [-0.45, 2.2, 0], [0, 0, Math.PI / 2], [1, 0.9, 1]),
    P(cone(12), '#e2603f', [-0.9, 2.05, 0], [0, 0, 0], [0.55, 0.4, 0.55]),
    P(cyl(0.3, 0.35, 10), '#5a6478', [0, 0.04, 0], [0, 0, 0], [1, 0.08, 1]),
  ]);
  lamp.position.set(NEST.x + 1.7, 0, NEST.z - 0.5); lamp.visible = false; scene.add(lamp);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  bulb.position.set(-0.9, 1.84, 0); lamp.add(bulb);
  const bulbGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
  bulbGlow.scale.setScalar(1.4); bulb.add(bulbGlow);
  const bowl = mesh([
    P(cyl(0.42, 0.3, 14), '#4f8ae8', [0, 0.14, 0], [0, 0, 0], [1, 0.28, 1], '#3a6ac0'),
    ...Array.from({ length: 9 }, (_, i) => P(sphere(6), ['#ff6a4a', '#ffd23d', '#9ad65a'][i % 3], [Math.cos(i * 2.3) * 0.2, 0.3, Math.sin(i * 2.3) * 0.2], [0, 0, 0], 0.16)),
  ]);
  bowl.position.set(NEST.x - 1.8, 0, NEST.z - 0.2); bowl.visible = false; scene.add(bowl);
  obstacles.push({ x: lamp.position.x, z: lamp.position.z, r: 0.5 }, { x: bowl.position.x, z: bowl.position.z, r: 0.6 });

  let eggType = -1, eggCrack = -1, eggSeed = 1;
  function setEgg(type, crack, seed = eggSeed) {
    if (type === eggType && crack === eggCrack && seed === eggSeed) return;
    eggType = type; eggCrack = crack; eggSeed = seed;
    eggMat.map?.dispose(); eggMat.map = eggTexture(type, crack, seed); eggMat.needsUpdate = true;
    eggMat.emissive.set(type === 4 ? 0x401808 : 0x000000);
  }

  function update(t) {
    const k = (t * 0.25) % 1, k2 = (t * 0.25 + 0.5) % 1;
    foam.scale.setScalar(1 + k * 0.06); foam.material.opacity = 0.75 * (1 - k);
    foam2.scale.setScalar(1 + k2 * 0.06); foam2.material.opacity = 0.75 * (1 - k2);
    clouds.forEach((cl, i) => { cl.position.x += 0.004 * (1 + i * 0.2); if (cl.position.x > 45) cl.position.x = -45; });
  }

  return { obstacles, egg, eggGroup, glow, lamp, bulb, bowl, setEgg, update, ground };
}
