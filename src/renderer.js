// ------------------------------------------------------------------
// Çizim: çizgi (line-art) stili, kâğıt zemin, tek renk mürekkep, az vurgu rengi.
// Oyunun durumunu yalnızca okur. Kamera, parçacık, yazı ve sarsıntı gibi
// salt görsel durum burada tutulur; simülasyonu etkilemez.
// ------------------------------------------------------------------
import { CFG, W, WL, WR, guideAlpha } from './config.js';
import { clamp, lerp } from './util.js';
import { S } from './game.js';

// Uzaya 100. katlarda varılır: "yüzleri görmek" bir dönüm noktası olsun
const SKY = [
  { f: 0,   top: [243, 239, 230], bot: [236, 230, 218] },  // kâğıt
  { f: 20,  top: [222, 233, 243], bot: [243, 238, 228] },  // açık gökyüzü
  { f: 45,  top: [246, 214, 190], bot: [244, 229, 207] },  // gün batımı
  { f: 70,  top: [28, 33, 56],    bot: [44, 46, 74] },     // gece
  { f: 100, top: [6, 6, 14],      bot: [18, 20, 40] },     // uzay
];
const INK_DARK = '#1f1d1a', INK_LIGHT = '#ece8de';
const ACCENT = '#ff6a2b', SAFE = '#1f9d5a';

function palette(f) {
  let a = SKY[SKY.length - 1], b = a;
  for (let k = 0; k < SKY.length - 1; k++) if (f < SKY[k + 1].f) { a = SKY[k]; b = SKY[k + 1]; break; }
  const t = a === b ? 0 : clamp((f - a.f) / (b.f - a.f), 0, 1);
  const top = a.top.map((v, i) => lerp(v, b.top[i], t));
  const bot = a.bot.map((v, i) => lerp(v, b.bot[i], t));
  const lum = (top[0] * 0.3 + top[1] * 0.59 + top[2] * 0.11) / 255;
  const css = c => `rgb(${c.map(Math.round).join(',')})`;
  return { top: css(top), bot: css(bot), ink: lum > 0.45 ? INK_DARK : INK_LIGHT };
}

export function createRenderer(stage, cv) {
  const ctx = cv.getContext('2d');
  let H = 640, scale = 1, dpr = 1;
  let ink = INK_DARK;

  // salt görsel durum
  const fx = { camY: 0, squash: 0, phase: 0, shake: 0, popups: [], particles: [] };

  // Ekran ölçekleme: genişlik sabit 360, yükseklik ekrana göre
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const sw = Math.min(vw, vh * 0.62), sh = vh;
    if (!(sw > 0 && sh > 0)) return; // görünmez pencerede ölçü gelmeyebilir
    stage.style.width = sw + 'px';
    stage.style.height = sh + 'px';
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(sw * dpr);
    cv.height = Math.round(sh * dpr);
    scale = sw / W;
    H = sh / scale;
  }

  // ---------------------------------------------------------------- tepkiler
  function addPopup(text, x, Y, color) { fx.popups.push({ text, x, Y, color, life: 0.9 }); }

  function bind(game) {
    game.on('start', () => Object.assign(fx, { camY: 0, squash: 0, shake: 0, popups: [], particles: [] }));
    game.on('jump', () => { fx.squash = -0.6; });
    game.on('land', e => {
      fx.squash = 1;
      addPopup('+' + e.gained, e.x, e.Y + 52, 'ink');
      if (e.near) { addPopup('KIL PAYI!', e.x, e.Y + 78, 'accent'); fx.shake = 6; }
      for (let k = 0; k < 6; k++) {
        fx.particles.push({ x: e.x, Y: e.Y, vx: (Math.random() - 0.5) * 160, vy: Math.random() * 120, life: 0.35 });
      }
    });
    game.on('fall', () => { fx.shake = 10; });
  }

  function update(dt, game) {
    fx.squash *= Math.pow(0.0005, dt);
    fx.shake = Math.max(0, fx.shake - dt * 30);
    for (const pp of fx.popups) { pp.Y += 40 * dt; pp.life -= dt; }
    fx.popups = fx.popups.filter(pp => pp.life > 0);
    for (const pa of fx.particles) { pa.x += pa.vx * dt; pa.Y += pa.vy * dt; pa.vy -= 600 * dt; pa.life -= dt; }
    fx.particles = fx.particles.filter(pa => pa.life > 0);

    if (game.state === S.PLAY || game.state === S.DECISION) {
      fx.camY += (game.current.Y - fx.camY) * Math.min(1, dt * 6);
    }
    if (game.state === S.PLAY && game.ch.standing) fx.phase += game.ch.walk * dt * 0.11;
  }

  // ---------------------------------------------------------------- çizim
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  function draw(game, progress) {
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const camY = fx.camY;
    const anchor = H * 0.66;
    const jx = fx.shake ? (Math.random() - 0.5) * fx.shake : 0;
    const jy = fx.shake ? (Math.random() - 0.5) * fx.shake : 0;
    const sy = Y => anchor - (Y - camY) + jy;
    const camFloor = camY / CFG.gap;
    const pal = palette(camFloor);
    ink = pal.ink;

    // gökyüzü
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.top); g.addColorStop(1, pal.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(jx, 0);
    drawBackdrop(camFloor, anchor);
    drawBuildings(sy);

    // sokak
    const gy = sy(0);
    if (gy < H + 10) {
      ctx.strokeStyle = ink; ctx.lineWidth = 2;
      line(0, gy, W, gy);
      ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;
      ctx.setLineDash([14, 12]); line(WL + 10, gy + 34, WR - 10, gy + 34); ctx.setLineDash([]);
      line(0, gy + 10, W, gy + 10);
      ctx.globalAlpha = 1;
    }

    for (const p of game.plats) {
      if (p.side === 'G') continue;
      const y = sy(p.Y);
      if (y < -40 || y > H + 40) continue;
      drawPlatform(p, y);
    }

    drawGuide(game, sy);

    ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    for (const pa of fx.particles) {
      const y = sy(pa.Y);
      line(pa.x, y, pa.x - pa.vx * 0.03, y + pa.vy * 0.03);
    }

    drawChar(game, game.ch.x, sy(game.ch.Y));

    ctx.textAlign = 'center';
    for (const pp of fx.popups) {
      ctx.globalAlpha = Math.min(1, pp.life * 2);
      ctx.font = '800 17px system-ui';
      ctx.fillStyle = pp.color === 'accent' ? ACCENT : ink;
      ctx.fillText(pp.text, pp.x, sy(pp.Y));
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (game.state !== S.MENU) drawHUD(game, progress);
  }

  // İniş işareti: "şimdi zıplarsan buraya inersin". Tutuyorsa yeşil, tutmuyorsa soluk.
  // Yükseldikçe silikleşir (bkz. guideAlpha).
  function drawGuide(game, sy) {
    if (game.state !== S.PLAY || !game.ch.standing) return;
    const pred = game.predictJump();
    if (!pred || pred.x == null) return;
    const y = sy(game.next.Y);
    ctx.globalAlpha = guideAlpha(game.cur + 1) * (pred.hit ? 1 : 0.45);
    ctx.strokeStyle = ctx.fillStyle = pred.hit ? SAFE : ink;
    ctx.lineWidth = 2;
    // aşağı bakan küçük ok ve zemine nokta
    line(pred.x, y - 26, pred.x, y - 12);
    line(pred.x - 5, y - 17, pred.x, y - 11); line(pred.x + 5, y - 17, pred.x, y - 11);
    ctx.beginPath(); ctx.arc(pred.x, y - 3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Uzaktaki şehir silüeti, bulutlar ve yıldızlar: hepsi ince çizgi
  function drawBackdrop(camFloor, anchor) {
    const camY = fx.camY;
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
    // silüet: yavaş kayan (parallax) arka plan
    const base = anchor + camY * 0.3;
    if (base - 260 < H) {
      ctx.globalAlpha = 0.18;
      const hs = [120, 190, 90, 240, 150, 200, 110];
      for (let k = 0; k < hs.length; k++) {
        const x = WL + 6 + k * 40, h = hs[k];
        ctx.strokeRect(x, base - h, 32, h);
        for (let yy = base - h + 14; yy < base - 10; yy += 18) line(x + 8, yy, x + 24, yy);
      }
      ctx.globalAlpha = 1;
    }
    // bulutlar
    if (camFloor > 10 && camFloor < 75) {
      ctx.globalAlpha = 0.22 * Math.min(1, (camFloor - 10) / 6) * Math.min(1, (75 - camFloor) / 6);
      for (let k = 0; k < 6; k++) {
        const x = WL + 20 + ((k * 83) % 230);
        const y = ((k * 157 + camY * 0.5) % (H + 80)) - 40;
        ctx.beginPath();
        ctx.arc(x, y, 10, Math.PI, 0); ctx.arc(x + 16, y - 4, 13, Math.PI, 0); ctx.arc(x + 34, y, 9, Math.PI, 0);
        ctx.lineTo(x - 10, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // yıldızlar
    if (camFloor > 60) {
      ctx.globalAlpha = Math.min(1, (camFloor - 60) / 15);
      ctx.lineWidth = 1;
      for (let k = 0; k < 30; k++) {
        const x = WL + ((k * 97.3) % (WR - WL)), y = (k * 211.7 + camY * 0.1) % H;
        const s = k % 3 === 0 ? 3 : 1.5;
        line(x - s, y, x + s, y); line(x, y - s, x, y + s);
      }
      ctx.globalAlpha = 1;
    }
  }

  // İki bina: ekran kenarlarındaki şeritler; kat çizgileri ve pencere kenarları
  function drawBuildings(sy) {
    const camY = fx.camY;
    const groundY = sy(0);
    const top = 0, bottom = Math.min(H, groundY);
    ctx.fillStyle = ink === INK_DARK ? 'rgba(31,29,26,.05)' : 'rgba(236,232,222,.06)';
    ctx.fillRect(0, top, WL, bottom - top);
    ctx.fillRect(WR, top, W - WR, bottom - top);
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    line(WL, top, WL, bottom);
    line(WR, top, WR, bottom);

    ctx.lineWidth = 1.2;
    const lo = Math.floor((camY - H) / CFG.gap) - 1, hi = Math.ceil((camY + H) / CFG.gap) + 1;
    for (let i = Math.max(0, lo); i <= hi; i++) {
      const y = sy(i * CFG.gap);
      if (y < -CFG.gap || y > bottom + CFG.gap) continue;
      ctx.globalAlpha = 0.35;
      line(0, y + 0.5, WL, y + 0.5);
      line(WR, y + 0.5, W, y + 0.5);
      // pencereler (kat arasında)
      const wy = y - CFG.gap + 38, wh = 52;
      if (wy + wh < bottom) {
        ctx.strokeRect(8, wy, 22, wh);
        line(19, wy, 19, wy + wh);
        ctx.strokeRect(W - 30, wy, 22, wh);
        line(W - 19, wy, W - 19, wy + wh);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawPlatform(p, y) {
    const l = p.x - p.w / 2, r = p.x + p.w / 2;
    const col = p.safe ? SAFE : ink;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineWidth = 2;

    if (p.side === 'M') {
      // cam silme iskelesi: iki halat, korkuluk, döşeme
      ctx.lineWidth = 1.2; ctx.globalAlpha = 0.7;
      line(l + 4, y - 20, l + 4, -10); line(r - 4, y - 20, r - 4, -10);
      ctx.globalAlpha = 1; ctx.lineWidth = 2;
      ctx.strokeRect(l, y, p.w, 6);
      line(l, y - 20, r, y - 20);
      line(l, y - 20, l, y); line(r, y - 20, r, y);
      ctx.lineWidth = 1.2;
      line(l, y - 10, r, y - 10);
      // hareket işareti
      ctx.globalAlpha = 0.5;
      line(p.x - 6, y + 12, p.x + 6, y + 12);
      line(p.x - 6, y + 12, p.x - 3, y + 9); line(p.x - 6, y + 12, p.x - 3, y + 15);
      line(p.x + 6, y + 12, p.x + 3, y + 9); line(p.x + 6, y + 12, p.x + 3, y + 15);
      ctx.globalAlpha = 1;
      return;
    }

    const wallX = p.side === 'L' ? WL : WR, tipX = p.side === 'L' ? r : l, s = p.side === 'L' ? 1 : -1;
    // döşeme
    ctx.strokeRect(Math.min(wallX, tipX), y, p.w, 5);
    // destek dirseği
    ctx.lineWidth = 1.2;
    line(wallX, y + 18, wallX + s * Math.min(26, p.w * 0.4), y + 5);
    ctx.lineWidth = 2;
    if (p.w >= 58 || p.safe) {
      // korkuluk
      line(wallX, y - 18, tipX, y - 18);
      line(tipX, y - 18, tipX, y);
      ctx.lineWidth = 1.2;
      for (let x = wallX + s * 9; s > 0 ? x < tipX - 3 : x > tipX + 3; x += s * 9) line(x, y - 18, x, y);
    } else {
      // dar pencere çıkıntısı: korkuluksuz, küçük saksı
      ctx.lineWidth = 1.2;
      const px = wallX + s * 12;
      ctx.beginPath(); ctx.moveTo(px - 5, y - 9); ctx.lineTo(px + 5, y - 9); ctx.lineTo(px + 3, y); ctx.lineTo(px - 3, y); ctx.closePath(); ctx.stroke();
      line(px, y - 9, px - 3, y - 15); line(px, y - 9, px + 2, y - 16);
    }
    if (p.safe) {
      // ÇIKIŞ tabelası ve açık pencere
      ctx.lineWidth = 1.5;
      const dx = wallX + s * 4;
      ctx.strokeRect(Math.min(dx, dx + s * 34), y - 56, 34, 15);
      ctx.font = '800 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('ÇIKIŞ', dx + s * 17, y - 45);
      line(dx + s * 17, y - 41, dx + s * 17, y - 22);
    }
  }

  // Çöp adam
  function drawChar(game, x, y) {
    const ch = game.ch;
    let sxs = 1, sys = 1;
    if (fx.squash > 0) { sxs = 1 + 0.25 * fx.squash; sys = 1 - 0.25 * fx.squash; }
    else if (!ch.standing) { sys = 1.06; }
    const f = ch.face;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sxs, sys);
    ctx.strokeStyle = ink; ctx.lineWidth = 2.2;

    const hipY = -13, shY = -24, headY = -31;
    let lf, rf, la, ra;
    if (game.state === S.FALLING) {
      const t = performance.now() / 70;
      lf = [-6, -2 + Math.sin(t) * 3]; rf = [6, -2 - Math.sin(t) * 3];
      la = [-9, shY - 9 + Math.cos(t) * 4]; ra = [9, shY - 9 - Math.cos(t) * 4];
    } else if (!ch.standing) {
      lf = [-f * 5, -5]; rf = [f * 5, -2];
      la = [f * 9, shY - 8]; ra = [-f * 6, shY - 10];
    } else if (game.state === S.MENU) {
      lf = [-4, 0]; rf = [4, 0]; la = [-5, shY + 9]; ra = [5, shY + 9];
    } else {
      const s = Math.sin(fx.phase);
      lf = [s * 6, -Math.max(0, Math.cos(fx.phase)) * 3]; rf = [-s * 6, -Math.max(0, -Math.cos(fx.phase)) * 3];
      la = [-s * 6, shY + 9]; ra = [s * 6, shY + 9];
    }
    // bacaklar
    line(0, hipY, lf[0], lf[1]); line(0, hipY, rf[0], rf[1]);
    // gövde
    line(0, hipY, 0, shY);
    // kollar
    line(0, shY + 1, la[0], la[1]); line(0, shY + 1, ra[0], ra[1]);
    // baş
    ctx.fillStyle = ink === INK_DARK ? '#faf7f0' : '#1c2038';
    ctx.beginPath(); ctx.arc(0, headY, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // göz
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(f * 3, headY - 0.5, 1.2, 0, Math.PI * 2); ctx.fill();
    // turuncu bere (karakterin tek rengi)
    ctx.fillStyle = ACCENT; ctx.strokeStyle = ink; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, headY - 2, 6.8, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-f * 5, headY - 8, 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawHUD(game, progress) {
    ctx.fillStyle = ink; ctx.strokeStyle = ink;
    ctx.textAlign = 'center';
    ctx.font = '900 44px system-ui'; ctx.fillText(game.cur, W / 2, 58);
    ctx.font = '700 10px system-ui'; ctx.fillText('KAT', W / 2, 72);
    // güvenli kata kalan: 5 küçük daire
    const k = game.cur % CFG.safeEvery;
    ctx.lineWidth = 1.5;
    for (let n = 0; n < CFG.safeEvery; n++) {
      const x = W / 2 - 20 + n * 10;
      ctx.beginPath(); ctx.arc(x, 84, 3, 0, Math.PI * 2);
      if (n < k) ctx.fill(); else ctx.stroke();
    }

    ctx.textAlign = 'left';
    ctx.font = '700 10px system-ui'; ctx.fillText('PUAN', 14, 26);
    ctx.font = '800 22px system-ui'; ctx.fillText(game.score, 14, 50);
    ctx.font = '600 10px system-ui'; ctx.globalAlpha = 0.65;
    ctx.fillText('Rekor ' + progress.highestFloor + '. kat', 14, 66);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'right';
    ctx.font = '700 10px system-ui'; ctx.fillText('ÇARPAN', W - 14, 26);
    ctx.font = '800 22px system-ui'; ctx.fillStyle = ACCENT; ctx.fillText('×' + game.multiplier.toFixed(1), W - 14, 50);

    if (game.jumps === 0 && game.state === S.PLAY) {
      ctx.textAlign = 'center';
      ctx.fillStyle = ink;
      ctx.font = '800 18px system-ui';
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(performance.now() / 200);
      ctx.fillText('Dokun ve zıpla!', W / 2, H * 0.42);
      ctx.globalAlpha = 1;
    }
  }

  return { resize, bind, update, draw };
}
