// ------------------------------------------------------------------
// Giriş noktası: oyunu, çizimi, sesi, arayüzü ve ölçümleri birbirine bağlar.
// Modüller birbirini tanımaz; hepsi oyunun olaylarını dinler.
// ------------------------------------------------------------------
import { STEP } from './config.js';
import { Game, S } from './game.js';
import { progress } from './storage.js';
import { createRenderer } from './renderer.js';
import { initAudio, toggleMute, sfx, vibrate } from './audio.js';
import { track, flush, attachTelemetry } from './analytics.js';
import * as ui from './ui.js';

const stage = document.getElementById('stage');
const game = new Game();
const view = createRenderer(stage, document.getElementById('c'));
// ?debug ile açılınca konsoldan erişim: kk.game.wouldLand(), kk.game.cur ...
if (new URLSearchParams(location.search).has('debug')) window.kk = { game };
view.resize();
window.addEventListener('resize', view.resize);

// Sıra önemli: ölçümler rekor güncellenmeden önce eski rekoru okur
const telemetry = attachTelemetry(game, progress);
view.bind(game);

game
  .on('jump', () => sfx.jump())
  .on('bonk', () => sfx.bonk())
  .on('land', e => {
    if (e.near) sfx.nearMiss();
    sfx.land(e.floor);
    vibrate(12);
  })
  .on('safe', e => {
    sfx.safe();
    vibrate([30, 40, 30]);
    ui.showDecision(e);
  })
  .on('decision', e => { if (e.choice !== 'save') ui.show(null); })
  .on('fall', () => { sfx.fall(); vibrate(200); })
  .on('end', run => {
    lastReached = run.floor;
    const badges = progress.record(run);
    ui.showResult(run, badges, progress);
    if (run.saved) sfx.saved();
    if (badges.length) sfx.record();
  });

let lastReached = 0;

function startRun() {
  initAudio();
  game.start();
  ui.show(null);
}

// ---------------------------------------------------------------- girdiler
const $ = id => document.getElementById(id);
$('btnStart').onclick = startRun;
$('btnAgain').onclick = startRun;
$('btnSave').onclick = () => game.save();
$('btnCont').onclick = () => game.continueRun('continue');
$('btnResume').onclick = () => {
  if (!game.resume()) return;
  ui.show(game.state === S.DECISION ? 'decision' : null);
  last = performance.now();
};
$('btnShare').onclick = () => {
  track('share_click', { floor: lastReached, native_share: !!navigator.share });
  flush();
  ui.share(lastReached);
};

stage.addEventListener('pointerdown', e => { e.preventDefault(); game.jump(); });
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); game.jump(); }
  if (e.code === 'KeyM') toggleMute();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (game.pause()) {
    ui.show('paused');
    track('app_hidden', { run_index: telemetry.runIndex, floor: game.cur });
  }
  flush();
});
window.addEventListener('pagehide', flush);

// ---------------------------------------------------------------- ana döngü
ui.refreshMenu(progress);
track('session_start', {
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  touch: 'ontouchstart' in window,
  standalone: window.matchMedia('(display-mode: standalone)').matches,
  returning: progress.highestFloor > 0,
});

// Sabit adımlı simülasyon: kare hızı ne olursa olsun fizik aynı kalır
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!stage.style.width) view.resize();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= STEP) { game.update(STEP); acc -= STEP; }
  if (game.state === S.DECISION) ui.setDecisionTimer(ui.decisionTimeFraction(game));
  view.update(dt, game);
  view.draw(game, progress);
}
requestAnimationFrame(frame);
