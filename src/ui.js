// ------------------------------------------------------------------
// Arayüz: HTML katmanları (menü, karar, sonuç, duraklatma, test özeti)
// ------------------------------------------------------------------
import { CFG } from './config.js';
import { ANALYTICS, localStats } from './analytics.js';

const $ = id => document.getElementById(id);
const overlays = ['menu', 'decision', 'result', 'paused', 'stats'];

// Katmanlara dokunmak oyunda zıplatmasın
for (const o of overlays) $(o).addEventListener('pointerdown', e => e.stopPropagation());

export function show(id) { for (const o of overlays) $(o).classList.toggle('show', o === id); }

export function refreshMenu(progress) {
  $('menuBest').textContent = progress.highestFloor
    ? `En yüksek kat ${progress.highestFloor} · En iyi güvenli puan ${progress.bestSafeScore}`
    : '';
}

export function showDecision({ floor, score, multiplier }) {
  $('decInfo').innerHTML =
    `<b>${floor}. kat</b> · <b>${score}</b> puan<br><span style="font-size:13px">Düşersen bu puanı kaybedersin.</span>`;
  $('btnCont').textContent = `DEVAM ET  ×${multiplier.toFixed(1)}`;
  setDecisionTimer(1);
  show('decision');
}

export function setDecisionTimer(fraction) {
  $('timerFill').style.width = Math.max(0, fraction * 100) + '%';
}

export function showResult(run, badges, progress) {
  const { saved, floor, score } = run;
  $('resTitle').textContent = saved ? 'Kaydedildi' : 'Düştün!';
  $('resFloor').textContent = floor;
  $('resScore').innerHTML = saved
    ? `<b style="color:var(--safe)">+${score} puan</b> güvende`
    : (score > 0 ? `<b style="color:var(--accent)">${score} puan</b> kaybedildi` : 'Puan kaydedilmedi');
  $('resBadges').innerHTML = badges.map(b => `<span class="badge">${b}</span>`).join('');
  $('resBest').textContent = `En yüksek kat ${progress.highestFloor} · En iyi güvenli puan ${progress.bestSafeScore}`;
  $('btnShare').textContent = 'PAYLAŞ';
  show('result');
}

export async function share(floor) {
  const text = `"Kaç Kat?" oyununda ${floor}. kata çıktım! Sen kaçıncı kata çıkabildin?`;
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text);
    $('btnShare').textContent = 'KOPYALANDI!';
  } catch (e) {}
}

// Gizli test özeti: menüde başlığa 5 kez dokun
function showStats() {
  const s = localStats, fl = [...s.floors].sort((a, b) => a - b);
  const median = fl.length ? fl[Math.floor(fl.length / 2)] : '-';
  $('statsBody').innerHTML = [
    ['Tur sayısı', s.runs],
    ['Kaydedip çıkan / düşen', `${s.saved} / ${s.fell}`],
    ['Ortalama tur süresi', s.runs ? (s.totalSec / s.runs).toFixed(1) + ' sn' : '-'],
    ['Ortanca kat', median],
    ['En yüksek kat', fl.length ? fl[fl.length - 1] : '-'],
    ['Karar: kaydet / devam / süre doldu', `${s.decisions.save} / ${s.decisions.continue} / ${s.decisions.timeout}`],
    ['10 sn içinde tekrar oynama', s.quickReplays],
    ['Veri gönderimi', ANALYTICS.posthogKey ? 'açık (PostHog)' : 'kapalı (yalnızca cihaz)'],
  ].map(([k, v]) => `<tr><td style="text-align:left;padding:3px 8px 3px 0">${k}</td><td style="text-align:right;font-weight:800">${v}</td></tr>`).join('');
  show('stats');
}

let titleTaps = 0, titleTapT = 0;
document.querySelector('#menu h1').addEventListener('click', () => {
  const now = performance.now();
  titleTaps = now - titleTapT < 600 ? titleTaps + 1 : 1;
  titleTapT = now;
  if (titleTaps < 5) return;
  titleTaps = 0;
  showStats();
});
$('btnStatsClose').onclick = () => show('menu');

export const decisionTimeFraction = game => game.decisionLeft / CFG.decisionTime;
