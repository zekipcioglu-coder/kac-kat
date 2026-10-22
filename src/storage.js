// ------------------------------------------------------------------
// Kayıt (cihazda). Gizli pencerede ya da engelli depolamada sessizce varsayılana döner.
// ------------------------------------------------------------------
export const store = {
  get(k, d) { try { const v = localStorage.getItem('kk_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kk_' + k, JSON.stringify(v)); } catch (e) {} },
};

// Oyuncunun rekorları
export const progress = {
  highestFloor: store.get('highestFloor', 0),
  bestSafeScore: store.get('bestSafeScore', 0),

  // Turu işler, kazanılan rozetleri döner
  record({ saved, floor, score }) {
    const badges = [];
    if (floor > this.highestFloor) {
      this.highestFloor = floor; store.set('highestFloor', floor); badges.push('YENİ KAT REKORU');
    }
    if (saved && score > this.bestSafeScore) {
      this.bestSafeScore = score; store.set('bestSafeScore', score); badges.push('EN İYİ GÜVENLİ PUAN');
    }
    return badges;
  },
};
