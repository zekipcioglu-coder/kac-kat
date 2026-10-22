# Kaç Kat? (web prototipi, arşiv)

> Bu prototip arşivlendi. Asıl ve tek proje Unity sürümü: https://github.com/zekipcioglu-coder/KacKat
> Unity'deki `WebParityTests`, bu daldaki `proto-4` sürümünün ürettiği verilerle karşılaştırır.

Derleme adımı yok. Tarayıcı modülleri doğrudan çalıştırır, GitHub Pages `main` dalını olduğu gibi yayınlar.

```bash
npm start   # http://localhost:5173  (index.html'e çift tıklamak modüller yüzünden çalışmaz)
npm test    # başsız oyun testleri, bağımlılık gerekmez
```

`?debug` ile açınca konsolda `kk.game` erişilebilir.

## Yapı

| Dosya | Görevi |
|---|---|
| `src/config.js` | Tüm denge sayıları, sabit fizik adımı, zorluk eğrisi |
| `src/level.js` | Platform üretimi (saf fonksiyon, tohumla tekrarlanabilir) |
| `src/game.js` | Simülasyon ve durum makinesi. DOM, ses ve saat yok; olay yayar |
| `src/renderer.js` | Canvas çizimi ve salt görsel durum (kamera, parçacık, sarsıntı) |
| `src/ui.js` | HTML katmanları (menü, karar, sonuç, test özeti) |
| `src/audio.js` | Ses efektleri, titreşim |
| `src/analytics.js` | PostHog kuyruğu ve oyun olaylarından ölçüm üretimi |
| `src/storage.js` | localStorage ve rekorlar |
| `src/main.js` | Hepsini oyunun olaylarına bağlar, ana döngü |

Olaylar: `start`, `jump`, `bonk`, `land`, `safe`, `decision`, `fall`, `end`.
