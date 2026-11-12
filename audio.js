// Sound effects + a looped soft marimba music file, all through one AudioContext with a gentle limiter.
// Browsers only allow audio after a user gesture: call audio.unlock() from input handlers.

const SFX = ['buy','click','close','coin','crack','error','hatch','hatch_rare','open','unlock','whoosh','place','land','jump','tap','music'];
const MUSIC_GAIN = 0.6;   // ≈7 dB under a normal tapping mix (measured with ebur128)

let ctx = null, master = null, sfxGain = null, musicGain = null;
const buffers = {};
let soundOn = true, musicOn = true, suspended = 0, musicTimer = null;

function makeCtx() {
  if (ctx) return;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  // gentle limiter so stacked sounds never clip, then +6 dB make-up
  // bus: gentle glue compressor -> brickwall-style limiter at -1 dBFS -> soft clip ceiling (never above -1 dBTP)
  const ceil = ctx.createWaveShaper(); { const n = 2048, c = new Float32Array(n), L = 0.6; for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.abs(x) < 0.7 * L ? x : Math.sign(x) * (0.7 * L + (L - 0.7 * L) * Math.tanh((Math.abs(x) - 0.7 * L) / (L - 0.7 * L))); } ceil.curve = c; ceil.oversample = '4x'; }
  ceil.connect(ctx.destination);
  const brick = ctx.createDynamicsCompressor(); brick.threshold.value = -6; brick.knee.value = 0; brick.ratio.value = 20; brick.attack.value = 0.001; brick.release.value = 0.08; brick.connect(ceil);
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -12; lim.knee.value = 8; lim.ratio.value = 3; lim.attack.value = 0.005; lim.release.value = 0.2; lim.connect(brick);
  master = ctx.createGain(); master.gain.value = 1.4; master.connect(lim);
  sfxGain = ctx.createGain(); sfxGain.connect(master);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master);
  for (const name of SFX) {
    fetch(`./assets/sfx/${name}.mp3`).then((r) => r.arrayBuffer())
      .then((b) => new Promise((ok, bad) => ctx.decodeAudioData(b, ok, bad)))
      .then((buf) => { buffers[name] = buf; }).catch(() => { /* missing sound: stay silent */ });
  }
}

function apply() {
  if (!ctx) return;
  const audible = suspended === 0;
  if (audible && ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (!audible && ctx.state === 'running') ctx.suspend().catch(() => {});
  sfxGain.gain.value = soundOn ? 1 : 0;
  musicGain.gain.setTargetAtTime(musicOn ? MUSIC_GAIN : 0, ctx.currentTime, 0.3);
}

// --- music: a soft marimba loop (assets/sfx/music.mp3, made by tools/make_sfx.py) ---
let musicSrc = null;
function scheduleMusic() {
  if (!ctx || musicSrc || !buffers.music || ctx.state !== 'running') return;
  musicSrc = ctx.createBufferSource(); musicSrc.buffer = buffers.music; musicSrc.loop = true;
  musicSrc.connect(musicGain); musicSrc.start();
}

// iOS suspends/interrupts the context when the app is backgrounded; only a user gesture can resume it
for (const ev of ['touchend', 'pointerup', 'keydown']) {
  document.addEventListener(ev, () => { if (ctx && suspended === 0 && ctx.state !== 'running') ctx.resume().catch(() => {}); }, true);
}

function note(freq, t, dur, type, vol, out) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
}

export const audio = {
  unlock() {
    makeCtx();
    apply();
    if (!musicTimer && ctx) musicTimer = setInterval(scheduleMusic, 250);
  },
  play(name, { vol = 1, rate = 1 } = {}) {
    if (!ctx || !soundOn || suspended || !buffers[name]) return;
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buffers[name]; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g).connect(sfxGain); s.start();
  },
  // notes for quick UI blips that have no file
  blip(freqs, dur = 0.08, vol = 0.05) {
    if (!ctx || !soundOn || suspended) return;
    const t = ctx.currentTime;
    freqs.forEach((f, i) => note(f, t + i * dur, dur * 1.2, 'triangle', vol, sfxGain));
  },
  // ads, hidden tab, portal pause: stack-safe
  suspend() { suspended++; apply(); },
  resume() { if (suspended > 0) suspended--; apply(); },
  setSound(on) { soundOn = on; apply(); },
  setMusic(on) { musicOn = on; apply(); },
  get soundOn() { return soundOn; },
  get muted() { return suspended > 0 || (ctx ? ctx.state !== "running" : false); },
  get musicOn() { return musicOn; },
};
