// Çalıştır: npm test  (ya da: node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CFG, STEP } from '../src/config.js';
import { Game, S } from '../src/game.js';
import { makePlatform, groundPlatform } from '../src/level.js';
import { mulberry32 } from '../src/util.js';

// Kusursuz oyuncu: zıplasa ineceği ilk anda zıplar, güvenli katta hep devam eder.
function playBot(seed, targetFloor, maxSecPerFloor = 20) {
  const g = new Game();
  g.start(seed);
  let stuck = 0, floor = 0;
  while (g.cur < targetFloor) {
    if (g.state === S.DECISION) g.continueRun();
    else if (g.state !== S.PLAY) break;
    else if (g.ch.standing && g.wouldLand()) g.jump();
    g.update(STEP);
    if (g.cur !== floor) { floor = g.cur; stuck = 0; }
    else if ((stuck += STEP) > maxSecPerFloor) break;
  }
  return g;
}

test('aynı tohum aynı binayı üretir', () => {
  const a = new Game(), b = new Game();
  a.start(42); b.start(42);
  assert.deepEqual(a.plats, b.plats);
});

test('her kat bir öncekinden ulaşılabilir (300 tohum × 150 kat)', () => {
  const failures = [];
  for (let seed = 1; seed <= 300; seed++) {
    const g = playBot(seed, 150);
    if (g.cur < 150) failures.push({ seed, floor: g.cur, next: g.next?.side, state: g.state });
  }
  assert.deepEqual(failures, []);
});

test('güvenli katlar her 5 katta bir ve hareketsiz', () => {
  const rng = mulberry32(7);
  let prev = groundPlatform();
  for (let i = 1; i <= 100; i++) {
    const p = makePlatform(prev, i, rng);
    assert.equal(p.safe, i % CFG.safeEvery === 0);
    if (p.safe) assert.notEqual(p.side, 'M');
    prev = p;
  }
});

test('güvenli katta karar: kaydet turu bitirir, süre dolunca devam eder', () => {
  const ends = [], decisions = [];
  const g = new Game().on('end', r => ends.push(r)).on('decision', d => decisions.push(d.choice));
  g.start(3);
  while (g.state !== S.DECISION) {
    if (g.ch.standing && g.wouldLand()) g.jump();
    g.update(STEP);
  }
  assert.equal(g.cur, CFG.safeEvery);
  for (let t = 0; t < CFG.decisionTime + 0.1; t += STEP) g.update(STEP);
  assert.equal(g.state, S.PLAY);
  assert.deepEqual(decisions, ['timeout']);

  // bir sonraki güvenli kata çık ve kaydet
  while (g.state !== S.DECISION) {
    if (g.ch.standing && g.wouldLand()) g.jump();
    g.update(STEP);
  }
  g.save();
  assert.equal(g.state, S.RESULT);
  assert.equal(ends.length, 1);
  assert.equal(ends[0].saved, true);
  assert.equal(ends[0].floor, CFG.safeEvery * 2);
});

test('yanlış anda zıplayınca düşülür ve puan kaybedilir', () => {
  const ends = [];
  const g = new Game().on('end', r => ends.push(r));
  g.start(11);
  // ilk katın iniş penceresinin dışında bir an bul
  while (g.wouldLand()) g.update(STEP);
  g.jump();
  for (let t = 0; t < 3; t += STEP) g.update(STEP);
  assert.equal(ends.length, 1);
  assert.equal(ends[0].saved, false);
  assert.equal(ends[0].floor, 0);
});

test('çarpan her inişte 0.1 artar', () => {
  const g = playBot(5, 4);
  assert.equal(g.cur, 4);
  assert.equal(g.multiplier, 1.4);
  assert.equal(g.score, 100 + 110 + 120 + 130);
});
