// ------------------------------------------------------------------
// Anonim test verisi
// posthogKey boşken hiçbir şey gönderilmez; özet yalnızca cihazda tutulur
// (menüde başlığa 5 kez dokununca görünür). Kişisel bilgi toplanmaz.
// ------------------------------------------------------------------
import { store } from './storage.js';

export const ANALYTICS = {
  posthogKey: 'phc_usRMsECwAcaSBCcmqEiCxc3kXTcvdGExyjbo5qzE3Uds', // herkese açık proje anahtarı (yalnızca veri gönderir)
  host: 'https://eu.i.posthog.com',
  build: 'proto-4', // proto-4: yumuşak zorluk eğrisi + iniş işareti
};

let id = store.get('anonId', null);
if (!id) {
  id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  store.set('anonId', id);
}
const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let queue = [];
export const localStats = store.get('localStats', { runs: 0, saved: 0, fell: 0, totalSec: 0, floors: [], decisions: { save: 0, continue: 0, timeout: 0 }, quickReplays: 0 });

export function track(event, props = {}) {
  queue.push({
    event,
    properties: { distinct_id: id, $session_id: sessionId, $process_person_profile: false, build: ANALYTICS.build, ...props },
    timestamp: new Date().toISOString(),
  });
  if (queue.length > 200) queue.shift();
}

export function flush() {
  if (!ANALYTICS.posthogKey) { queue = []; return; }
  if (!queue.length) return;
  const body = JSON.stringify({ api_key: ANALYTICS.posthogKey, batch: queue });
  queue = [];
  try {
    fetch(ANALYTICS.host + '/batch/', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  } catch (e) {}
}

function saveLocal() { store.set('localStats', localStats); }

// ------------------------------------------------------------------
// Oyun olaylarını ölçümlere çevirir. Oyun saati değil duvar saati kullanılır
// (karar ekranında geçen süre de tur süresine dahil).
// ------------------------------------------------------------------
export function attachTelemetry(game, progress) {
  const run = { index: 0, startT: 0, firstJumpSec: null, decisionT: 0, resultT: 0 };
  const now = () => performance.now();

  game.on('start', () => {
    const sinceResult = run.resultT ? (now() - run.resultT) / 1000 : null;
    if (sinceResult != null && sinceResult < 10) { localStats.quickReplays++; saveLocal(); }
    Object.assign(run, { index: run.index + 1, startT: now(), firstJumpSec: null });
    track('run_start', {
      run_index: run.index,
      since_last_result_sec: sinceResult == null ? null : Math.round(sinceResult * 10) / 10,
    });
  });

  game.on('jump', () => {
    if (run.firstJumpSec == null) run.firstJumpSec = Math.round((now() - run.startT) / 100) / 10;
  });

  game.on('safe', () => { run.decisionT = now(); });

  game.on('decision', ({ choice, floor, score }) => {
    track('safe_decision', {
      run_index: run.index, floor, choice, run_score: score,
      decision_ms: Math.round(now() - run.decisionT),
    });
    localStats.decisions[choice]++;
    saveLocal();
  });

  // progress.record() bu dinleyiciden sonra çağrılmalı: best_floor_before önceki rekoru ister
  game.on('end', r => {
    const data = {
      run_index: run.index,
      outcome: r.saved ? 'saved' : 'fell',
      floor: r.floor,
      score: r.score,
      duration_sec: Math.round((now() - run.startT) / 100) / 10,
      jumps: r.jumps,
      first_jump_sec: run.firstJumpSec,
      near_misses: r.nearMisses,
      fell_from_side: r.fellFromSide,
      best_floor_before: progress.highestFloor,
      new_floor_record: r.floor > progress.highestFloor,
    };
    track('run_end', data);
    flush();
    localStats.runs++;
    localStats[data.outcome]++;
    localStats.totalSec += data.duration_sec;
    localStats.floors.push(data.floor);
    if (localStats.floors.length > 300) localStats.floors.shift();
    saveLocal();
    run.resultT = now();
  });

  return {
    get runIndex() { return run.index; },
  };
}
