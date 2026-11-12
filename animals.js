// The 20 collectible animals: data + procedural chibi models (one round "mochi" body with a face).
import * as THREE from './vendor/three.module.js';
import { P, sphere, cyl, cone, box, mesh, merge, toonMat, outlineMat, paint, place } from './geo.js';

// rarity: 0 common, 1 uncommon, 2 rare, 3 legendary
export const RARITY = [
  { key: 'common', color: '#8fbf5a', weight: 60, mult: 1 },
  { key: 'uncommon', color: '#4fa8e0', weight: 28, mult: 1.7 },
  { key: 'rare', color: '#b06ee0', weight: 10, mult: 3 },
  { key: 'legendary', color: '#ffb52e', weight: 2, mult: 7 },
];

// egg types, in unlock order
export const EGGS = [
  { key: 'meadow', base: '#fff3d6', spot: '#8cc265', spot2: '#5f9f45', heat: 14, cost: 0, coin: 1, need: 0 },
  { key: 'forest', base: '#d9ecb4', spot: '#7a5a3a', spot2: '#4f8a3a', heat: 45, cost: 250, coin: 4, need: 3 },
  { key: 'snow', base: '#eef7ff', spot: '#8cc8f0', spot2: '#4f8fd0', heat: 140, cost: 2000, coin: 15, need: 3 },
  { key: 'beach', base: '#ffe2a8', spot: '#3cc2c0', spot2: '#ff8a5c', heat: 380, cost: 10000, coin: 55, need: 3 },
  { key: 'volcano', base: '#5a2b2b', spot: '#ff8a2a', spot2: '#ffd04a', heat: 1000, cost: 45000, coin: 200, need: 3 },
];

export const ANIMALS = [
  // meadow
  { id: 'chick', egg: 0, r: 0 }, { id: 'bunny', egg: 0, r: 1 }, { id: 'piglet', egg: 0, r: 2 }, { id: 'lamb', egg: 0, r: 3 },
  // forest
  { id: 'hedgehog', egg: 1, r: 0 }, { id: 'owlet', egg: 1, r: 1 }, { id: 'fox', egg: 1, r: 2 }, { id: 'mossbear', egg: 1, r: 3 },
  // snow
  { id: 'penguin', egg: 2, r: 0 }, { id: 'seal', egg: 2, r: 1 }, { id: 'polarbear', egg: 2, r: 2 }, { id: 'frostfox', egg: 2, r: 3 },
  // beach
  { id: 'crab', egg: 3, r: 0 }, { id: 'turtle', egg: 3, r: 1 }, { id: 'parrot', egg: 3, r: 2 }, { id: 'otter', egg: 3, r: 3 },
  // volcano
  { id: 'lizard', egg: 4, r: 0 }, { id: 'snail', egg: 4, r: 1 }, { id: 'dragon', egg: 4, r: 2 }, { id: 'phoenix', egg: 4, r: 3 },
];
ANIMALS.forEach((a, i) => { a.i = i; });

const DARK = '#2a1d17', WHITE = '#ffffff', CHEEK = '#ff9a9a';

// ---- part builders (all return painted geometries in body space: feet at y=0, face toward +z) ----
function eyes(L, { y = 0.62, x = 0.17, z = 0.4, s = 0.13, ring = null } = {}) {
  for (const sx of [-1, 1]) {
    if (ring) L.push(P(sphere(12), ring, [sx * x, y, z - 0.02], [0, 0, 0], [s * 2.1, s * 2.1, s * 0.9]));
    const S = s * 1.28, ex = sx * (x + 0.015);
    L.push(P(sphere(12), DARK, [ex, y, z], [0, 0, 0], [S, S * 1.18, S * 0.8]));
    L.push(P(sphere(8), WHITE, [ex + 0.032, y + 0.05, z + S * 0.3], [0, 0, 0], S * 0.42));
    L.push(P(sphere(6), WHITE, [ex - 0.028, y - 0.045, z + S * 0.3], [0, 0, 0], S * 0.18));
  }
}
const cheeks = (L, y = 0.5, x = 0.28, z = 0.37) => { for (const sx of [-1, 1]) L.push(P(sphere(8), CHEEK, [sx * x, y, z], [0, sx * 0.5, 0], [0.12, 0.07, 0.04])); };
const blob = (L, c, c2, sx = 1, sy = 0.92, sz = 0.95, y = 0.5) => L.push(P(sphere(18), c, [0, y, 0], [0, 0, 0], [sx, sy, sz], c2));
const belly = (L, c, y = 0.42, s = [0.62, 0.55, 0.3], z = 0.3) => L.push(P(sphere(14), c, [0, y, z], [0, 0, 0], s));
const beak = (L, c, y = 0.5, len = 0.2) => L.push(P(cone(8), c, [0, y, 0.47 + len * 0.35], [Math.PI / 2, 0, 0], [0.16, len, 0.12]));
function earsTri(L, c, inner, { x = 0.24, y = 0.9, h = 0.32, tilt = 0.35 } = {}) {
  for (const sx of [-1, 1]) {
    L.push(P(cone(4), c, [sx * x, y, 0], [0, Math.PI / 4, -sx * tilt], [0.22, h, 0.14]));
    if (inner) L.push(P(cone(4), inner, [sx * x * 0.98, y - 0.02, 0.05], [0, Math.PI / 4, -sx * tilt], [0.12, h * 0.7, 0.06]));
  }
}
function earsRound(L, c, inner, { x = 0.3, y = 0.85, s = 0.22 } = {}) {
  for (const sx of [-1, 1]) {
    L.push(P(sphere(10), c, [sx * x, y, -0.02], [0, 0, 0], [s, s, s * 0.6]));
    if (inner) L.push(P(sphere(8), inner, [sx * x, y, 0.04], [0, 0, 0], [s * 0.55, s * 0.55, s * 0.3]));
  }
}
function earsLong(L, c, inner) {
  for (const sx of [-1, 1]) {
    L.push(P(sphere(10), c, [sx * 0.16, 1.18, -0.05], [0.12, 0, -sx * 0.2], [0.2, 0.8, 0.13]));
    L.push(P(sphere(8), inner, [sx * 0.16, 1.17, 0.01], [0.12, 0, -sx * 0.2], [0.1, 0.6, 0.05]));
  }
}
const snout = (L, c, nose, y = 0.45) => {
  L.push(P(sphere(12), c, [0, y, 0.44], [0, 0, 0], [0.26, 0.18, 0.16]));
  L.push(P(sphere(8), nose, [0, y + 0.03, 0.52], [0, 0, 0], [0.1, 0.06, 0.05]));
};
const nose = (L, c = DARK, y = 0.5, z = 0.47) => L.push(P(sphere(8), c, [0, y, z], [0, 0, 0], [0.08, 0.055, 0.05]));
const fluffTail = (L, c, tip, y = 0.35, z = -0.5) => {
  L.push(P(sphere(10), c, [0, y + 0.05, z], [-0.7, 0, 0], [0.3, 0.55, 0.3]));
  if (tip) L.push(P(sphere(8), tip, [0, y + 0.3, z - 0.18], [-0.7, 0, 0], [0.18, 0.2, 0.18]));
};
const tuft = (L, c, y = 0.98) => { for (let i = -1; i <= 1; i++) L.push(P(sphere(6), c, [i * 0.06, y + (i === 0 ? 0.06 : 0), 0.02], [0, 0, i * 0.5], [0.06, 0.2, 0.06])); };
const crown = (L, c, y = 1.0) => {
  L.push(P(cyl(0.2, 0.17, 10), c, [0, y, 0], [0, 0, 0], [1, 0.1, 1]));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; L.push(P(cone(4), c, [Math.sin(a) * 0.17, y + 0.1, Math.cos(a) * 0.17], [0, 0, 0], [0.07, 0.15, 0.07])); }
};

// feet / wings / flippers are separate meshes so they can animate
function feetGeo(c, { x = 0.2, s = [0.2, 0.12, 0.26], z = 0.06 } = {}) {
  return [-1, 1].map((sx) => P(sphere(10), c, [0, 0, z], [0, 0, 0], s)).map((g, i) => ({ g, x: (i ? 1 : -1) * x }));
}
function wingGeo(c, { s = [0.12, 0.38, 0.3] } = {}) {
  return [-1, 1].map((sx) => ({ g: P(sphere(10), c, [sx * 0.04, -0.15, 0], [0, 0, 0], s), x: sx * 0.46, y: 0.6 }));
}

const SPECS = {
  chick(L) { blob(L, '#ffe066', '#ffc93d'); belly(L, '#fff2a8'); eyes(L); cheeks(L); beak(L, '#ff9a2e'); tuft(L, '#ffd23d');
    return { feet: feetGeo('#ff9a2e', { s: [0.18, 0.08, 0.26] }), wings: wingGeo('#ffd23d', { s: [0.14, 0.5, 0.38] }).map((w) => ({ ...w, x: w.x * 1.1 })), size: 0.82, hop: 0.32 }; },
  bunny(L) { blob(L, '#ffffff', '#e9e3f0', 0.88, 1.05, 0.9, 0.54); belly(L, '#fff7f2'); eyes(L, { y: 0.6 }); cheeks(L); nose(L, '#ff8fa8', 0.5);
    earsLong(L, '#ffffff', '#ffb3c6'); L.push(P(sphere(8), '#ffffff', [0, 0.3, -0.5], [0, 0, 0], 0.22));
    return { feet: feetGeo('#f2eef7'), size: 0.9, hop: 0.45 }; },
  piglet(L) { blob(L, '#ffb3c1', '#f593a8'); eyes(L, { y: 0.64 }); cheeks(L, 0.46, 0.32); snout(L, '#ff9fb2', '#d9667f', 0.46);
    earsTri(L, '#f593a8', null, { tilt: 0.6, h: 0.26, y: 0.88 });
    L.push(P(new THREE.TorusGeometry(0.08, 0.03, 6, 10, Math.PI * 1.6), '#f593a8', [0, 0.45, -0.5], [0, 0, 0], 1));
    return { feet: feetGeo('#e57f95', { s: [0.16, 0.14, 0.18] }), size: 0.92, hop: 0.28 }; },
  lamb(L) { // fluffy wool puffs + cream face
    const wool = '#fffaf0';
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, b = (i % 3) * 0.6 - 0.2; L.push(P(sphere(8), wool, [Math.cos(a) * 0.38, 0.52 + Math.sin(b) * 0.3, Math.sin(a) * 0.35], [0, 0, 0], 0.36)); }
    L.push(P(sphere(10), wool, [0, 0.95, 0], [0, 0, 0], 0.42));
    L.push(P(sphere(14), '#ffe6c7', [0, 0.6, 0.3], [0, 0, 0], [0.5, 0.48, 0.32]));
    eyes(L, { y: 0.64, z: 0.45, x: 0.13, s: 0.11 }); cheeks(L, 0.52, 0.2, 0.43); nose(L, '#c98a7a', 0.53, 0.47);
    for (const sx of [-1, 1]) L.push(P(sphere(8), '#ffd9b0', [sx * 0.34, 0.72, 0.15], [0, 0, sx * 1.1], [0.1, 0.24, 0.08]));
    crown(L, '#ffc93d', 1.1);
    return { feet: feetGeo('#6b5148', { s: [0.15, 0.16, 0.16] }), size: 1.0, hop: 0.3, aura: '#ffd86b' }; },

  hedgehog(L) { blob(L, '#8a6448', '#6e4c35', 1, 0.85, 1);
    { const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let row = 0; row < 4; row++) for (let k = 0; k < 9; k++) {
        const az = Math.PI * (0.42 + (k + (row % 2) * 0.5) / 9 * 1.16), el = -0.15 + row * 0.42;
        const n = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
        q.setFromUnitVectors(up, n); e.setFromQuaternion(q);
        L.push(P(cone(5), row % 2 ? '#4a3020' : '#5f4029', [n.x * 0.44, 0.45 + n.y * 0.4, n.z * 0.46], [e.x, e.y, e.z], [0.15, 0.42, 0.15]));
      } }
    L.push(P(sphere(14), '#f2d6b0', [0, 0.45, 0.25], [0, 0, 0], [0.6, 0.55, 0.45])); eyes(L, { y: 0.55, z: 0.45, s: 0.11 }); cheeks(L, 0.44, 0.24, 0.44); nose(L, DARK, 0.46, 0.53);
    return { feet: feetGeo('#5a3d2a', { s: [0.14, 0.1, 0.18] }), size: 0.85, hop: 0.2 }; },
  owlet(L) { blob(L, '#a8835c', '#8a6646'); belly(L, '#f0dcb8', 0.4, [0.6, 0.55, 0.32]);
    eyes(L, { y: 0.62, x: 0.18, s: 0.13, ring: '#fff4dc' }); beak(L, '#ffb02e', 0.52, 0.14);
    earsTri(L, '#8a6646', null, { x: 0.28, y: 0.98, h: 0.38, tilt: 0.45 });
    return { feet: feetGeo('#ffb02e', { s: [0.14, 0.07, 0.2] }), wings: wingGeo('#8a6646', { s: [0.12, 0.42, 0.34] }), size: 0.88, hop: 0.26 }; },
  fox(L) { blob(L, '#ff8a3d', '#e86f2a', 0.95, 0.88, 0.95, 0.47); belly(L, '#fff4e6', 0.38);
    for (const sx of [-1, 1]) L.push(P(sphere(10), '#fff4e6', [sx * 0.2, 0.47, 0.36], [0, 0, 0], [0.26, 0.18, 0.18]));
    eyes(L, { y: 0.63 }); nose(L, DARK, 0.5, 0.48); earsTri(L, '#ff8a3d', '#3a2a22', { h: 0.52, tilt: 0.3, y: 0.95 }); L.push(P(sphere(10), '#ff8a3d', [0, 0.45, -0.62], [-0.9, 0, 0], [0.4, 0.75, 0.4])); L.push(P(sphere(8), '#fff4e6', [0, 0.78, -0.86], [-0.9, 0, 0], [0.26, 0.28, 0.26]));
    return { feet: feetGeo('#3a2a22', { s: [0.15, 0.12, 0.2] }), size: 0.92, hop: 0.34 }; },
  mossbear(L) { blob(L, '#7a6a4a', '#5f513a', 1.05, 0.95, 1); belly(L, '#a7c46a', 0.42); earsRound(L, '#5f513a', '#a7c46a');
    eyes(L, { y: 0.63 }); snout(L, '#c9b48a', DARK, 0.48); cheeks(L, 0.5, 0.3, 0.38);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; L.push(P(sphere(6), i % 2 ? '#6fbf4a' : '#9ad65a', [Math.sin(a) * 0.2, 1.0, Math.cos(a) * 0.18], [0.5 * Math.cos(a), 0, -0.5 * Math.sin(a)], [0.12, 0.05, 0.22])); }
    L.push(P(sphere(6), '#ff7a8a', [0.12, 1.03, 0.12], [0, 0, 0], 0.1));
    return { feet: feetGeo('#4a3f2c', { s: [0.18, 0.14, 0.22] }), size: 1.05, hop: 0.22, aura: '#b8f07a' }; },

  penguin(L) { blob(L, '#2f3a52', '#232c40', 0.85, 1.12, 0.85, 0.56); L.push(P(sphere(14), '#ffffff', [0, 0.45, 0.2], [0, 0, 0], [0.7, 0.75, 0.6]));
    eyes(L, { y: 0.66, z: 0.42 }); cheeks(L, 0.54); beak(L, '#ffa62e', 0.55, 0.14);
    return { feet: feetGeo('#ffa62e', { s: [0.18, 0.06, 0.24] }), wings: wingGeo('#232c40', { s: [0.1, 0.42, 0.24] }), size: 0.88, hop: 0.15 }; },
  seal(L) { blob(L, '#dfe6ef', '#b9c4d2', 0.95, 0.85, 1.2, 0.42); belly(L, '#ffffff', 0.36, [0.6, 0.5, 0.4], 0.25);
    eyes(L, { y: 0.55, z: 0.5, s: 0.15 }); nose(L, '#3a3a48', 0.47, 0.6);
    for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) L.push(P(cyl(0.01, 0.01, 4), '#8a94a6', [sx * 0.2, 0.44 + k * 0.04, 0.55], [0, 0, Math.PI / 2 + sx * (k - 0.5) * 0.3], [1, 0.22, 1]));
    L.push(P(sphere(8), '#b9c4d2', [0, 0.18, -0.62], [0, 0, 0], [0.4, 0.08, 0.2]));
    return { wings: wingGeo('#b9c4d2', { s: [0.08, 0.3, 0.2] }).map((w) => ({ ...w, y: 0.3 })), size: 0.95, hop: 0.12, slide: true }; },
  polarbear(L) { blob(L, '#ffffff', '#e6eef5', 1.05, 0.95, 1); earsRound(L, '#eef4f8', '#c9d6e2'); eyes(L, { y: 0.64 });
    snout(L, '#f4f8fb', DARK, 0.48); cheeks(L, 0.5, 0.3, 0.38);
    L.push(P(sphere(8), '#7fb8e8', [0, 0.36, 0.42], [0, 0, 0], [0.5, 0.12, 0.22]));
    return { feet: feetGeo('#dfe8f0', { s: [0.18, 0.14, 0.22] }), size: 1.0, hop: 0.2 }; },
  frostfox(L) { blob(L, '#e8f6ff', '#bfe3ff'); belly(L, '#ffffff', 0.38); eyes(L, { y: 0.63 }); nose(L, '#4a7ab0', 0.5, 0.48);
    earsTri(L, '#d6efff', '#7fc4f5', { h: 0.42, tilt: 0.28 }); fluffTail(L, '#d6efff', '#8fd0ff');
    for (let i = 0; i < 3; i++) L.push(P(cone(4), '#9fe0ff', [(i - 1) * 0.12, 1.02 + (i === 1 ? 0.06 : 0), 0.05], [0, 0, (1 - i) * 0.3], [0.08, 0.22, 0.08]));
    return { feet: feetGeo('#9fc9e8', { s: [0.15, 0.12, 0.2] }), size: 0.98, hop: 0.36, aura: '#9fe8ff' }; },

  crab(L) { L.push(P(sphere(16), '#ff5a4a', [0, 0.38, 0], [0, 0, 0], [1.1, 0.6, 0.85], '#e2402f'));
    for (const sx of [-1, 1]) {
      L.push(P(cyl(0.04, 0.04, 6), '#e2402f', [sx * 0.15, 0.72, 0.18], [0.2, 0, 0], [1, 0.25, 1]));
      L.push(P(sphere(10), WHITE, [sx * 0.15, 0.86, 0.2], [0, 0, 0], 0.17)); L.push(P(sphere(8), DARK, [sx * 0.15, 0.87, 0.28], [0, 0, 0], 0.09));
      L.push(P(sphere(10), '#ff5a4a', [sx * 0.6, 0.5, 0.25], [0, 0, sx * 0.4], [0.26, 0.32, 0.2]));
      L.push(P(cone(4), '#ff7a6a', [sx * 0.66, 0.68, 0.3], [0, 0, -sx * 0.3], [0.1, 0.2, 0.08]));
    }
    L.push(P(sphere(8), CHEEK, [-0.28, 0.42, 0.38], [0, 0, 0], [0.1, 0.06, 0.04])); L.push(P(sphere(8), CHEEK, [0.28, 0.42, 0.38], [0, 0, 0], [0.1, 0.06, 0.04]));
    L.push(P(new THREE.TorusGeometry(0.07, 0.02, 5, 10, Math.PI), DARK, [0, 0.4, 0.44], [0, 0, Math.PI], 1));
    return { feet: feetGeo('#e2402f', { s: [0.36, 0.1, 0.12], x: 0.3 }), size: 0.8, hop: 0.1, side: true }; },
  turtle(L) { L.push(P(sphere(14), '#9fdc7a', [0, 0.52, 0.42], [0, 0, 0], [0.5, 0.48, 0.48])); eyes(L, { y: 0.62, z: 0.62, x: 0.13, s: 0.1 }); cheeks(L, 0.52, 0.2, 0.6);
    L.push(P(sphere(16), '#4f9a5a', [0, 0.42, -0.08], [0, 0, 0], [1.0, 0.68, 0.95], '#3a7a46'));
    L.push(P(cyl(0.5, 0.52, 16), '#e6d39a', [0, 0.2, -0.08], [0, 0, 0], [1.0, 0.12, 0.95]));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; L.push(P(cyl(0.12, 0.14, 6), '#6fb86a', [Math.sin(a) * 0.24, 0.66, Math.cos(a) * 0.22 - 0.08], [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5], [1, 0.05, 1])); }
    L.push(P(cyl(0.14, 0.16, 6), '#6fb86a', [0, 0.77, -0.08], [0, 0, 0], [1, 0.05, 1]));
    return { feet: feetGeo('#8fd06a', { s: [0.18, 0.14, 0.2], x: 0.34 }), size: 0.9, hop: 0.08 }; },
  parrot(L) { blob(L, '#ff4a4a', '#e33a3a'); belly(L, '#ffd84a', 0.38, [0.5, 0.45, 0.3]);
    for (const sx of [-1, 1]) L.push(P(sphere(10), WHITE, [sx * 0.18, 0.62, 0.36], [0, 0, 0], [0.2, 0.2, 0.12]));
    eyes(L, { y: 0.63, z: 0.42, s: 0.1 }); L.push(P(sphere(10), '#ffe06a', [0, 0.47, 0.45], [0.4, 0, 0], [0.2, 0.26, 0.2]));
    L.push(P(sphere(8), '#3a2a22', [0, 0.38, 0.5], [0, 0, 0], [0.1, 0.1, 0.08])); tuft(L, '#ff4a4a', 1.0);
    L.push(P(sphere(8), '#3a8ae8', [0, 0.25, -0.52], [-1.0, 0, 0], [0.16, 0.5, 0.08]));
    return { feet: feetGeo('#8a8a8a', { s: [0.14, 0.07, 0.18] }), wings: wingGeo('#3a8ae8', { s: [0.12, 0.42, 0.32] }), size: 0.9, hop: 0.3 }; },
  otter(L) { blob(L, '#a8744a', '#8a5a36', 0.95, 1, 0.95); belly(L, '#f4dcb8', 0.42, [0.62, 0.6, 0.34]);
    earsRound(L, '#8a5a36', null, { x: 0.32, y: 0.82, s: 0.14 }); eyes(L, { y: 0.64 }); snout(L, '#f4dcb8', DARK, 0.5);
    L.push(P(sphere(12), '#fffdf4', [0, 0.32, 0.5], [0, 0, 0], 0.2)); // pearl
    L.push(P(sphere(6), '#ffffff', [0.04, 0.37, 0.58], [0, 0, 0], 0.06));
    L.push(P(cone(8), '#8a5a36', [0, 0.18, -0.58], [-1.3, 0, 0], [0.24, 0.6, 0.14]));
    crown(L, '#ffd04a', 0.98);
    return { feet: feetGeo('#6e4628', { s: [0.17, 0.1, 0.22] }), size: 0.98, hop: 0.24, aura: '#ffe9a0' }; },

  lizard(L) { blob(L, '#ff7a3a', '#e35a2a', 1, 0.82, 1.1, 0.45); belly(L, '#ffd27a', 0.38, [0.55, 0.45, 0.35], 0.3);
    eyes(L, { y: 0.6, z: 0.46, s: 0.14 }); cheeks(L, 0.45);
    for (let i = 0; i < 4; i++) L.push(P(cone(4), '#ffcf3a', [0, 0.92 - i * 0.05, -0.05 - i * 0.18], [-0.4 - i * 0.2, 0, 0], [0.1, 0.18, 0.1]));
    L.push(P(cone(8), '#e35a2a', [0, 0.25, -0.72], [-1.45, 0, 0], [0.22, 0.65, 0.2]));
    return { feet: feetGeo('#c94a22', { s: [0.15, 0.1, 0.2], x: 0.26 }), size: 0.85, hop: 0.16 }; },
  snail(L) { L.push(P(sphere(12), '#ffb07a', [0, 0.25, 0.1], [0, 0, 0], [0.55, 0.4, 1.1], '#f08a50'));
    L.push(P(sphere(12), '#ffb07a', [0, 0.52, 0.48], [0, 0, 0], [0.4, 0.48, 0.38]));
    eyes(L, { y: 0.6, z: 0.65, x: 0.11, s: 0.1 }); cheeks(L, 0.5, 0.17, 0.62);
    for (const sx of [-1, 1]) { L.push(P(cyl(0.025, 0.025, 5), '#f08a50', [sx * 0.1, 0.84, 0.5], [0, 0, -sx * 0.2], [1, 0.2, 1])); L.push(P(sphere(6), '#ffd04a', [sx * 0.12, 0.94, 0.5], [0, 0, 0], 0.08)); }
    L.push(P(new THREE.TorusGeometry(0.28, 0.2, 10, 18), '#5a2b4a', [0, 0.62, -0.18], [0, Math.PI / 2, 0], 1, '#3a1a30'));
    L.push(P(sphere(10), '#ff7a2a', [0.02, 0.62, -0.18], [0, 0, 0], [0.18, 0.3, 0.3]));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; L.push(P(ico(0), '#ffcf3a', [0.2, 0.62 + Math.sin(a) * 0.3, -0.18 + Math.cos(a) * 0.3], [a, 0, 0], 0.08)); }
    return { size: 0.95, hop: 0.0, slide: true }; },
  dragon(L) { blob(L, '#8a5ae8', '#6a3ad0', 1.12, 0.9, 0.95); belly(L, '#ffd9a0', 0.4); eyes(L, { y: 0.64, s: 0.14 }); cheeks(L); nose(L, '#4a2a8a', 0.5, 0.48);
    for (const sx of [-1, 1]) L.push(P(cone(6), '#ffe0a0', [sx * 0.2, 1.0, -0.05], [-0.3, 0, -sx * 0.35], [0.1, 0.3, 0.1]));
    for (let i = 0; i < 3; i++) L.push(P(cone(4), '#ff7ad0', [0, 0.85 - i * 0.18, -0.4 - i * 0.08], [-0.9 - i * 0.2, 0, 0], [0.1, 0.18, 0.1]));
    L.push(P(cone(8), '#6a3ad0', [0, 0.25, -0.62], [-1.4, 0, 0], [0.22, 0.55, 0.2]));
    const w = [-1, 1].map((sx) => ({ g: merge([P(cone(3), '#ff7ad0', [sx * 0.22, 0.05, -0.05], [0, 0, sx * -1.2], [0.5, 0.5, 0.06]), P(cone(3), '#6a3ad0', [sx * 0.12, 0.12, -0.05], [0, 0, sx * -1.0], [0.4, 0.4, 0.08])]), x: sx * 0.32, y: 0.75 }));
    return { feet: feetGeo('#5a2ab0', { s: [0.16, 0.12, 0.2] }), wings: w, size: 1.0, hop: 0.34, wingFlap: true }; },
  phoenix(L) { blob(L, '#ff7a2a', '#ff4a2a'); belly(L, '#ffe06a', 0.4); eyes(L, { y: 0.63 }); cheeks(L); beak(L, '#ffd04a', 0.52, 0.16);
    for (let i = 0; i < 5; i++) L.push(P(sphere(6), i % 2 ? '#ffd04a' : '#ff9a2a', [(i - 2) * 0.07, 1.0 + (2 - Math.abs(i - 2)) * 0.05, -0.05], [-0.3, 0, (i - 2) * 0.3], [0.07, 0.3, 0.07]));
    for (let i = 0; i < 3; i++) L.push(P(sphere(8), i === 1 ? '#ffd04a' : '#ff5a2a', [(i - 1) * 0.14, 0.4, -0.6], [-0.9, 0, (i - 1) * 0.5], [0.12, 0.5, 0.08]));
    return { feet: feetGeo('#ffb02a', { s: [0.14, 0.07, 0.2] }), wings: wingGeo('#ff9a2a', { s: [0.12, 0.46, 0.34] }), size: 1.0, hop: 0.4, aura: '#ffb070' }; },
};
function ico(d) { return new THREE.IcosahedronGeometry(0.5, d); }

// build a 3D animal; returns { root, body, feet[], wings[], spec }
export function buildAnimal(id) {
  const L = [];
  const spec = SPECS[id](L);
  const root = new THREE.Group();
  const pivot = new THREE.Group(); root.add(pivot);          // squash/stretch + bob live here
  const geo = merge(L);
  const body = mesh(geo); pivot.add(body);
  // ink outline on the main blob only (back faces of a slightly bigger copy)
  const ol = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), outlineMat);
  const bb = new THREE.Box3().setFromBufferAttribute(geo.attributes.position);
  const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
  ol.position.set(0, 0.5 * (spec.slide ? 0.85 : 1), c.z * 0.3); ol.scale.set(1.06 * Math.min(sz.x, 1.1), 0.98 * 0.95, 1.04 * Math.min(sz.z, 1.15));
  if (!['lamb', 'hedgehog', 'crab', 'turtle', 'snail', 'seal'].includes(id)) pivot.add(ol);
  const feet = (spec.feet || []).map(({ g, x }) => { const m = mesh(g); m.position.set(x, 0.06, 0.02); pivot.add(m); return m; });
  const wings = (spec.wings || []).map(({ g, x, y }) => { const m = mesh(g); m.position.set(x, y, 0); pivot.add(m); return m; });
  root.scale.setScalar(spec.size || 1);
  return { root, pivot, body, feet, wings, spec };
}
