export let ac = null;
export let muted = false;

export function audio() {
  if (muted) return null;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ac = new AC();
  }
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}

export function tone(freq, type, dur, vol, delay = 0, slideTo = null) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function noise(dur, vol, delay = 0, hp = 800) {
  const c = audio();
  if (!c) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = c.createGain(), t = c.currentTime + delay;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const SFX = {
  hit: () => { tone(190, 'triangle', 0.06, 0.07, 0, 95); noise(0.04, 0.04, 0, 1200); },
  crit: () => { tone(520, 'sawtooth', 0.09, 0.09, 0, 880); tone(260, 'triangle', 0.08, 0.08); },
  hurt: () => { tone(150, 'sawtooth', 0.16, 0.11, 0, 65); noise(0.1, 0.08, 0, 400); },
  dash: () => { noise(0.11, 0.09, 0, 600); tone(280, 'sine', 0.1, 0.06, 0, 520); },
  coin: () => { tone(988, 'square', 0.06, 0.05, 0); tone(1319, 'square', 0.09, 0.05, 0.055); },
  loot: (r = 0) => {
    const notes = Array.of(523, 659, 784, 1046, 1318).slice(0, 2 + r);
    notes.forEach((n, idx) => tone(n, 'triangle', 0.14, 0.08, idx * 0.06));
  },
  wave: () => { tone(330, 'triangle', 0.14, 0.08, 0); tone(440, 'triangle', 0.14, 0.08, 0.1); tone(660, 'triangle', 0.22, 0.09, 0.2); },
  win: () => { Array.of(523, 659, 784, 1046).forEach((n, idx) => tone(n, 'triangle', 0.2, 0.1, idx * 0.11)); },
  lose: () => { Array.of(392, 349, 311, 261).forEach((n, idx) => tone(n, 'sawtooth', 0.22, 0.08, idx * 0.14)); },
  whirl: () => { noise(0.24, 0.1, 0, 500); tone(220, 'sawtooth', 0.24, 0.07, 0, 540); },
  quake: () => { tone(110, 'sine', 0.35, 0.15, 0, 38); noise(0.25, 0.12, 0, 200); },
  heal: () => { tone(523, 'sine', 0.16, 0.08, 0); tone(784, 'sine', 0.22, 0.08, 0.1); },
  rage: () => { tone(140, 'sawtooth', 0.25, 0.1, 0, 280); tone(180, 'square', 0.2, 0.06, 0.08, 360); },
  chain: () => { tone(880, 'sawtooth', 0.08, 0.08, 0, 1420); tone(1240, 'square', 0.1, 0.07, 0.06, 620); },
  frost: () => { tone(1180, 'sine', 0.22, 0.08, 0, 640); noise(0.16, 0.07, 0, 2200); },
  shield: () => { tone(440, 'triangle', 0.18, 0.08, 0, 660); tone(660, 'sine', 0.22, 0.07, 0.08, 880); },
  kawoosh: () => { tone(95, 'sawtooth', 0.55, 0.14, 0, 420); tone(190, 'triangle', 0.48, 0.1, 0.05, 760); noise(0.45, 0.11, 0, 350); },
  ui: () => tone(660, 'sine', 0.05, 0.05)
};

export function sfx(kind, r = 0) {
  if (muted) return;
  const fn = SFX[kind];
  if (fn) fn(r);
}

export const MUS = {
  camp: Array.of(261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 392),
  arena: Array.of(146.83, 146.83, 174.61, 196, 220, 196, 174.61, 130.81),
  boss: Array.of(110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98)
};

let musTimer = null;
export let musicStep = 0;

export function startMusic(getContextState) {
  if (musTimer) return;
  musTimer = setInterval(() => {
    if (muted || !ac || ac.state !== 'running') return;
    const { gameState, isBoss } = getContextState ? getContextState() : { gameState: 'CAMP', isBoss: false };
    const bank = gameState === 'CAMP' ? MUS.camp : (isBoss ? MUS.boss : MUS.arena);
    const n = bank.at(musicStep % bank.length);
    musicStep++;
    tone(n, gameState === 'CAMP' ? 'sine' : 'triangle', 0.26, gameState === 'CAMP' ? 0.022 : 0.03);
  }, 340);
}

export function setMutedState(val) {
  muted = val;
}