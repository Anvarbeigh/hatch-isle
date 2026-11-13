// Hatch Isle — tap the egg, hatch pets, pets drop coins, buy better eggs and upgrades.
import * as THREE from './vendor/three.module.js';
import { platform } from './platform.js';
import { audio } from './audio.js';
import { t, setLang } from './i18n.js';
import { ANIMALS, EGGS, RARITY, buildAnimal } from './animals.js';
import { buildWorld, NEST, islandRadius } from './world.js';
import { toonMat, gradientMap } from './geo.js';

const Q = new URLSearchParams(location.search);
const DEBUG = Q.has('debug');
const $ = (id) => document.getElementById(id);
const fmt = (n) => { n = Math.floor(n); if (n < 10000) return String(n); const u = ['K', 'M', 'B', 'T']; let i = -1; let v = n; while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; } return (v < 100 ? v.toFixed(1).replace(/\.0$/, '') : Math.floor(v)) + u[i]; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// phones/tablets get the lighter quality tier (device class from the UA; CrazyGames' systemInfo.device needs the SDK, which inits later)
const LOW = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent) || navigator.userAgentData?.mobile || Q.get('q') === 'low';

// ---------------- economy ----------------
const tapPower = (l) => Math.max(1, Math.round(Math.pow(l, 1.5)));
const COST = {
  tap: (l) => Math.round(15 * Math.pow(2.05, l - 1)),
  lamp: (l) => Math.round(60 * Math.pow(2.1, l)),
  treats: (l) => Math.round(120 * Math.pow(2.1, l)),
};
const MAXLV = { tap: 40, lamp: 30, treats: 30 };
const autoRate = (l) => (l <= 0 ? 0 : 0.6 + 0.4 * (l - 1));       // automatic taps per second
const treatsMult = (l) => 1 + 0.3 * l;
const DROP_EVERY = 3.5;
const HEAT_GROW = 1.3, HEAT_CAP = 8, COST_GROW = 1.3;
const tapCoins = () => tapPower(S.tap) * (1 + S.egg.type);       // coins per tap: grows a little with the egg tier   // each egg type gets warmer-to-hatch and pricier the more you hatch it
// egg price grows with each NEW species found in that egg (max ×5), never per hatch, so the last pets stay reachable
const eggCost = (i) => (EGGS[i].cost ? Math.round(EGGS[i].cost * Math.pow(COST_GROW, speciesFound(i)) / 10) * 10 : 0);
const PITY = 3;                 // a new pet at least every 3rd hatch of an egg (and on each of the first 3 hatches)
const SET_BONUS = [150, 1200, 12000, 120000, 1000000];
const newIn = (egg) => (ANIMALS.some((a) => a.egg === egg && !S.pets[a.id]) ? PITY - (S.miss[egg] || 0) : 0);
const BOOST_MS = 180000;
const OFFLINE_MAX = 2 * 3600;

const fresh = () => ({ v: 1, coins: 0, total: 0, tap: 1, lamp: 0, treats: 0, sel: 0, egg: { type: 0, heat: 0, seed: 1 }, pets: {}, hatched: 0,
  boostUntil: 0, lastSeen: Date.now(), sound: true, music: true, miss: [0, 0, 0, 0, 0], eh: [0, 0, 0, 0, 0], setDone: [0, 0, 0, 0, 0] });
let S = fresh();

const petIncome = (id, stars) => { const a = ANIMALS.find((x) => x.id === id); return EGGS[a.egg].coin * RARITY[a.r].mult * (1 + 0.5 * (stars - 1)); };
const boostMult = () => (Date.now() < S.boostUntil ? 2 : 1);
function ratePerSec(withBoost = true) {
  let r = 0;
  for (const [id, st] of Object.entries(S.pets)) r += petIncome(id, st) / DROP_EVERY;
  r *= treatsMult(S.treats);
  r += autoRate(S.lamp) * tapCoins();
  return r * (withBoost ? boostMult() : 1);
}
const speciesFound = (egg) => ANIMALS.filter((a) => a.egg === egg && S.pets[a.id]).length;
const eggUnlocked = (i) => i === 0 || speciesFound(i - 1) >= 2;

// ---------------- renderer / scene ----------------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW || devicePixelRatio < 2, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG });
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
{ // sky gradient
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#5fb6f0'); g.addColorStop(0.55, '#a8dcff'); g.addColorStop(0.8, '#e6f6ff'); g.addColorStop(1, '#e6f6ff');
  x.fillStyle = g; x.fillRect(0, 0, 4, 256); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; scene.background = tex;
}
scene.fog = new THREE.Fog(0xcdeeff, 40, 95);
const hemi = new THREE.HemisphereLight(0xd8f0ff, 0x7a9a50, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d6, 2.6);
sun.position.set(7, 14, 8); sun.castShadow = true;
sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 40 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
scene.add(sun);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 150);
const world = buildWorld(scene);
const camLook = new THREE.Vector3(0, 0.5, 1.9);
let camZoom = 0;   // 0..1 dolly toward the nest during a hatch
function placeCamera(time = 0) {
  const asp = innerWidth / innerHeight;
  camera.aspect = asp;
  const vf = THREE.MathUtils.degToRad(camera.fov);
  const hf = 2 * Math.atan(Math.tan(vf / 2) * asp);
  const halfW = asp < 1 ? 4.0 : 6.6;
  let dist = Math.max(10.5, halfW / Math.tan(hf / 2));
  if (asp < 1) dist = Math.min(dist, 24);
  const dir = new THREE.Vector3(0, asp < 1 ? 0.95 : 0.5, 1).normalize();   // portrait: look down more so the island fills the tall screen
  const look = camLook.clone();
  if (asp < 1) look.z += 0.5;
  const tgt = look.clone().lerp(new THREE.Vector3(NEST.x, 0.9, NEST.z), camZoom * 0.6);
  const d = dist * (1 - camZoom * 0.3);
  camera.position.copy(tgt).addScaledVector(dir, d);
  camera.lookAt(tgt);
  camera.updateProjectionMatrix();
}
function resize() { renderer.setSize(innerWidth, innerHeight); placeCamera(clock.elapsedTime); }
addEventListener('resize', resize);
const clock = new THREE.Clock(false);

// ---------------- pets on the island ----------------
const pets = [];        // live 3D pets (one per species owned)
const tmpV = new THREE.Vector3();
function freeSpot() {
  for (let k = 0; k < 40; k++) {
    const a = Math.random() * Math.PI * 2, d = 1.5 + Math.random() * (islandRadius(a) - 2.3);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (z > NEST.z - 1.6 && Math.abs(x) < 3.2) continue;            // keep the egg and the strip in front of it clear
    if (z > 5.2) continue;                                            // not right under the camera
    if (world.obstacles.every((o) => Math.hypot(x - o.x, z - o.z) > o.r + 0.4)) return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(2, 0, 0);
}
function spawnPet(def, from = null) {
  const m = buildAnimal(def.id);
  const p = { def, m, pos: from ? from.clone() : freeSpot(), target: null, state: 'idle', t: Math.random() * 2, phase: 0, heading: Math.random() * 6, drop: Math.random() * DROP_EVERY, jump: null, aura: null };
  m.root.position.copy(p.pos); m.root.rotation.y = p.heading;
  scene.add(m.root);
  p.shadow = new THREE.Mesh(blobGeo, blobMat); p.shadow.rotation.x = -Math.PI / 2; p.shadow.scale.setScalar(m.spec.size || 1); scene.add(p.shadow);
  if (m.spec.aura) p.aura = addAura(m.root, m.spec.aura);
  pets.push(p);
  return p;
}
function addAura(root, color) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
  s.scale.setScalar(2.2); s.position.y = 0.6; root.add(s); return s;
}
function jumpTo(p, to, dur = 0.8, height = 2) { p.jump = { from: p.pos.clone(), to: to.clone(), t: 0, dur, h: height }; p.state = 'jump'; }
function updatePet(p, dt, time) {
  const { m } = p, sp = m.spec;
  p.t += dt;
  let moving = false;
  if (p.state === 'jump') {
    const j = p.jump; j.t += dt; const k = clamp(j.t / j.dur, 0, 1);
    p.pos.lerpVectors(j.from, j.to, k); p.pos.y = Math.sin(Math.PI * k) * j.h + j.from.y * (1 - k);
    const dx = j.to.x - j.from.x, dz = j.to.z - j.from.z; if (Math.hypot(dx, dz) > 0.1) p.heading = lerpAngle(p.heading, Math.atan2(dx, dz), dt * 8);
    m.pivot.scale.set(1 - 0.12 * Math.sin(Math.PI * k), 1 + 0.2 * Math.sin(Math.PI * k), 1);
    m.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.4 + Math.sin(time * 30) * 0.6); });
    if (k >= 1) { p.pos.y = 0; p.state = 'land'; p.t = 0; fx.puff(p.pos, 6); audio.play('land', { vol: 0.5, rate: 1.2 }); }
  } else if (p.state === 'land') {
    const k = clamp(p.t / 0.25, 0, 1); const sq = Math.sin(Math.PI * k) * 0.25;
    m.pivot.scale.set(1 + sq, 1 - sq, 1 + sq);
    if (k >= 1) { p.state = 'idle'; p.t = 0; m.pivot.scale.set(1, 1, 1); }
  } else if (p.state === 'reveal') {
    p.heading = lerpAngle(p.heading, Math.atan2(camera.position.x - p.pos.x, camera.position.z - p.pos.z), dt * 6);
    const b = Math.abs(Math.sin(time * 5)) * 0.25; p.pos.y = NEST.y + 0.45 + b;
    m.pivot.scale.set(1 + 0.05 * Math.sin(time * 10), 1 - 0.05 * Math.sin(time * 10), 1);
    m.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.3 + Math.sin(time * 20) * 0.5); });
  } else if (p.state === 'idle') {
    // breathe, look around, then pick a new spot
    const br = Math.sin(p.t * 3) * 0.03; m.pivot.scale.set(1 - br, 1 + br, 1 - br);
    // idle pets turn to look at the player
    p.heading = lerpAngle(p.heading, Math.atan2(camera.position.x - p.pos.x, camera.position.z - p.pos.z) + Math.sin(p.t * 0.7 + p.def.i) * 0.5, dt * 2.5);
    if (p.t > 2.5 + Math.random() * 4) { p.target = freeSpot(); p.state = 'walk'; p.t = 0; }
  } else if (p.state === 'walk') {
    tmpV.subVectors(p.target, p.pos); tmpV.y = 0;
    const d = tmpV.length();
    // gentle push away from rocks, trees and other pets
    for (const o of world.obstacles) { const ox = p.pos.x - o.x, oz = p.pos.z - o.z, od = Math.hypot(ox, oz); if (od < o.r + 0.5 && od > 0.01) { tmpV.x += ox / od * 3; tmpV.z += oz / od * 3; } }
    for (const q of pets) if (q !== p && q.state === 'walk') { const ox = p.pos.x - q.pos.x, oz = p.pos.z - q.pos.z, od = Math.hypot(ox, oz); if (od < 1.3 && od > 0.01) { tmpV.x += ox / od * 1.5; tmpV.z += oz / od * 1.5; } }
    const want = Math.atan2(tmpV.x, tmpV.z);
    p.heading = lerpAngle(p.heading, want, dt * 5);
    const speed = (sp.slide ? 0.7 : 1.15) * (0.8 + sp.size * 0.3);
    p.pos.x += Math.sin(p.heading) * speed * dt; p.pos.z += Math.cos(p.heading) * speed * dt;
    // keep on the island
    const a = Math.atan2(p.pos.z, p.pos.x), r = Math.hypot(p.pos.x, p.pos.z), maxR = islandRadius(a) - 0.8;
    if (r > maxR) { p.pos.x *= maxR / r; p.pos.z *= maxR / r; }
    moving = true;
    if (d < 0.3 || p.t > 9) { p.state = 'idle'; p.t = 0; p.pos.y = 0; }
  }
  if (moving) {
    const hopRate = sp.slide ? 3 : 7;
    p.phase += dt * hopRate;
    const s = Math.abs(Math.sin(p.phase));
    if (sp.hop > 0.05) {
      p.pos.y = s * sp.hop * 0.6;
      const land = 1 - s;  // squash near the ground, stretch in the air
      m.pivot.scale.set(1 + land * 0.12 - s * 0.05, 1 - land * 0.14 + s * 0.08, 1 + land * 0.1);
    } else {
      m.pivot.scale.set(1 + s * 0.08, 1 - s * 0.06, 1 - s * 0.05); p.pos.y = 0;
    }
    m.feet.forEach((f, i) => { f.rotation.x = Math.sin(p.phase * 2 + i * Math.PI) * 0.7; f.position.y = 0.06 + Math.max(0, Math.sin(p.phase * 2 + i * Math.PI)) * 0.08; });
    m.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.15 + s * (sp.wingFlap ? 0.9 : 0.5)); });
    m.pivot.rotation.z = Math.sin(p.phase) * 0.08;
    if (sp.side) m.pivot.rotation.y = Math.PI / 2 * Math.sign(Math.sin(p.t * 0.5)) * 0;
  } else if (p.state === 'idle') {
    m.feet.forEach((f) => { f.rotation.x *= 0.8; f.position.y = 0.06; });
    m.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.1 + Math.sin(p.t * 2) * 0.05); });
    m.pivot.rotation.z *= 0.85; p.pos.y *= 0.8;
  }
  m.root.position.copy(p.pos); m.root.rotation.y = p.heading;
  if (p.shadow) { p.shadow.position.set(p.pos.x, p.state === 'reveal' ? 0.5 : 0.03, p.pos.z); const k = 1 / (1 + Math.max(0, p.pos.y - (p.state === 'reveal' ? 0.45 : 0)) * 0.6); p.shadow.scale.setScalar((m.spec.size || 1) * k * m.root.scale.x / (m.spec.size || 1)); p.shadow.material.opacity = 0.35; }
  if (p.aura) p.aura.material.opacity = 0.4 + Math.sin(time * 3) * 0.15;
  // coin drops
  if (p.state === 'idle' || p.state === 'walk') {
    p.drop -= dt;
    if (p.drop <= 0) {
      p.drop += DROP_EVERY;
      const v = petIncome(p.def.id, S.pets[p.def.id] || 1) * treatsMult(S.treats) * boostMult();
      earn(v); fx.coin(p.pos, v);
      if (flying < 8 && !panelOpen && (pets.length <= 6 || Math.random() < 6 / pets.length)) { const s = toScreen(tmpV.copy(p.pos).setY(1.6)); if (!s.behind) floatText(s.x, s.y, '+' + fmt(v), null, 'small'); }
    }
  }
}
function lerpAngle(a, b, k) { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * clamp(k, 0, 1); }

// ---------------- effects ----------------
let blobTex;
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const blobGeo = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(40,30,20,.85)'); g.addColorStop(0.6, 'rgba(40,30,20,.5)'); g.addColorStop(1, 'rgba(40,30,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); blobTex = new THREE.CanvasTexture(c); return new THREE.PlaneGeometry(1.1, 1.1); })();
const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.35 });
const coinGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.07, 18); coinGeo.rotateX(Math.PI / 2);
const coinMat = [new THREE.MeshToonMaterial({ color: 0xc9861a, gradientMap }), new THREE.MeshToonMaterial({ color: 0xffd34a, gradientMap, emissive: 0x664400 }), new THREE.MeshToonMaterial({ color: 0xffd34a, gradientMap, emissive: 0x664400 })];
const shardGeo = new THREE.TetrahedronGeometry(0.16);
const tapRingGeo = new THREE.RingGeometry(1.0, 1.15, 40);
const puffGeo = new THREE.IcosahedronGeometry(0.18, 0);
const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
const parts = [];
const fx = {
  coin(pos, v) {
    const m = new THREE.Mesh(coinGeo, coinMat); m.position.copy(pos).setY(pos.y + 1.1); scene.add(m);
    parts.push({ m, t: 0, life: 0.55, vy: 2.6, spin: 12, onEnd: () => flyCoin(m.position, v) });
  },
  shards(pos, color) {
    const mat = new THREE.MeshToonMaterial({ color, gradientMap });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(shardGeo, mat); m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.6)); m.castShadow = true;
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3;
      scene.add(m); parts.push({ m, t: 0, life: 1.4, v: new THREE.Vector3(Math.cos(a) * sp, 3 + Math.random() * 4, Math.sin(a) * sp), g: 14, rot: new THREE.Vector3(Math.random() * 9, Math.random() * 9, 0), floor: 0.05 });
    }
  },
  puff(pos, n = 8, color = 0xffffff) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(puffGeo, color === 0xffffff ? puffMat : new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
      const a = (i / n) * Math.PI * 2; m.position.copy(pos).add(new THREE.Vector3(Math.cos(a) * 0.3, 0.12, Math.sin(a) * 0.3));
      scene.add(m); parts.push({ m, t: 0, life: 0.5, v: new THREE.Vector3(Math.cos(a) * 1.6, 0.6, Math.sin(a) * 1.6), grow: 2.2, fade: true });
    }
  },
  sparkle(pos, color, n = 14, spread = 1.2) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * spread, (Math.random() - 0.5) * spread)); s.scale.setScalar(0.35 + Math.random() * 0.3);
      scene.add(s); parts.push({ m: s, t: 0, life: 0.8 + Math.random() * 0.6, v: new THREE.Vector3(0, 1 + Math.random() * 1.5, 0), fade: true, twinkle: true });
    }
  },
  pillar(pos, color) {
    const g = new THREE.CylinderGeometry(0.9, 1.3, 14, 20, 1, true); g.translate(0, 7, 0);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide }));
    m.position.copy(pos); scene.add(m); parts.push({ m, t: 0, life: 1.8, pillar: true });
  },
  tapRing() {
    const m = new THREE.Mesh(tapRingGeo, new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(NEST.x, 0.55, NEST.z); scene.add(m); parts.push({ m, t: 0, life: 0.35, ring: true, ringK: 0.9 });
  },
  ring(pos, color = 0xfff3b0) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 32), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.copy(pos).setY(0.4); scene.add(m); parts.push({ m, t: 0, life: 0.6, ring: true });
  },
  update(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt; const k = p.t / p.life;
      if (p.vy !== undefined) { p.m.position.y += p.vy * dt; p.vy -= 6 * dt; p.m.rotation.y += p.spin * dt; }
      if (p.v) { p.m.position.addScaledVector(p.v, dt); if (p.g) p.v.y -= p.g * dt; if (p.floor !== undefined && p.m.position.y < p.floor) { p.m.position.y = p.floor; p.v.multiplyScalar(0.4); p.v.y = Math.abs(p.v.y) * 0.3; } if (!p.g) p.v.multiplyScalar(0.94); }
      if (p.rot) { p.m.rotation.x += p.rot.x * dt; p.m.rotation.y += p.rot.y * dt; }
      if (p.grow) p.m.scale.setScalar(1 + k * p.grow);
      if (p.fade) p.m.material.opacity = 0.85 * (1 - k);
      if (p.twinkle) p.m.material.rotation = p.t * 4;
      if (p.pillar) { p.m.material.opacity = 0.45 * Math.sin(Math.PI * Math.min(1, k * 1.3)) ; p.m.scale.set(1 - k * 0.5, 1, 1 - k * 0.5); p.m.rotation.y += dt; }
      if (p.ring) { p.m.scale.setScalar(1 + k * (p.ringK || 2.2)); p.m.material.opacity = 1 - k; }
      if (p.life - p.t < 0.3 && p.g) p.m.scale.setScalar(Math.max(0.01, (p.life - p.t) / 0.3));
      if (k >= 1) { scene.remove(p.m); p.onEnd?.(); parts.splice(i, 1); }
    }
  },
};

// DOM juice: coins flying to the counter, floating numbers, tap ripples
const coinsEl = $('coins');
let flying = 0;
function toScreen(v) { tmpV.copy(v).project(camera); return { x: (tmpV.x * 0.5 + 0.5) * innerWidth, y: (-tmpV.y * 0.5 + 0.5) * innerHeight, behind: tmpV.z > 1 }; }
function flyCoin(pos, v) {
  if (flying > 14) { bumpCoins(); return; }
  const s = toScreen(pos), r = coinsEl.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'fly'; el.innerHTML = '<svg class="i" style="width:100%;height:100%"><use href="#i-coin"/></svg>';
  document.body.appendChild(el); flying++;
  const tx = r.left + 26, ty = r.top + 24, mx = (s.x + tx) / 2 + (Math.random() - 0.5) * 120, my = Math.min(s.y, ty) - 60;
  const an = el.animate([
    { transform: `translate(${s.x - 13}px, ${s.y - 13}px) scale(.6)` },
    { transform: `translate(${mx - 13}px, ${my - 13}px) scale(1.15)`, offset: 0.45 },
    { transform: `translate(${tx - 13}px, ${ty - 13}px) scale(.8)` }], { duration: 650 + Math.random() * 150, easing: 'cubic-bezier(.5,0,.7,1)' });
  an.onfinish = () => { el.remove(); flying--; bumpCoins(); { const n = performance.now(); if (n - (flyCoin.s || 0) > 110) { flyCoin.s = n; audio.play('coin', { vol: 0.45, rate: [1, 1.122, 1.26][Math.floor(Math.random() * 3)] }); } } };
}
let bumpT = 0;
function bumpCoins() { const now = performance.now(); if (now - bumpT < 90) return; bumpT = now; coinsEl.classList.remove('bump'); void coinsEl.offsetWidth; coinsEl.classList.add('bump'); }
function floatText(x, y, html, color, cls = '') {
  const el = document.createElement('div'); el.className = 'float ot ' + cls; el.innerHTML = html; if (color) el.style.color = color;
  el.style.left = x + 'px'; el.style.top = y + 'px'; document.body.appendChild(el);
  const dx = (Math.random() - 0.5) * 50;
  el.animate([{ transform: 'translate(-50%,0) scale(.6)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px),-40px) scale(1.1)`, opacity: 1, offset: 0.3 }, { transform: `translate(calc(-50% + ${dx}px),-90px) scale(1)`, opacity: 0 }], { duration: 900, easing: 'ease-out' }).onfinish = () => el.remove();
}
function banner(title, sub, egg = null) {
  const el = $('banner');
  el.innerHTML = `<div class="bt ot">${title}</div><div class="bs wood"><span class="ot">${sub}</span></div>`;
  el.classList.remove('hidden', 'go'); void el.offsetWidth; el.classList.add('go');
  clearTimeout(banner.t); banner.t = setTimeout(() => el.classList.add('hidden'), 2600);
}
const CONF = ['#ffc93d', '#ff6a8a', '#6cc04a', '#4fa8e0', '#b06ee0', '#fff3d6'];
function confetti(n) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i'); el.className = 'conf'; el.style.background = CONF[i % CONF.length];
    const x = innerWidth * (0.2 + Math.random() * 0.6), y = innerHeight * 0.35;
    el.style.left = x + 'px'; el.style.top = y + 'px'; document.body.appendChild(el);
    const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260;
    el.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * v}px, ${Math.sin(a) * v * 0.6 - 120}px) rotate(${Math.random() * 720}deg)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${Math.cos(a) * v * 1.3}px, ${innerHeight * 0.5}px) rotate(${Math.random() * 1080}deg)`, opacity: 0 }], { duration: 1400 + Math.random() * 600, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => el.remove();
  }
}
function ripple(x, y) { const el = document.createElement('div'); el.className = 'ripple'; el.style.left = x + 'px'; el.style.top = y + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 450); }
let toastT = 0;
function toast(msg) { if (panelOpen) return;   // never over an open panel (its buttons already say what's wrong)
  const el = $('toast'); el.textContent = msg; el.classList.remove('hidden'); el.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.classList.add('hidden'), 300); }, 2200); }

// ---------------- the egg ----------------
const egg = { position: world.eggGroup.position, squash: 0, sv: 0, tiltX: 0, tiltZ: 0, tv: new THREE.Vector2(), state: 'idle', t: 0, drop: 0 };
const eggHeat = () => Math.round(EGGS[S.egg.type].heat * Math.min(HEAT_CAP, Math.pow(HEAT_GROW, S.eh[S.egg.type] || 0)));
const crackStage = () => { const k = S.egg.heat / eggHeat(); return k < 0.3 ? 0 : k < 0.6 ? 1 : k < 0.85 ? 2 : 3; };
function refreshEgg() { world.setEgg(S.egg.type, crackStage(), S.egg.seed); }
function warmEgg(amount, coins, auto = false) {
  if (egg.state !== 'idle') return;
  const before = crackStage();
  S.egg.heat = Math.min(eggHeat(), S.egg.heat + amount);
  earn(coins);
  if (!auto) {
    egg.sv += 11; egg.tv.x += (Math.random() - 0.5) * 3; egg.tv.y += (Math.random() - 0.5) * 3;
    const top = toScreen(tmpV.set(NEST.x, 2.3, NEST.z));
    floatText(top.x + (Math.random() - 0.5) * 70, top.y, `+${fmt(coins)}`);
    { const sc = [1, 1.122, 1.26, 1.335, 1.498]; audio.play('tap', { vol: 0.5, rate: sc[Math.floor(Math.random() * 5)] * (0.94 + (S.egg.heat / eggHeat()) * 0.12) }); }   // pentatonic steps so repeats never grate
    fx.sparkle(tmpV.set(NEST.x, 1.0, NEST.z), 0xffd27a, 6, 1.8); fx.tapRing();
  } else { egg.sv += 1.5; }
  const after = crackStage();
  if (after !== before) { refreshEgg(); audio.play('crack', { vol: 0.6 }); egg.sv += 6; fx.puff(tmpV.set(NEST.x, 0.9, NEST.z), 5, 0xfff3d6); }
  if (S.egg.heat >= eggHeat()) startHatch();
}
function tapEgg() {
  const tp = tapPower(S.tap) * boostMult();
  warmEgg(tapPower(S.tap), tapCoins() * boostMult());
  if (!S.hatched && hintTaps++ > 2) $('hintT').textContent = t('tapMore');
}
let hintTaps = 0;

// hatch sequence: shake → burst → pet on the nest (reveal) → it jumps onto the island → next egg drops in
let revealPet = null, revealDupe = false, revealT = 0;
function startHatch() { egg.state = 'shake'; egg.t = 0; audio.play('whoosh', { vol: 0.5 }); }
let forcePick = null;
function pickPet() {
  const type = S.egg.type;
  if (forcePick) { const f = ANIMALS.find((a) => a.id === forcePick); forcePick = null; return f; }
  if (!S.hatched) return ANIMALS[0];                       // first hatch is always the chick
  const pool = ANIMALS.filter((a) => a.egg === type);
  // fairness: a new (missing) pet is guaranteed at least every PITY hatches of the same egg
  const missing = pool.filter((a) => !S.pets[a.id]);
  if (missing.length && ((S.miss[type] || 0) >= PITY - 1 || S.hatched < 3)) {
    let q = Math.random() * missing.reduce((s, a) => s + RARITY[a.r].weight, 0);
    for (const a of missing) { q -= RARITY[a.r].weight; if (q <= 0) return a; }
    return missing[0];
  }
  let r = Math.random() * pool.reduce((s, a) => s + RARITY[a.r].weight, 0);
  for (const a of pool) { r -= RARITY[a.r].weight; if (r <= 0) return a; }
  return pool[0];
}
function burst() {
  const def = pickPet();
  const had = S.pets[def.id] || 0;
  revealDupe = had > 0;
  const eggT = S.egg.type;
  S.eh[eggT] = (S.eh[eggT] || 0) + 1;
  if (!had) S.miss[eggT] = 0;
  else if (ANIMALS.some((a) => a.egg === eggT && !S.pets[a.id])) S.miss[eggT] = (S.miss[eggT] || 0) + 1;
  S.pets[def.id] = Math.min(5, had + 1);
  if (had >= 5) earn(petIncome(def.id, 5) * 20);
  S.hatched++;
  const pos = tmpV.set(NEST.x, 0.8, NEST.z).clone();
  world.egg.visible = false;
  fx.shards(pos, new THREE.Color(EGGS[S.egg.type].base));
  fx.puff(pos, 10); fx.ring(pos);
  fx.sparkle(pos, RARITY[def.r].color, 10 + def.r * 8, 2);
  if (def.r >= 2) fx.pillar(new THREE.Vector3(NEST.x, 0, NEST.z), RARITY[def.r].color);
  audio.play(!had ? 'hatch_rare' : 'hatch', { vol: 0.7 });           // new pet: the longer jingle
  if (def.r >= 3) platform.happytime();
  if (!had) { const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  // pet appears on the nest
  revealPet = spawnPet(def, new THREE.Vector3(NEST.x, 0.45, NEST.z));
  pets.pop();                                              // not walking yet
  revealPet.state = 'reveal'; revealPet.m.root.scale.setScalar(0.01);
  revealT = 0;
  showReveal(def, S.pets[def.id], !revealDupe);
  burstRays.material.color.set(def.r ? RARITY[def.r].color : '#fff3b0');
  if (!revealDupe) $('dim').classList.add('on');
  S.egg.heat = 0;
  save();
}
function endReveal() {
  if (!revealPet) return;
  const p = revealPet; revealPet = null;
  $('reveal').classList.add('hidden'); $('dim').classList.remove('on');
  p.m.root.scale.setScalar(p.m.spec.size || 1);
  if (revealDupe) {
    // the island already has this pet: the copy poofs into a star for the existing one
    const host = pets.find((q) => q.def.id === p.def.id);
    scene.remove(p.m.root); fx.puff(p.pos, 10, 0xfff3b0);
    if (host) { fx.sparkle(host.pos, 0xffd04a, 14, 1.4); if (host.state === 'idle' || host.state === 'walk') jumpTo(host, host.pos.clone(), 0.5, 1); }
    { const st = S.pets[p.def.id] || 1, s = toScreen(tmpV.set(NEST.x, 1.9, NEST.z)); floatText(s.x, s.y, `${t('pets.' + p.def.id)} ${'★'.repeat(st)} · ${t('dupeBonus', { n: (st - 1) * 50 })}`, '#ffe08a'); }
  } else {
    pets.push(p); p.pos.set(NEST.x, 0.45, NEST.z); jumpTo(p, freeSpot(), 0.9, 2.4);
    if (S.hatched === 1) setTimeout(() => toast(t('hatchHint')), 900);
    checkUnlocks(); updateDex(true); confetti(18);
    const ei = p.def.egg;
    if (!S.setDone[ei] && speciesFound(ei) === 4) { S.setDone[ei] = 1; const b = SET_BONUS[ei]; earn(b); setTimeout(() => { banner(t('setDone2', { egg: t('eggShort')[ei] }), `+${fmt(b)}`); confetti(60); audio.play('unlock', { vol: 0.7 }); flyBurst(); }, 700); }
  }
  nextEgg();
  maybeMidgame();
  updateHud(true);
}
function nextEgg() {
  let type = S.sel;
  if (S.autoSel != null) {                       // a newly unlocked egg goes on the nest as soon as it's affordable (quietly until then)
    if (S.coins >= eggCost(S.autoSel)) { type = S.sel = S.autoSel; S.autoSel = null; } else if (eggCost(type) > S.coins) type = 0;
  }
  if (!eggUnlocked(type)) type = 0;
  const cost = eggCost(type);
  if (cost > 0) {
    if (S.coins >= cost) { S.coins -= cost; audio.play('buy', { vol: 0.5 }); const s = toScreen(tmpV.set(NEST.x, 0.2, NEST.z)); floatText(s.x, s.y + 30, `−${fmt(cost)} · ${t('egg')[type]}`, '#ffe9a8'); }
    else { type = 0; if (!nextEgg.told || Date.now() - nextEgg.told > 180000) { nextEgg.told = Date.now(); toast(t('nextEggFree')); } }   // once, then quiet for 3 min
  }
  S.egg = { type, heat: 0, seed: 1 + Math.floor(Math.random() * 9999), paid: type === S.sel ? cost : 0 };
  refreshEgg();
  world.egg.visible = true; egg.state = 'drop'; egg.t = 0;
  save();
}
let unlockedSeen = null;
function checkUnlocks() {
  const now = EGGS.map((_, i) => eggUnlocked(i));
  if (unlockedSeen) now.forEach((u, i) => { if (u && !unlockedSeen[i]) { S.autoSel = i; setTimeout(() => { banner(t('newEgg'), t('egg')[i], i); confetti(50); audio.play('unlock', { vol: 0.7 }); }, 900); } });
  unlockedSeen = now;
}
function showReveal(def, stars, isNew) {
  const el = $('reveal');
  el.innerHTML = `${isNew ? `<div class="new ot">${t('newPet')}</div>` : `<div class="new ot">${t('dupe')}</div>`}
    <div class="rib" style="background:${RARITY[def.r].color}"><span class="ot">${t('pets.' + def.id)}</span></div><br>
    <div class="tg">${t('rarity')[def.r]} · ${'★'.repeat(stars)}${'<span style="opacity:.25">★</span>'.repeat(5 - stars)} · ${speciesFound(def.egg)}/4 ${t('eggShort')[def.egg]}</div>`;
  el.classList.remove('hidden');
}
function updateEgg(dt, time) {
  // spring squash + wobble
  egg.sv += (-egg.squash * 120 - egg.sv * 9) * dt; egg.squash += egg.sv * dt;
  egg.tv.x += (-egg.tiltX * 90 - egg.tv.x * 7) * dt; egg.tv.y += (-egg.tiltZ * 90 - egg.tv.y * 7) * dt;
  egg.tiltX += egg.tv.x * dt; egg.tiltZ += egg.tv.y * dt;
  const g = world.eggGroup, e = world.egg;
  const sq = clamp(egg.squash * 0.02, -0.25, 0.25);
  let shakeX = 0, shakeZ = 0, y = 0.32;
  const k = S.egg.heat / eggHeat();
  if (egg.state === 'idle') {
    // idle wiggle grows as the egg gets close to hatching
    shakeZ = Math.sin(time * (3 + k * 10)) * (0.02 + k * 0.06) * (Math.sin(time * 1.3) > 0.2 ? 1 : 0.3);
  } else if (egg.state === 'shake') {
    egg.t += dt; shakeZ = Math.sin(egg.t * 60) * 0.18; shakeX = Math.cos(egg.t * 47) * 0.1;
    e.scale.setScalar(1 + egg.t * 0.25);
    if (egg.t > 0.7) { egg.state = 'gone'; e.scale.setScalar(1); burst(); }
  } else if (egg.state === 'drop') {
    egg.t += dt; const d = clamp(egg.t / 0.5, 0, 1);
    y = 0.32 + (1 - d * d) * 6;
    if (d >= 1) { egg.state = 'idle'; egg.sv += 14; fx.puff(tmpV.set(NEST.x, 0.4, NEST.z), 8, 0xffe9b0); audio.play('place', { vol: 0.6 }); }
  }
  g.position.y = y;
  e.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
  e.rotation.x = egg.tiltX * 0.08 + shakeX; e.rotation.z = egg.tiltZ * 0.08 + shakeZ;
  world.glow.material.opacity = egg.state === 'gone' ? 0 : 0.15 + k * 0.75 + Math.sin(time * 6) * 0.05 * k;
  world.glow.scale.setScalar(0.8 + k * 0.4);
  // reveal pet pop-in
  if (revealPet) {
    revealT += dt;
    const s = (revealPet.m.spec.size || 1) * 1.8 * elastic(clamp(revealT / 0.5, 0, 1));
    revealPet.m.root.scale.setScalar(Math.max(0.01, s));
    updatePet(revealPet, dt, time);
    burstRays.visible = true; burstRays.position.set(NEST.x, 1.4, NEST.z).addScaledVector(tmpV.subVectors(burstRays.position.set(NEST.x, 1.4, NEST.z), camera.position).normalize(), 2.5); burstRays.material.rotation = time * 0.6;
    burstRays.scale.setScalar(7 * Math.min(1, revealT * 3)); burstRays.material.opacity = 0.7 * Math.min(1, revealT * 3);
    if (Math.random() < dt * 8) fx.sparkle(tmpV.set(NEST.x, 1.2, NEST.z), burstRays.material.color.getHex(), 1, 3);
    if (revealT > (revealDupe ? 1.0 : 2.6)) endReveal();          // duplicates: a short pop, new pets: the full reveal
  } else if (burstRays.visible) { burstRays.material.opacity -= dt * 3; if (burstRays.material.opacity <= 0) burstRays.visible = false; }
}
const burstRays = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; for (let i = 0; i < 14; i++) { x.beginPath(); x.moveTo(128, 128); const a = (i / 14) * Math.PI * 2; x.arc(128, 128, 128, a, a + 0.22); x.fill(); }
  
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0 }));
  s.renderOrder = -1; s.visible = false; scene.add(s); return s;
})();
const elastic = (x) => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1);

// ---------------- money / upgrades ----------------
function earn(v) { S.coins += v; S.total += v; }
function buy(kind) {
  const lv = S[kind];
  if (lv >= MAXLV[kind]) return;
  const c = COST[kind](kind === 'tap' ? lv : lv);
  if (S.coins < c) { audio.play('error', { vol: 0.55 }); toast(t('notEnough')); return; }
  S.coins -= c; S[kind]++;
  audio.play('buy', { vol: 0.6 });
  if (kind === 'lamp' && S.lamp === 1) { world.lamp.visible = true; fx.puff(world.lamp.position, 10); }
  if (kind === 'treats' && S.treats === 1) { world.bowl.visible = true; fx.puff(world.bowl.position, 10); }
  { const e = effect(kind, S[kind] - 1); toast(t(kind === 'tap' ? 'upTap' : kind === 'lamp' ? 'upLamp' : 'upTreats', e)); const r = tags[kind].getBoundingClientRect(); floatText(r.left + r.width / 2, r.top - 6, t(kind === 'tap' ? 'effTap' : kind === 'lamp' ? 'effLamp' : 'effTreats', e), '#c8ff8a'); }
  S.bought = 1;
  if (kind === 'tap') { fx.sparkle(tmpV.set(NEST.x, 1, NEST.z), 0xffd27a, 16, 1.8); fx.ring(new THREE.Vector3(NEST.x, 0, NEST.z), 0xffd27a); egg.sv += 16; }
  if (kind === 'lamp') fx.sparkle(world.lamp.position.clone().setY(1.8), 0xffe08a, 10, 1);
  if (kind === 'treats') { fx.sparkle(world.bowl.position.clone().setY(0.5), 0x9ad65a, 22, 1.4); fx.ring(world.bowl.position.clone(), 0x9ad65a); const s = toScreen(world.bowl.position.clone().setY(1)); floatText(s.x, s.y, t('treatsInfo'), '#d8ffb0'); pets.forEach((p, k) => { if (p.state === 'idle' || p.state === 'walk') setTimeout(() => { jumpTo(p, p.pos.clone(), 0.45, 0.9); fx.sparkle(p.pos.clone().setY(1.1), 0xff8ab0, 4, 0.6); }, k * 60); }); }
  updateHud(true); save();
}

// what an upgrade does, from level l to l+1 (shown on the button and in the toast)
function effect(kind, l) {
  if (kind === 'tap') return { a: tapPower(l), b: tapPower(l + 1) };
  if (kind === 'lamp') return { a: autoRate(l).toFixed(1).replace('.0', ''), b: autoRate(l + 1).toFixed(1).replace('.0', '') };
  return { a: Math.round((treatsMult(l) - 1) * 100), b: Math.round((treatsMult(l + 1) - 1) * 100) };
}
// ---------------- HUD ----------------
const tags = { tap: $('tTap'), lamp: $('tLamp'), treats: $('tTreats') };
let lastHud = 0;
function updateHud(force) {
  const now = performance.now();
  if (!force && now - lastHud < 120) return;
  lastHud = now;
  $('coinN').textContent = fmt(S.coins);
  if (force) updateDex();
  { const r = ratePerSec(); $('rateN').textContent = '+' + (r < 10 ? r.toFixed(1).replace(/\.0$/, '') : fmt(r)) + t('perSec'); }
  // the first-purchase callout goes on ONE button only: the cheapest upgrade you can afford
  let readyKind = null, best = Infinity;
  for (const k of Object.keys(tags)) { const c = COST[k](S[k]); if (S.hatched > 0 && S[k] < MAXLV[k] && S.coins >= c && c < best && !tags[k].classList.contains('hidden')) { best = c; readyKind = k; } }
  for (const k of Object.keys(tags)) {
    const el = tags[k], lv = S[k], max = lv >= MAXLV[k], c = COST[k](lv);
    el.querySelector('.lv').textContent = lv;
    el.querySelector('.eff').textContent = max ? '' : t(k === 'tap' ? 'effTap' : k === 'lamp' ? 'effLamp' : 'effTreats', effect(k, lv));
    el.title = t(k + 'Info');
    el.querySelector('.cost span').textContent = max ? t('max') : fmt(c);
    el.classList.toggle('can', !max && S.coins >= c && S.hatched > 0);
    el.classList.toggle('cant', !max && S.coins < c);
    el.classList.add('buy'); el.classList.toggle('off', max || S.coins < c || el.classList.contains('hidden'));
    el.classList.toggle('ready', !S.bought && k === readyKind);
  }
  const b = $('btnBoost'), left = S.boostUntil - Date.now();
  b.classList.toggle('on', left > 0);
  $('boostT').textContent = left > 0 ? `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}` : '×2';
  b.classList.toggle('hidden', !S.hatched);
  $('tEggs').classList.toggle('hidden', S.hatched < 2);
  $('tBook').classList.toggle('hidden', !S.hatched);
  tags.lamp.classList.toggle('hidden', S.hatched < 1);
  tags.treats.classList.toggle('hidden', S.hatched < 2);
}
function goal() {
  for (let i = 0; i < 4; i++) if (!eggUnlocked(i + 1)) return { text: t('goalFind', { egg: t('eggShort')[i] }), n: speciesFound(i), of: 2, reward: t('egg')[i + 1] };
  for (let i = 0; i < 5; i++) if (speciesFound(i) < 4) return { text: t('goalSet', { egg: t('eggShort')[i] }), n: speciesFound(i), of: 4, reward: '+' + fmt(SET_BONUS[i]) };
  return { text: t('goalAll'), n: 20, of: 20, reward: '' };
}
function updateDex(pop) {
  const n = ANIMALS.filter((a) => S.pets[a.id]).length, gl = goal();
  $('dexG').textContent = gl.text; $('dexN').textContent = `${gl.n}/${gl.of}`; $('dexR').textContent = gl.reward ? '→ ' + gl.reward : `${n}/20`;
  $('dexF').style.width = (gl.n / gl.of * 100) + '%';
  $('dex').classList.toggle('hidden', !S.hatched);
  if (pop) { const d = $('dex'); d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop'); }
}
function placeHudOverEgg() {
  const c = toScreen(tmpV.set(NEST.x, world.eggGroup.position.y + 0.85, NEST.z));
  const top = toScreen(tmpV.set(NEST.x, world.eggGroup.position.y + 1.75, NEST.z));
  const size = Math.max(120, Math.abs(c.y - top.y) * 2.6);
  const w = $('warm');
  w.style.left = c.x + 'px'; w.style.top = c.y + 'px'; w.style.width = w.style.height = size + 'px';
  w.classList.toggle('hidden', egg.state !== 'idle');
  { const ni = newIn(S.egg.type); $('warmN').textContent = t('egg')[S.egg.type] + (ni && S.hatched ? ' · ' + t('newShort', { n: ni }) : ''); }
  $('warmF').style.strokeDashoffset = String(289 * (1 - S.egg.heat / eggHeat()));
  const h = $('hint');
  const side = toScreen(tmpV.set(NEST.x + 1.0, 1.6, NEST.z));
  h.style.left = side.x + 'px'; h.style.top = side.y + 'px';
  { const tx = $('hintT'), wpx = tx.offsetWidth; tx.style.left = Math.max(-side.x + 8, Math.min(40, innerWidth - 8 - side.x - wpx)) + 'px'; tx.style.top = (side.x + 40 + wpx > innerWidth - 8 ? -64 : -28) + 'px'; }
  h.classList.toggle('hidden', S.hatched > 0 || egg.state !== 'idle');
}

// ---------------- panels ----------------
const veil = $('veil');
let panelOpen = false;
function openPanel(html, cls = '') {
  veil.innerHTML = `<div class="sheet ${cls}">${html}</div>`;
  veil.classList.remove('hidden'); panelOpen = true; document.body.classList.add('panel'); { const tEl = $('toast'); tEl.classList.add('hidden'); clearTimeout(toastT); } audio.play('open', { vol: 0.5 });
  platform.gameplayStop();
  veil.querySelector('.x')?.addEventListener('click', closePanel);
}
function closePanel() { document.body.classList.remove('panel'); veil.classList.add('hidden'); veil.innerHTML = ''; panelOpen = false; audio.play('close', { vol: 0.5 }); platform.gameplayStart(); }
veil.addEventListener('pointerdown', (e) => { if (e.target === veil) closePanel(); });

function eggSvg(i, lock) {
  const e = EGGS[i];
  return `<svg class="eg" viewBox="0 0 40 50"><path d="M20 3C11 3 4 18 4 30c0 9.5 7 17 16 17s16-7.5 16-17C36 18 29 3 20 3z" fill="${e.base}" stroke="#2a1d17" stroke-width="3"/>
    <circle cx="13" cy="26" r="3.6" fill="${e.spot}"/><circle cx="26" cy="18" r="3" fill="${e.spot2}"/><circle cx="26" cy="35" r="4.4" fill="${e.spot}"/><circle cx="15" cy="39" r="2.6" fill="${e.spot2}"/>
    <path d="M11 15c1.5-4 3.5-6.5 6-7.5" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>${lock ? '<g transform="translate(10 18) scale(.5)"><use href="#i-lock"/></g>' : ''}</svg>`;
}
function openEggs() {
  const rows = EGGS.map((e, i) => {
    // "on" = the egg really sitting on the nest (not just the selection), so the shop never shows a choice that didn't happen
    const lock = !eggUnlocked(i), on = S.egg.type === i, cant = !lock && !on && S.coins < eggCost(i), next = !lock && !on && !cant && i > S.egg.type;
    const petsH = ANIMALS.filter((a) => a.egg === i).map((a) => `<div class="pc ${S.pets[a.id] ? '' : 'miss'}" style="border-color:${RARITY[a.r].color}"><img src="${portrait(a.id)}" alt=""><b style="background:${RARITY[a.r].color}">${RARITY[a.r].weight}%</b></div>`).join('');
    const ni = newIn(i), found = speciesFound(i);
    const btn = lock ? `<button class="pbtn" disabled><svg class="i"><use href="#i-lock"/></svg></button>`
      : on ? `<button class="pbtn flat" disabled>${t('selected')}</button>`
      : cant ? `<button class="pbtn cant" data-egg="${i}">${t('needMore', { n: fmt(eggCost(i) - S.coins) })}</button>`
      : `<button class="pbtn ${eggCost(i) ? 'gold' : ''}" data-egg="${i}">${t('select')}</button>`;
    const sub = lock ? t('locked', { n: 2, egg: t('eggShort')[i - 1] }) : (eggCost(i) ? `<svg class="i"><use href="#i-coin"/></svg> ${fmt(eggCost(i))}` : t('free'));
    return `<div class="eggrow ${on ? 'on' : ''} ${lock ? 'lock' : ''} ${next ? 'next' : ''}">${eggSvg(i, lock)}<div class="mid"><div class="nm">${t('egg')[i]}</div><div style="font-weight:800;font-size:14px">${sub}</div><div class="pets">${petsH}</div><div class="odds">${found}/4 · ${ni ? t('newIn', { n: ni }) : t('setDone')}</div></div>${btn}</div>`;
  }).join('');
  const odds = RARITY.map((r, i) => `<span style="color:${r.color}">${t('rarity')[i]} ${r.weight}%</span>`).join(' · ');
  openPanel(`<div class="ribbon wood ot">${t('eggsTitle')}</div><button class="x">✕</button><p class="sub long">${t('eggsSub')}</p><p class="sub" style="font-size:14px">${t('chance')}: ${odds}<br><b>${t('pityInfo', { n: PITY })}</b></p><div class="scroll">${rows}</div>`, 'eggs');
  veil.querySelectorAll('[data-egg]').forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.egg, c = eggCost(i);
    if (S.coins < c) { audio.play('error', { vol: 0.55 }); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); b.textContent = t('needMore', { n: fmt(c - S.coins) }); return; }   // never switch silently: the button shakes and says what's missing
    if (egg.state !== 'idle' || revealPet) { toast(t('waitHatch')); return; }
    // put the chosen egg on the nest right now; the current egg goes back and its price is refunded
    audio.play('buy', { vol: 0.5 });
    S.coins += S.egg.paid || 0; S.coins -= c; S.sel = i;
    S.egg = { type: i, heat: 0, seed: 1 + Math.floor(Math.random() * 9999), paid: c }; refreshEgg(); egg.state = 'drop'; egg.t = 0;
    save(); closePanel(); toast(t('eggOnNest', { egg: t('egg')[i] })); updateHud(true);
  }));
}
function openBook() {
  let html = '';
  EGGS.forEach((e, i) => {
    html += `<div class="rowh">${eggSvg(i, false).replace('class="eg"', 'style="width:20px;height:25px"')} ${t('egg')[i]}</div>`;
    ANIMALS.filter((a) => a.egg === i).forEach((a) => {
      const st = S.pets[a.id] || 0;
      html += `<div class="card ${st ? '' : 'unk'}" style="border-color:${st ? RARITY[a.r].color : '#2a1d17'}"><img src="${portrait(a.id)}" alt=""><div class="nm">${st ? t('pets.' + a.id) : t('unknown')}</div>${st ? `<div class="st">${'★'.repeat(st)}</div>` : ''}</div>`;
    });
  });
  const n = ANIMALS.filter((a) => S.pets[a.id]).length;
  openPanel(`<div class="ribbon wood ot">${t('bookTitle')}</div><button class="x">✕</button><p class="sub">${t('found', { n })} · ${t('starBonus')}</p><div class="scroll"><div class="grid">${html}</div></div>`);
}
const boostCost = () => Math.max(100, Math.round(ratePerSec(false) * 90 / 10) * 10);
function openBoost() {
  const left = S.boostUntil - Date.now();
  const ad = platform.hasRewarded;
  openPanel(`<div class="ribbon wood ot">${t('boost')}</div><button class="x">✕</button><div class="boostbox"><svg class="i big"><use href="#i-sun"/></svg>
    <div style="font-weight:900;font-size:18px">${t('boostInfo')}</div>${left > 0 ? `<div style="font-weight:800">${t('active', { t: Math.ceil(left / 60000) + ' min' })}</div>` : ''}
    <div class="row">${ad ? `<button class="pbtn" id="bAd"><svg class="i"><use href="#i-tv"/></svg> ${t('watch')}</button><span style="font-weight:800">${t('orCoins')}</span>` : ''}
    <button class="pbtn gold" id="bCoins"><svg class="i"><use href="#i-coin"/></svg> ${fmt(boostCost())}</button></div></div>`);
  $('bAd')?.addEventListener('click', async () => { closePanel(); if (await showRewarded()) giveBoost(); else toast(t('noAd')); });
  $('bCoins').addEventListener('click', () => { const c = boostCost(); if (S.coins < c) { audio.play('error'); toast(t('notEnough')); return; } S.coins -= c; closePanel(); giveBoost(); });
}
function giveBoost() {
  S.boostUntil = Math.min(Math.max(S.boostUntil, Date.now()) + BOOST_MS, Date.now() + BOOST_MS * 3);
  toast(t('boostOn')); audio.play('unlock', { vol: 0.6 }); fx.sparkle(tmpV.set(0, 1, 0), 0xffe08a, 30, 8); updateHud(true); save();
}
function openSettings() {
  const row = (k, on) => `<button class="pbtn ${on ? '' : 'flat'}" data-k="${k}"><svg class="i"><use href="#${on ? 'i-sound' : 'i-mute'}"/></svg> ${t(k)}</button>`;
  openPanel(`<div class="ribbon wood ot">${t('sound')}</div><button class="x">✕</button><div class="setrow">${row('sound', S.sound)}${row('music', S.music)}</div>`);
  veil.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.k; S[k] = !S[k]; applyAudio(); save(); openSettings(); }));
}
function applyAudio() { audio.setSound(S.sound && siteAudio); audio.setMusic(S.music && siteAudio); $('btnSet').innerHTML = `<svg class="i"><use href="#${S.sound && siteAudio ? 'i-sound' : 'i-mute'}"/></svg>`; }
let siteAudio = true;
platform.onAudio = (on) => { siteAudio = on; applyAudio(); };

// ---------------- ads ----------------
let adBusy = false, lastAd = 0;
let sessionStart = Date.now();
async function showRewarded() {
  if (adBusy) return false; adBusy = true; paused++;
  platform.gameplayStop();
  let started = false;
  const ok = await platform.rewarded(() => { started = true; audio.suspend(); });
  if (started) audio.resume();
  paused--; adBusy = false; if (!panelOpen) platform.gameplayStart();
  lastAd = Date.now();
  return ok;
}
async function maybeMidgame() {
  const now = Date.now();
  if (adBusy || panelOpen || now - sessionStart < 180000 || now - lastAd < 180000) return;
  adBusy = true; paused++; platform.gameplayStop();
  let started = false;
  await platform.interstitial(() => { started = true; audio.suspend(); });
  if (started) audio.resume();
  lastAd = Date.now(); paused--; adBusy = false; if (!panelOpen) platform.gameplayStart();
}

// ---------------- portraits for the book (rendered once per pet) ----------------
const portraits = {};
let pScene = null, pCam = null, pRT = null;
function portrait(id) {
  if (portraits[id]) return portraits[id];
  if (!pScene) {
    pScene = new THREE.Scene();
    pScene.add(new THREE.HemisphereLight(0xffffff, 0xb0a080, 2.4));
    const d = new THREE.DirectionalLight(0xffffff, 3.2); d.position.set(2, 4, 5); pScene.add(d);
    pCam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); pCam.position.set(0, 1.1, 4); pCam.lookAt(0, 0.55, 0);
    pRT = new THREE.WebGLRenderTarget(160, 160, { samples: 4 });
  }
  const m = buildAnimal(id); m.root.scale.setScalar(1); m.root.rotation.y = -0.45; pScene.add(m.root);
  renderer.setRenderTarget(pRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(pScene, pCam); renderer.setRenderTarget(null);
  const px = new Uint8Array(160 * 160 * 4); renderer.readRenderTargetPixels(pRT, 0, 0, 160, 160, px);
  pScene.remove(m.root);
  const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'); const img = x.createImageData(160, 160);
  for (let y = 0; y < 160; y++) for (let i = 0; i < 160 * 4; i += 4) {
    const s = (159 - y) * 640 + i, d = y * 640 + i;
    for (let k = 0; k < 3; k++) img.data[d + k] = 255 * Math.pow(px[s + k] / 255, 1 / 2.2);
    img.data[d + 3] = px[s + 3];
  }
  x.putImageData(img, 0, 0);
  return (portraits[id] = c.toDataURL());
}

// ---------------- input ----------------
let paused = 0;
canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (paused || panelOpen) return;
  if (revealPet) { if (revealT > (revealDupe ? 0.15 : 0.6)) endReveal(); return; }
  ripple(e.clientX, e.clientY);
  // tapping a pet makes it hop (small bonus); anything else warms the egg
  const eggS = toScreen(tmpV.set(NEST.x, 1.0, NEST.z));
  const eggR = Math.abs(toScreen(tmpV.set(NEST.x, 2.2, NEST.z)).y - eggS.y);
  if (Math.hypot(e.clientX - eggS.x, e.clientY - eggS.y) > eggR * 1.2) {
    for (const p of pets) {
      if (p.state !== 'idle' && p.state !== 'walk') continue;
      const s = toScreen(tmpV.copy(p.pos).setY(0.5));
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 34) {
        jumpTo(p, p.pos.clone(), 0.5, 1.1); audio.play('jump', { vol: 0.5, rate: 1.3 });
        fx.sparkle(p.pos.clone().setY(1), 0xff8ab0, 5, 0.8);
        return;
      }
    }
  }
  tapEgg();
});
addEventListener('keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !panelOpen && !paused) { audio.unlock(); if (revealPet) { if (revealT > (revealDupe ? 0.15 : 0.6)) endReveal(); } else tapEgg(); e.preventDefault(); } });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('keydown', (e) => { if (e.code === 'Escape' && panelOpen && veil.querySelector('.x')) closePanel(); });
$('tTap').addEventListener('click', () => buy('tap'));
$('tLamp').addEventListener('click', () => buy('lamp'));
$('tTreats').addEventListener('click', () => buy('treats'));
$('tEggs').addEventListener('click', openEggs);
$('tBook').addEventListener('click', openBook);
$('btnBoost').addEventListener('click', openBoost);
$('btnSet').addEventListener('click', openSettings);
document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });

// ---------------- save ----------------
let saveT = 0;
function save() { S.lastSeen = Date.now(); const s = JSON.stringify(S); platform.writeSave(s); }
async function load() {
  if (Q.has('reset')) return;
  try { const s = await platform.loadSave(); if (s) S = Object.assign(fresh(), JSON.parse(s)); } catch (e) { S = fresh(); }
  if (!Array.isArray(S.miss)) S.miss = [0, 0, 0, 0, 0];
  if (!Array.isArray(S.eh)) S.eh = [0, 0, 0, 0, 0];
  if (!Array.isArray(S.setDone)) S.setDone = [0, 0, 0, 0, 0];
}
// silence + pause whenever the player is not here: tab hidden, window blurred, page closing, or a portal pause
let away = false;
function setAway(on) {
  if (on === away) return;
  away = on;
  if (on) { save(); audio.suspend(); paused++; } else { audio.resume(); paused = Math.max(0, paused - 1); clock.getDelta(); }
}
let blurred = false;   // from blur/focus events only (an iframe can be unfocused at load, that must not pause the game)
const checkAway = () => setAway(document.hidden || blurred);
document.addEventListener('visibilitychange', checkAway);
addEventListener('blur', () => { blurred = true; checkAway(); });
addEventListener('focus', () => { blurred = false; checkAway(); });
addEventListener('pointerdown', () => { if (blurred) { blurred = false; checkAway(); } }, true);
addEventListener('pageshow', checkAway);
addEventListener('pagehide', () => setAway(true));
platform.onPause = () => setAway(true);
platform.onResume = () => checkAway();
addEventListener('pagehide', save);

// ---------------- main loop ----------------
let shake = 0, autoAcc = 0, time = 0, forceZoom = null, camKick = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  step(dt);
  renderer.render(scene, camera);
}
function step(dt) {
  time += dt;
  if (!paused) {
    // Warm Lamp: automatic taps
    if (S.lamp > 0 && egg.state === 'idle') {
      autoAcc += autoRate(S.lamp) * dt;
      while (autoAcc >= 1) { autoAcc -= 1; warmEgg(tapPower(S.tap), tapCoins() * boostMult(), true); }
      world.bulb.material.color.setHSL(0.12, 1, 0.7 + Math.sin(time * 8) * 0.08);
    }
    for (const p of pets) updatePet(p, dt, time);
    updateEgg(dt, time);
    fx.update(dt);
    world.update(time);
    saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  }
  // no camera shake or punches (motion-sickness rule): only one slow, gentle dolly while a NEW pet is revealed
  camZoom += ((forceZoom !== null ? forceZoom : (revealPet && !revealDupe) ? 0.55 : 0) - camZoom) * Math.min(1, dt * 1.6);
  placeCamera(time);
  placeHudOverEgg();
  updateHud();
}

// ---------------- boot ----------------
async function boot() {
  const bar = $('bar').firstElementChild;
  bar.style.width = '20%';
  await platform.init();
  setLang(Q.get('lang') || platform.lang());
  document.title = t('docTitle');
  $('logo').innerHTML = t('title').replace(' ', '<b>') + '</b>';
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('.tag').forEach((el) => el.setAttribute('data-ready', t('ready')));
  bar.style.width = '50%';
  await load();
  // rebuild the island from the save
  ANIMALS.forEach((a) => { if (S.pets[a.id]) spawnPet(a); });
  world.lamp.visible = S.lamp > 0; world.bowl.visible = S.treats > 0;
  if (S.egg.heat >= eggHeat()) S.egg.heat = eggHeat() - 1;
  refreshEgg(); checkUnlocks(); updateDex();
  applyAudio();
  bar.style.width = '80%';
  placeCamera(0);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  bar.style.width = '100%';
  // offline earnings
  const away = Math.min(OFFLINE_MAX, (Date.now() - (S.lastSeen || Date.now())) / 1000);
  const offline = Object.keys(S.pets).length && away > 60 ? Math.floor(ratePerSec(false) * away * 0.5) : 0;
  setTimeout(() => {
    $('loader').classList.add('hidden'); $('hud').classList.remove('hidden');
    clock.start(); updateHud(true);
    platform.loadingDone();
    platform.gameplayStart();
    if (offline > 0) openOffline(offline);
  }, 150);
  frame();
}
function openOffline(v) {
  const ad = platform.hasRewarded;
  openPanel(`<div class="ribbon wood ot">${t('welcome')}</div><div class="boostbox"><div style="font-weight:800">${t('offlineText')}</div>
    <div style="font-size:34px;font-weight:900;display:flex;align-items:center;gap:6px"><svg class="i"><use href="#i-coin"/></svg>${fmt(v)}</div>
    <div class="row"><button class="pbtn" id="oTake">${t('take')}</button>${ad ? `<button class="pbtn" id="oTake2"><svg class="i"><use href="#i-tv"/></svg> ${t('take2')}</button>` : ''}</div></div>`);
  $('oTake').addEventListener('click', () => { earn(v); closePanel(); flyBurst(v); });
  $('oTake2')?.addEventListener('click', async () => { closePanel(); const ok = await showRewarded(); earn(ok ? v * 2 : v); flyBurst(v); });
}
function flyBurst() { for (let i = 0; i < 10; i++) setTimeout(() => flyCoin(new THREE.Vector3((Math.random() - 0.5) * 4, 1, NEST.z), 0), i * 50); updateHud(true); save(); }

if (DEBUG) {
  window.__animals = ANIMALS; window.__eggs = EGGS; window.__cost = COST; window.__unlocked = eggUnlocked; window.__eggCost = eggCost;
  window.__game = {
    get S() { return S; }, set S(v) { S = v; }, pets, tapEgg, buy, egg, world, camera, renderer,
    sim(n, dt = 1 / 60, render = !window.__noRender) { for (let i = 0; i < n; i++) step(dt); if (render) renderer.render(scene, camera); },
    endReveal, get revealing() { return !!revealPet; }, openEggs, openBook, openBoost, closePanel, portrait,
    give(c) { S.coins += c; updateHud(true); },
    pick(id) { forcePick = id; }, zoom(z) { forceZoom = z; },
    spawn(id, x, z, face = true) { const a = ANIMALS.find((q) => q.id === id); S.pets[id] = S.pets[id] || 1; let p = pets.find((q) => q.def.id === id); if (!p) p = spawnPet(a); p.pos.set(x, 0, z); p.state = 'pose'; p.t = 0; if (face) p.heading = Math.atan2(camera.position.x - x, camera.position.z - z); p.m.root.position.copy(p.pos); p.m.root.rotation.y = p.heading; return p; },
    release() { pets.forEach((p) => { if (p.state === 'pose') { p.state = 'idle'; p.t = 0; } }); },
    setHeat(k) { S.egg.heat = Math.floor(eggHeat() * k); refreshEgg(); },
    hud(v) { document.getElementById('hud').style.visibility = v ? '' : 'hidden'; },
    sparkle(n) { fx.sparkle(new THREE.Vector3(NEST.x, 1.2, NEST.z), 0xffe08a, n, 2.6); },
    adDue() { sessionStart = lastAd = Date.now() - 400000; },
    get panelOpen() { return panelOpen; },
    hatchAll() { for (const a of ANIMALS) { S.pets[a.id] = 1 + (a.i % 3); if (!pets.find((p) => p.def.id === a.id)) spawnPet(a); } S.hatched = Math.max(S.hatched, 20); updateHud(true); },
  };
}
boot();
