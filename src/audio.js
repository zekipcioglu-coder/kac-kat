// ------------------------------------------------------------------
// Ses ve titreşim
// ------------------------------------------------------------------
import { store } from './storage.js';

let actx = null;
let muted = store.get('muted', false);

export function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
}

export function toggleMute() { muted = !muted; store.set('muted', muted); return muted; }

function tone(freq, dur, type = 'square', vol = 0.08, slideTo = null, delay = 0) {
  if (!actx || muted) return;
  const t0 = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(actx.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export const sfx = {
  jump() { tone(420, 0.12, 'square', 0.04, 700); },
  bonk() { tone(160, 0.06, 'square', 0.05); },
  land(f) { tone(Math.min(1800, 700 + f * 18), 0.06, 'triangle', 0.12); },
  nearMiss() { tone(1500, 0.05, 'sine', 0.1); tone(2000, 0.08, 'sine', 0.1, null, 0.06); },
  safe() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.1, null, i * 0.08)); },
  fall() { tone(600, 0.6, 'sawtooth', 0.05, 90); },
  saved() { [784, 988, 1175].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, null, i * 0.1)); },
  record() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.16, 'square', 0.05, null, 0.3 + i * 0.09)); },
};

export function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
