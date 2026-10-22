// ------------------------------------------------------------------
// Platformlar
// side: 'G' zemin, 'L' sol binanın balkonu, 'R' sağ binanın balkonu,
//       'M' iki bina arasında sağa-sola giden cam silme iskelesi
// ------------------------------------------------------------------
import { CFG, W, WL, WR, X_MIN, X_MAX, JUMP_D, diff } from './config.js';
import { clamp } from './util.js';

export function groundPlatform() {
  return { i: 0, Y: 0, side: 'G', w: WR - WL, base: W / 2, x: W / 2, minC: W / 2, maxC: W / 2, amp: 0, omega: 0, phase: 0 };
}

// Platformun t anındaki merkezi
export function platX(p, t) { return p.amp ? p.base + p.amp * Math.sin(p.phase + p.omega * t) : p.base; }

// Platformun hareketi boyunca kapladığı en geniş yatay aralık
export function sweep(p) { return [p.minC - p.w / 2, p.maxC + p.w / 2]; }

// Yeni platform her zaman bir öncekinden ulaşılabilir üretilir.
// Karakter önceki platformda [lo+m, hi-m] arasında gezer, zıplayınca `dir` yönünde JUMP_D
// kadar yol alır; karşı duvara çarparsa duvarda kalır. Duvara bağlı balkonun genişliği,
// başarılı zıplama bölgesi tam `zone` px olacak şekilde hesaplanır.
export function makePlatform(prev, i, rng) {
  const Dn = diff(i);
  const safe = i % CFG.safeEvery === 0;
  const m = CFG.charW * 0.3, ov = 8;

  let side;
  if (!safe && prev.side !== 'M' && i > 1 && rng() < Dn.gondolaChance) side = 'M';
  else if (prev.side === 'L') side = 'R';
  else if (prev.side === 'R') side = 'L';
  else side = rng() < 0.5 ? 'L' : 'R';

  let dir;
  if (side === 'R') dir = 1;
  else if (side === 'L') dir = -1;
  else dir = prev.side === 'L' ? 1 : prev.side === 'R' ? -1 : (rng() < 0.5 ? 1 : -1);

  const [lo, hi] = sweep(prev);
  // iniş aralığı (karşı duvar hesaba katılmadan)
  const a = Math.max(lo + m, X_MIN) + dir * JUMP_D, b = Math.min(hi - m, X_MAX) + dir * JUMP_D;
  const zone = Dn.zone * (safe ? 1.6 : 1) * (0.85 + rng() * 0.3);
  const p = { i, Y: i * CFG.gap, side, dir, safe, amp: 0, omega: 0, phase: 0 };

  if (side === 'R') {
    let w = clamp(WR - (b - zone), CFG.minWidth, CFG.maxWidth);
    w = Math.max(w, WR - Math.min(b, X_MAX) + ov);
    p.w = w; p.base = WR - w / 2;
  } else if (side === 'L') {
    let w = clamp((a + zone) - WL, CFG.minWidth, CFG.maxWidth);
    w = Math.max(w, Math.max(a, X_MIN) - WL + ov);
    p.w = w; p.base = WL + w / 2;
  } else {
    const w = Dn.gondolaWidth;
    const la = clamp(a, X_MIN, X_MAX), lb = clamp(b, X_MIN, X_MAX);
    const edge = WL + w / 2 + 8, edgeR = WR - w / 2 - 8;
    const cmin = Math.max(la, edge), cmax = Math.min(lb, edgeR);
    const c = cmin <= cmax ? cmin + rng() * (cmax - cmin) : clamp((la + lb) / 2, edge, edgeR);
    const maxAmp = Math.min(c - edge, edgeR - c, 90);
    p.w = w; p.base = c;
    if (maxAmp > 15) {
      p.amp = 15 + rng() * (maxAmp - 15);
      p.omega = Dn.gondolaSpeed * (0.8 + rng() * 0.4);
      p.phase = rng() * Math.PI * 2;
    }
  }
  p.x = p.base;
  p.minC = p.base - p.amp; p.maxC = p.base + p.amp;
  return p;
}
