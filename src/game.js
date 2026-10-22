// ------------------------------------------------------------------
// Oyun simülasyonu: DOM, ses, çizim ve saat bilgisi yok.
// Aynı tohum (seed) ve aynı girdilerle her yerde aynı sonucu verir; bu sayede
// testlerde başsız (headless) çalıştırılabilir. Dış dünyaya olaylarla konuşur.
//
// Olaylar: start, jump, bonk, land, safe, decision, fall, end
// ------------------------------------------------------------------
import { CFG, STEP, X_MIN, X_MAX, diff } from './config.js';
import { mulberry32, randomSeed, clamp } from './util.js';
import { groundPlatform, makePlatform, platX } from './level.js';

export const S = {
  MENU: 'ANA_MENU',
  PLAY: 'OYUN',
  DECISION: 'GUVENLI_KAT_KARARI',
  FALLING: 'DUSME',
  RESULT: 'SONUC',
  PAUSED: 'DURAKLATILDI',
};

// Havadaki gövdeyi bir adım ilerletir. Duvara çarparsa true döner.
function airStep(b, dt) {
  b.vy -= CFG.gravity * dt;
  b.x += b.vx * dt;
  b.Y += b.vy * dt;
  // binaların cepheleri: çarpınca duvarda kalır ve aşağı kayar
  if ((b.x < X_MIN && b.vx <= 0) || (b.x > X_MAX && b.vx >= 0)) {
    b.x = clamp(b.x, X_MIN, X_MAX);
    if (b.vx !== 0) { b.vx = 0; return true; }
  }
  return false;
}

function landsOn(q, qx, prevY, b) {
  return b.vy < 0 && prevY >= q.Y && b.Y <= q.Y && Math.abs(b.x - qx) <= q.w / 2 + CFG.landTolerance;
}

export class Game {
  constructor() {
    this.listeners = {};
    this.state = S.MENU;
    this.pausedFrom = null;
    this.reset();
  }

  on(type, fn) { (this.listeners[type] ||= []).push(fn); return this; }
  emit(type, data) { for (const fn of this.listeners[type] || []) fn(data); }

  reset(seed = randomSeed()) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.plats = [groundPlatform()];
    this.extend(CFG.lookAhead);
    this.cur = 0;
    this.ch = { x: this.plats[0].x, Y: 0, vx: 0, vy: 0, dir: 1, face: 1, relX: 0, standing: true, walk: diff(0).walk };
    this.t = 0;
    this.score = 0;
    this.multiplier = 1;
    this.fallTimer = 0;
    this.decisionLeft = 0;
    this.jumps = 0;
    this.nearMisses = 0;
  }

  start(seed) {
    this.reset(seed);
    this.state = S.PLAY;
    this.emit('start', { seed: this.seed });
  }

  plat(i) { return this.plats.find(p => p.i === i); }
  get current() { return this.plat(this.cur); }
  get next() { return this.plat(this.cur + 1); }

  extend(upTo) {
    while (this.plats[this.plats.length - 1].i < upTo) {
      const prev = this.plats[this.plats.length - 1];
      this.plats.push(makePlatform(prev, prev.i + 1, this.rng));
    }
  }

  // ---------------------------------------------------------------- girdiler
  jump() {
    if (this.state !== S.PLAY || !this.ch.standing) return false;
    const q = this.next, ch = this.ch;
    ch.standing = false;
    ch.vx = q.dir * CFG.jumpVX;
    ch.vy = CFG.jumpV;
    ch.face = q.dir;
    this.jumps++;
    this.emit('jump', { dir: q.dir });
    return true;
  }

  save() {
    if (this.state !== S.DECISION) return false;
    this.emit('decision', { choice: 'save', floor: this.cur, score: this.score });
    this.end(true);
    return true;
  }

  continueRun(choice = 'continue') {
    if (this.state !== S.DECISION) return false;
    this.emit('decision', { choice, floor: this.cur, score: this.score });
    this.state = S.PLAY;
    return true;
  }

  pause() {
    if (this.state !== S.PLAY && this.state !== S.DECISION) return false;
    this.pausedFrom = this.state;
    this.state = S.PAUSED;
    return true;
  }

  resume() {
    if (this.state !== S.PAUSED) return false;
    this.state = this.pausedFrom;
    return true;
  }

  // ---------------------------------------------------------------- zaman
  // Sabit adımla (STEP) çağrılmalı; bkz. main.js
  update(dt = STEP) {
    if (this.state === S.PLAY || this.state === S.FALLING) this.step(dt);
    if (this.state === S.FALLING) {
      this.fallTimer -= dt;
      if (this.fallTimer <= 0) this.end(false);
    } else if (this.state === S.DECISION) {
      this.decisionLeft -= dt;
      if (this.decisionLeft <= 0) this.continueRun('timeout');
    }
  }

  step(dt) {
    this.t += dt;
    for (const p of this.plats) if (p.amp) p.x = platX(p, this.t);
    const ch = this.ch;

    if (ch.standing) {
      const p = this.current;
      const lim = p.w / 2 - CFG.charW * 0.3;
      ch.relX += ch.dir * ch.walk * dt;
      if (ch.relX > lim) { ch.relX = lim; ch.dir = -1; }
      if (ch.relX < -lim) { ch.relX = -lim; ch.dir = 1; }
      // duvara bitişik balkonda karakter duvarın içine girmesin
      if (p.x + ch.relX < X_MIN) { ch.relX = X_MIN - p.x; ch.dir = 1; }
      if (p.x + ch.relX > X_MAX) { ch.relX = X_MAX - p.x; ch.dir = -1; }
      ch.x = p.x + ch.relX;
      ch.Y = p.Y;
      ch.face = ch.dir;
      return;
    }

    const prevY = ch.Y;
    if (airStep(ch, dt) && this.state === S.PLAY) this.emit('bonk');
    if (this.state !== S.PLAY) return;

    const q = this.next;
    if (q && landsOn(q, q.x, prevY, ch)) { this.land(q); return; }
    if (ch.Y < this.current.Y - 40) {
      this.state = S.FALLING;
      this.fallTimer = CFG.fallTime;
      this.emit('fall', { floor: this.cur, side: q?.side ?? null });
    }
  }

  land(p) {
    const ch = this.ch;
    ch.standing = true;
    ch.Y = p.Y; ch.vy = 0; ch.vx = 0;
    const lim = p.w / 2 - CFG.charW * 0.3;
    ch.relX = clamp(ch.x - p.x, -lim, lim);
    // balkonda dışa (boşluğa) doğru değil, duvara doğru yürümeye başla
    ch.dir = p.side === 'L' ? -1 : p.side === 'R' ? 1 : ch.face;
    this.cur = p.i;

    const gained = Math.round(CFG.pointBase * this.multiplier);
    this.score += gained;
    this.multiplier = Math.round((this.multiplier + CFG.multStep) * 10) / 10;
    ch.walk = diff(this.cur).walk;

    // boşluğa bakan kenara çok yakın iniş = kıl payı
    const inner = p.side === 'L' ? p.x + p.w / 2 : p.side === 'R' ? p.x - p.w / 2 : null;
    const near = inner == null
      ? Math.abs(ch.x - p.x) > p.w / 2 - 5
      : Math.abs(ch.x - inner) < 6;
    if (near) this.nearMisses++;

    this.extend(this.cur + CFG.lookAhead);
    while (this.plats[0].i < this.cur - 4) this.plats.shift();

    this.emit('land', { floor: this.cur, gained, near, x: ch.x, Y: ch.Y });

    if (p.safe) {
      this.state = S.DECISION;
      this.decisionLeft = CFG.decisionTime;
      this.emit('safe', { floor: this.cur, score: this.score, multiplier: this.multiplier });
    }
  }

  end(saved) {
    this.state = S.RESULT;
    this.emit('end', {
      saved,
      floor: this.cur,
      score: this.score,
      jumps: this.jumps,
      nearMisses: this.nearMisses,
      fellFromSide: saved ? null : this.next?.side ?? null,
    });
  }

  // ---------------------------------------------------------------- tahmin
  // "Şimdi zıplasam nereye inerim?" Durumu değiştirmeden aynı fizikle hesaplar.
  // { hit, x }: hit iniş başarılı mı, x karakterin üst kat hizasına geldiği nokta.
  // İniş işareti ve testlerdeki bot bunu kullanır.
  predictJump(dt = STEP) {
    if (!this.ch.standing) return null;
    const q = this.next;
    const b = { x: this.ch.x, Y: this.ch.Y, vx: q.dir * CFG.jumpVX, vy: CFG.jumpV };
    const floorY = this.current.Y;
    let crossX = null;
    for (let t = this.t; b.Y >= floorY - 40;) {
      t += dt;
      const prevY = b.Y;
      airStep(b, dt);
      if (landsOn(q, platX(q, t), prevY, b)) return { hit: true, x: b.x };
      if (crossX == null && b.vy < 0 && prevY >= q.Y && b.Y <= q.Y) crossX = b.x;
    }
    return { hit: false, x: crossX };
  }

  wouldLand(dt = STEP) { return this.predictJump(dt)?.hit ?? false; }
}
