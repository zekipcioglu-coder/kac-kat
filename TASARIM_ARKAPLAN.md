# Kaç Kat? — Arka Plan Teknik Şartnamesi

Tasarımcı için. Bu belgedeki ölçülere uyan dosyalar `assets/bg/` klasörüne konduğunda oyunda kendiliğinden görünür; kod değişikliği gerekmez. Eksik dosya olursa oyun o parça için bugünkü çizgi çizimi kullanır, yani dosyalar tek tek teslim edilebilir.

Şablonlar: `assets/bg/_sablon/` (ekran, cephe karosu, açıklamalı cephe).

---

## 1. Oyunu 30 saniyede anlamak

- Ekranın iki kenarında iki bina var. Karakter aradaki boşlukta, karşılıklı balkonlara zıplayarak yukarı tırmanıyor.
- Kamera sadece **dikey** hareket eder. Yatay kaydırma yok.
- Her 5 katta bir "güvenli kat" var (yeşil balkon, ÇIKIŞ tabelası).
- Yükseldikçe gökyüzü değişir: kâğıt → açık gök → gün batımı → gece → uzay.
- Görsel dil: **kâğıt üstüne tek renk mürekkep çizgi** (line-art). Karakter bir çöp adam, tek rengi turuncu beresi.

## 2. Koordinat sistemi ve ölçek

| Kavram | Değer |
|---|---|
| Oyun genişliği | **360 birim** (her ekranda sabit) |
| Oyun yüksekliği | Ekrana göre **581 – 840 birim** |
| Görsel çözünürlüğü | **@3x: 1 birim = 3 piksel** |
| Tam ekran görsel | **1080 × 2520 px** (en uzun telefona göre) |
| Sol cephe | x = 0 – 40 birim (0 – 120 px) |
| Oyun koridoru | x = 40 – 320 birim (120 – 960 px) |
| Sağ cephe | x = 320 – 360 birim (960 – 1080 px) |
| Kat yüksekliği | **130 birim = 390 px** |
| Karakter boyu | 34 birim (102 px), genişliği 16 birim |
| Oyuncunun ekrandaki yeri | Ekran yüksekliğinin ~%66'sı (alttan üçte bir) |
| Arayüz bölgesi | Üstten 0 – 95 birim (kat no, puan, çarpan) |

Ekran yükseklikleri: tablet/masaüstü 581, 9:16 telefon 640, iPhone 14/15 ~780, 9:21 telefon 840. Önemli içeriği ekranın üst 580 birimine sığdır; altı uzun telefonlarda görünür.

## 3. Katmanlar

Arkadan öne çizim sırası:

| # | Katman | Dosya adı | Boyut (px) | Kayma hızı | Not |
|---|---|---|---|---|---|
| 0 | Gökyüzü | — (kodda renk geçişi) | — | sabit | Renkler bölüm 6'da. İstersen yeni renk kodu öner. |
| 1 | Ufuk / panorama | `ufuk.webp` | 1080 × **1800** önerilir (en fazla 2520) | kameranın 0.3'ü | Şeffaf. Uzak manzara: dağ, kale, silüet. |
| 2 | Süsleme | `suslem.webp` | 1080 × **2520** | kameranın 0.5'i | Şeffaf, **dikeyde kesintisiz tekrar**. Bulut, kuş, martı. |
| 3 | Sol cephe | `cephe_sol.webp` | **120 × 390·n** (n = 1–4 kat) | 1.0 (oyunla birlikte) | Dikeyde tekrar eder. |
| 3 | Sağ cephe | `cephe_sag.webp` | **120 × 390·n** | 1.0 | Dikeyde tekrar eder. |
| 4 | Sokak | `sokak.webp` | 1080 × **900** | 1.0 | Sadece ilk tema. Üst kenarı = zemin çizgisi. |
| 5 | Balkon, iskele, karakter | — (kodda) | — | — | Bunlar şimdilik kodla çiziliyor. |

### 3.1 Ufuk (`ufuk.webp`)
- Alt kenarı: ilk temada sokak hizasında, diğer temalarda tema başladığında ekranın altında durur.
- Kamera tırmandıkça kameranın 0.3 hızıyla **aşağı kayar**. Bir tema (~15 kat) boyunca yaklaşık 585 birim (1755 px) iner. Bu yüzden ana içeriği görselin **alt yarısına** koy, üstü şeffaf gökyüzü olsun.
- Ayrı bir gökyüzü boyama. Gökyüzü kodda; ufuk görseli onun üstüne şeffaf biner.

### 3.2 Süsleme (`suslem.webp`)
- Üst ve alt kenar birleştiğinde dikiş görünmemeli (üst 50 px'teki bir bulut alttan devam etmeli).
- Seyrek tut: bir ekranda 3–6 öğe yeterli. Koridorun ortasına (x 360–720 px) büyük öğe koyma.

### 3.3 Cephe karoları (`cephe_sol` / `cephe_sag`)
- **Karonun alt kenarı = kat çizgisi.** Balkonun döşemesi tam bu hizadadır.
- Karonun üst kenarı = bir üst katın çizgisi.
- 1 kat (390 px), 2 kat (780 px), 3 kat (1170 px) veya 4 kat (1560 px) boyunda olabilir. Uzun karo daha az tekrar görünür. Yükseklik mutlaka **390'ın katı** olmalı.
- Balkonlar cephenin **dışına**, koridor tarafına çizilir (sol cephede x = 120 px'ten sağa). Kat çizgisinin 18 birim (54 px) üstünde korkuluk, 18 birim altında dirsek var. Kapı ya da pencere açıklığını koridor kenarına, kat çizgisinin hemen üstüne koymak balkona çıkış hissi verir.
- Her katta her iki tarafta balkon olmaz (balkonlar sağ-sol sırayla gelir). Karoda balkon çizme; balkonu oyun çiziyor.
- Koridora bakan kenarda (sol cephede sağ kenar, sağ cephede sol kenar) kod 2 birimlik koyu bir duvar çizgisi çizer. Bu çizgi oyun sınırıdır, görselin üstünde kalır.
- Sağ cephe solun aynası olabilir ama farklı çizilirse daha canlı durur.
- Bir temanın ilk katı, karonun en alt katıyla başlar. Temalar arası geçişte cephe keskin değişir; ilk karoya bir saçak/korniş eklemek geçişi doğal gösterir.

### 3.4 Sokak (`sokak.webp`)
- Sadece `lefkosa` temasında kullanılır. Üst kenar = zemin (karakterin başladığı çizgi).
- Ana menüde ekranın alt üçte biri bu görselle dolar; menü kartı ekranın üst yarısını kaplar. Sokak, oyunun ilk görüntüsüdür, en çok emek buraya verilmeli.
- Genişlik 1080 px'in tamamı, binaların altını da kapsar.

## 4. Stil kuralları

1. **Okunabilirlik önce gelir.** Karakter ve balkonlar ince mürekkep çizgiyle çiziliyor. Arka plan onlarla yarışmamalı: düşük kontrast, büyük düz alanlar, az ayrıntı.
2. **Çizgi kalınlığı:** oyundaki çizgiler 1.2 – 2.2 birim (4 – 7 px). Arka planda **1 – 1.2 birim (3 – 4 px)** kullan, renk olarak mürekkebin %20–40'lık tonunu seç.
3. **Ayrılmış renkler, arka planda kullanma:**
   - Turuncu `#ff6a2b` — karakterin beresi ve puan çarpanı.
   - Yeşil `#1f9d5a` — güvenli kat balkonu.
   - Bu iki renk arka planda geniş alan olarak görünürse oyuncu nerede güvenli olduğunu karıştırır.
4. **Mürekkep rengi gökyüzüne göre döner:** açık gökte koyu mürekkep `#1f1d1a`, karanlıkta açık mürekkep `#ece8de`. Dönüş **41. katta** olur. 41'den sonraki temaların görselleri koyu tonlu olmalı ki açık çizgiler okunsun.
5. Kâğıt dokusu kullanılabilir, ama ince ve %5'i geçmeyen bir yoğunlukta.
6. Gölge, parlama, gradyan yerine düz renk ve tarama (hatch) tercih edilir.

## 5. Dosya teslimi

```
assets/bg/
  _sablon/            ← şablonlar (oyun bunları yüklemez)
  lefkosa/
    ufuk.webp
    suslem.webp
    cephe_sol.webp
    cephe_sag.webp
    sokak.webp
  girne/   …
  magusa/  …
  karpaz/  …
  uzay/    …
```

| Kural | Değer |
|---|---|
| Biçim | **WebP** (kalite 85–90, ya da kayıpsız) veya PNG-24. İkisi de olursa WebP kullanılır. |
| Saydamlık | `ufuk`, `suslem` şeffaf. Cephe ve sokak opak olabilir. |
| Renk profili | sRGB |
| Dosya adı | Küçük harf, Türkçe karakter yok, tablodaki adlar birebir |
| Boyut sınırı | cephe ≤ 60 KB · sokak ≤ 150 KB · süsleme ≤ 200 KB · ufuk ≤ 250 KB · tema başına toplam ≤ 600 KB |
| Kaynak dosya | Figma / Affinity / PSD kaynakları ayrıca teslim edilsin (repoya değil, ortak klasöre) |

Oyun bir sonraki temanın dosyalarını birkaç kat önceden yükler, yani boyut sınırları önemlidir (mobil veri ve bellek).

## 6. Temalar ve kat aralıkları

| Tema klasörü | Katlar | Gökyüzü (üst → alt) | Mürekkep | Öncelik |
|---|---|---|---|---|
| `lefkosa` | 0 – 14 | `#f3efe6` → `#ece6da` (kâğıt), 15'e doğru açık maviye | koyu | **1 — her oyuncu görür** |
| `girne` | 15 – 29 | `#dee9f3` → `#f3eee4` (açık gök) | koyu | 2 |
| `magusa` | 30 – 40 | `#f6d6be` → `#f4e5cf` (gün batımı), sonra morarır | koyu | 3 |
| `karpaz` | 41 – 74 | morumsu gece → `#1c2138` / `#2c2e4a` (gece) | **açık** | 4 |
| `uzay` | 75 + | `#06060e` → `#121428` (uzay) | **açık** | 5 |

Oyuncuların çoğu ilk 15 katı görüyor. Bütçe sınırlıysa önce `lefkosa`yı eksiksiz bitir, diğerlerinde sadece `ufuk` ile başla.

Tema sınırları ve gökyüzü renkleri kodda tek yerde (`BG_THEMES` ve `SKY`), değiştirmek kolay. Öneri varsa belirt.

## 7. Çevre önerileri: Kıbrıs'tan ilham

Genel fikir: tırmanış adayı güneyden kuzeye, şehirden kıyıya, kıyıdan gece göğüne ve uzaya taşıyan bir yolculuk. Her tema bir yer + bir günün saati.

### `lefkosa` · Suriçi, öğle (0 – 14)
- **Cephe:** sarı Kıbrıs taşı (kesme kum taşı), ahşap kafesli cumbalar, yeşil/mavi ahşap kepenkler, kemerli kapı açıklıkları. Kenarlardan sarkan begonvil, saksıda fesleğen, sardunya.
- **Ufuk:** Venedik surları, Büyük Han'ın kubbeleri, uzakta Beşparmak dağlarının sırtı, palmiye ve hurma silüetleri.
- **Sokak:** taş döşeme, Arasta'nın tezgahları ve tenteleri, kahvehane hasır sandalyeleri ve tavla masası, gölgede uyuyan bir kedi, limon/portakal ağacı.
- **Süsleme:** pek gerek yok; birkaç güvercin.

### `girne` · Liman, açık gök (15 – 29)
- **Cephe:** badanalı ve taş liman evleri, mavi panjur, çatı ve balkon kenarlarında **güneş enerjili su ısıtıcıları** (panel + silindir tank: adanın en tanıdık çatı görüntüsü), klima dış üniteleri, çamaşır ipleri.
- **Ufuk:** Girne Kalesi ve at nalı liman, yelkenliler; arkada Beşparmak dağları, tepede St. Hilarion Kalesi, Bellapais Manastırı'nın kemerleri.
- **Süsleme:** martılar, ince bulutlar, uzakta bir yamaç paraşütü.

### `magusa` · Surlar, gün batımı (30 – 40)
- **Cephe:** Venedik dönemi sur taşları, gotik sivri kemerler, mazgallı korniş, taşa sarılmış begonvil.
- **Ufuk:** Othello Kalesi, sur siperleri, denize açılan liman; Salamis antik kentinin sütunları ve palmiyeler, kızıllaşan deniz.
- **Süsleme:** kuş sürüleri (V düzeni), uzun yatay bulut şeritleri.

### `karpaz` · Yaz gecesi (41 – 74)
- **Cephe:** kerpiç ve taş köy evi, mavi boyalı ahşap kapı, pencerede sarı ışık, yasemin, keçiboynuzu (harnup) dalları.
- **Ufuk:** Altın Kum kumulları, ay ışığında deniz, bir deniz feneri, uzakta Karpaz'ın **yabani eşekleri**.
- **Süsleme:** ateş böcekleri, yıldızlar (kodda zaten yıldız var; görsel gelince kodunki kapanır).
- Gizli küçük detay: kumda yuvasına giden bir caretta kaplumbağası.

### `uzay` · Yörünge (75 +)
- **Cephe:** binalar artık "uzay asansörü": perçinli metal kaplama, lomboz pencereler.
- **Ufuk:** aşağıda **Kıbrıs adası yukarıdan**, mavi Akdeniz içinde tanınır silüetiyle. Oyunun büyük ödül anı.
- **Süsleme:** uydular, küçük göktaşları, Kıbrıs muflonu şeklinde bir takımyıldızı.

### Tüm temalarda tekrar eden imza: Kıbrıs kedileri
Adanın kedileri meşhur. Her temada bir yerde saklı bir kedi (cephede pencere pervazında, sokakta, Karpaz'da kayık üstünde, uzayda kask içinde). Oyuncular arasında "kediyi buldun mu" sohbeti başlatır, paylaşımı artırır.

### Hassasiyet notu
Ada siyasi olarak bölünmüş; oyun herkese hitap etmeli. Şunlardan kaçın:
- Bayraklar (dağ yamacındaki bayrak dahil), ara bölge / Yeşil Hat, askeri öğeler.
- Dini yapıları ön plana çıkarmak. Mimari silüetin parçası olarak uzaktan görünmeleri sorun değil.
- Gerçek marka, tabela, kişi.

Ortak kültür öğeleri (kedi, hellim, harnup, muflon, begonvil, güneş paneli, deniz, dağlar) güvenli ve sevilen seçimler.

## 8. Test etme

1. Dosyaları `assets/bg/<tema>/` altına koy.
2. `index.html?onizleme` aç: kamera 0'dan 90. kata kendi tırmanır (3 kat/saniye), dokununca durur. Hiç veri gönderilmez.
3. `index.html?onizleme=30` aç: 30. katta sabit durur. Ekran görüntüsü almak için uygun.
4. Kontrol listesi:
   - [ ] Cephe karosu tekrar ederken dikiş görünmüyor.
   - [ ] Pencere/kat çizgileri balkon döşemeleriyle aynı hizada.
   - [ ] Süslemenin üst-alt birleşimi görünmüyor.
   - [ ] Karakter ve balkonlar her temada rahat seçiliyor (telefonu kol mesafesinde tutarak bak).
   - [ ] 41. kattan sonra açık çizgiler koyu zeminde okunuyor.
   - [ ] Dosya boyutları sınırın altında.

## 9. Sonraki adımlar (bu şartnamenin dışında)

Arka planlar oturunca aynı sistemle şunlar eklenebilir: tema başına balkon ve iskele görselleri, karakter kostümleri (tema ya da satın alınabilir kozmetik), ana menü ve mağaza görselleri. Hepsi için ayrı şartname hazırlanabilir.
