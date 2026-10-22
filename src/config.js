// ------------------------------------------------------------------
// Ayarlar: denge testleri için tüm sayılar burada
// ------------------------------------------------------------------
export const CFG = {
  W: 360,
  wallL: 40, wallR: 320,     // iki binanın cepheleri; aradaki boşlukta tırmanılır
  gravity: 2200,
  jumpV: 900,                // tepe yüksekliği = jumpV² / (2·gravity) ≈ 184
  jumpVX: 210,               // zıplamanın yatay hızı (her zaman karşı tarafa)
  gap: 130,                  // katlar arası dikey mesafe
  charW: 16, charH: 34,
  baseWalk: 110, maxWalk: 210,
  zoneStart: 75, zoneMin: 35, // balkonun "başarılı zıplama" bölgesinin uzunluğu (px)
  minWidth: 44, maxWidth: 150,
  gondolaWidth: 64, gondolaMinWidth: 48,
  safeEvery: 5,
  decisionTime: 3,
  pointBase: 100, multStep: 0.1,
  landTolerance: 4,          // platform kenarından bu kadar taşsa da iniş sayılır (px)
  fallTime: 1.0,             // düşme animasyonu, sonuç ekranından önce (sn)
  lookAhead: 12,             // karakterin önünde hazır tutulan platform sayısı
  // zorluk eğrileri: "ramp" büyüdükçe zorluk daha yavaş artar (kat cinsinden).
  // Hedef: ortalama oyuncu 100. katları görebilsin. Simülasyonla seçildi
  // (insan benzeri bot: ortanca ~80. kat, %20 kadarı 100+).
  walkRamp: 60,              // yürüme hızı baseWalk'tan maxWalk'a
  zoneRamp: 45,              // başarı bölgesi zoneStart'tan zoneMin'e
  gondolaFrom: 10,           // iskeleler bu kattan sonra çıkar
  gondolaStep: 0.008, gondolaMax: 0.3, // iskele olasılığı: kat başına artış, üst sınır
  // iniş işareti: üst katta "şimdi zıplarsan buraya inersin" noktası.
  // guideFullUntil katına kadar tam görünür, guideFadeTo katında guideMinAlpha'ya iner.
  guideFullUntil: 30, guideFadeTo: 90, guideMinAlpha: 0.2,
};

// Simülasyonun sabit adımı. Kare hızından bağımsız, her cihazda aynı fizik.
export const STEP = 1 / 240;

export const W = CFG.W, WL = CFG.wallL, WR = CFG.wallR;
export const X_MIN = WL + CFG.charW / 2, X_MAX = WR - CFG.charW / 2;
// Bir üst kata iniş anına kadar havada geçen süre ve bu sürede alınan yatay yol
export const AIR_T = (CFG.jumpV + Math.sqrt(CFG.jumpV ** 2 - 2 * CFG.gravity * CFG.gap)) / CFG.gravity;
export const JUMP_D = CFG.jumpVX * AIR_T;

// Kata göre zorluk: bir üst sınıra yaklaşan eğriler
export function diff(f) {
  const k = 1 - Math.exp(-f / CFG.walkRamp);
  return {
    walk: CFG.baseWalk + (CFG.maxWalk - CFG.baseWalk) * k,
    zone: CFG.zoneMin + (CFG.zoneStart - CFG.zoneMin) * Math.exp(-f / CFG.zoneRamp),
    gondolaChance: f < CFG.gondolaFrom ? 0 : Math.min(CFG.gondolaMax, 0.1 + (f - CFG.gondolaFrom) * CFG.gondolaStep),
    gondolaSpeed: 0.9 + 1.1 * k,  // rad/s
    gondolaWidth: CFG.gondolaMinWidth + (CFG.gondolaWidth - CFG.gondolaMinWidth) * (1 - k),
  };
}

// f. kata zıplarken iniş işaretinin görünürlüğü (0..1)
export function guideAlpha(f) {
  if (f <= CFG.guideFullUntil) return 1;
  const t = (f - CFG.guideFullUntil) / (CFG.guideFadeTo - CFG.guideFullUntil);
  return Math.max(CFG.guideMinAlpha, 1 - (1 - CFG.guideMinAlpha) * t);
}
