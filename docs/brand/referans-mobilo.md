# Referans: Mobilo

Açılış sayfasının ikinci deneme sürümü için referans (plan: Aşama 7, `ozellik/acilis-mobilo` dalı).

- **Adres:** https://mobilo.framer.website/
- **Ne olduğu:** Görev yönetimi uygulaması için bir Framer tanıtım şablonu ("Mobilo – AI Task Management Landing Page Template"). Tek sayfa.
- **İncelendi:** 11 Ekim 2026. Değerler 1920 px genişlikte, sayfanın hesaplanmış stillerinden ölçüldü. Telefon görüntüsü 390 px.
- **Kullanım notu:** İlham kaynağıdır. Logo, 3B nesne görselleri, uygulama ekranı görselleri, şirket logoları ve kullanıcı yorumları şablonun malıdır ya da bizim kurallarımıza aykırıdır; alınmaz.

Ekran görüntüleri: [`referans/`](referans/) klasörü, `mobilo-01-giris.jpg` … `mobilo-11-telefon.jpg`.

| Dosya | İçerik |
| :--- | :--- |
| `mobilo-01-giris.jpg` | Yüzen menü, giriş başlığı, iki düğme, kalem nesneleri |
| `mobilo-02-urun-gorseli.jpg` | Büyük uygulama ekranı görseli, şirket logoları şeridi |
| `mobilo-03-degerler.jpg` | Üç değer kartı, 3B ikon görselleriyle |
| `mobilo-04-ozellikler.jpg` | İki büyük + bir geniş özellik kartı, içlerinde ekran parçaları |
| `mobilo-05-ozellikler-2.jpg` | "Why Mobilo" ikinci özellik bölümü |
| `mobilo-06-fiyat.jpg` | Aylık/yıllık geçişi, üç fiyat kartı, özel istek kartı |
| `mobilo-07-yorumlar.jpg` | İki sıra kayan yorum kartı |
| `mobilo-08-entegrasyonlar.jpg` | Entegrasyon kartları |
| `mobilo-09-sss.jpg` | Sık sorulan sorular |
| `mobilo-10-kapanis-alt-bilgi.jpg` | Kapanış çağrısı ve koyu yeşil alt bilgi |
| `mobilo-11-telefon.jpg` | 390 px giriş |

---

## 1. Genel karakter

- **Sakin, aydınlık SaaS:** Beyaz ve çok açık gri zemin, tek koyu yeşil vurgu, bol boşluk.
- **Gerçek nesne + ürün:** Sahneyi kâğıt, ataş, kalem, raptiye gibi gerçekçi 3B nesneler süslüyor; masa üstü hissi veriyor. Asıl yıldız büyük uygulama ekranı görseli.
- **İnce, büyük başlıklar:** Başlıklar çok ince (310) ve sıkı aralıklı; ağırlığı boyut ve boşluk veriyor, kalınlık değil.
- **Yumuşak derinlik:** Gölgeler bulanık ve çok hafif; düğmelerde içeri doğru hafif bir gölgeyle "basılabilir" his.
- **Yuvarlak köşeler:** Kartlarda 20–24 px, düğmelerde 14 px, haplarda tam yuvarlak.

## 2. Renkler

Sitenin kendi token'ları altı renk:

| Rol | Hex | Nerede |
| :--- | :--- | :--- |
| Vurgu (orman yeşili) | `#055049` | Birincil düğme, logo, seçili sekme, alt bilgi zemini, ikon dolguları |
| Vurgu (açık ton) | `#1A746C` | Grafiklerde ve ikinci düzey vurgularda |
| Mürekkep | `#000000` | Başlıklar, ikincil düğme (siyah) |
| Gövde metni | `#5C5C5C` | Açıklamalar, menü bağlantıları |
| Soluk | `#C2C2C2` | Pasif metin, ince çizgiler |
| Yüzey | `#F7F7F7` | Kart zemini |
| Yüzey (koyu) | `#E5E5E5` | Giriş arka planı, ayırıcı bulanık bantlar |
| Zemin | `#FFFFFF` | Sayfa |

**Kontrast (yaklaşık):** `#5C5C5C` / beyaz ≈ 6.7:1 ve beyaz / `#055049` ≈ 9:1; ikisi de AA'yı geçer. `#C2C2C2` / beyaz ≈ 1.8:1, yalnızca süs; metin için kullanılmamalı.

## 3. Yazı tipleri

| Font | Kullanım | Not |
| :--- | :--- | :--- |
| **Sequel Sans** (Roman Body 310) | Bütün başlıklar | **Ücretli** (OGJ Type Design). Biz kullanamayız; ücretsiz muadil gerekir. |
| **Poppins** | Gövde, menü, düğmeler | Google Fonts, ücretsiz, Türkçe destekli. 400 ve 500. |
| Geist | Yükleniyor, az yerde | Google Fonts, ücretsiz. |

**Sequel Sans'ın yerine:** ince ağırlıkta sıkı bir grotesk. Adaylar: **Geist** (300), **Inter Tight** (300) ya da **Instrument Sans** (400). Üçü de Google Fonts'ta ve Latin Extended destekli; Türkçe metinle denenecek.

### Yazı ölçeği (1920 px)

| Öğe | Font | Boyut / satır | Kalınlık | Harf aralığı |
| :--- | :--- | :--- | :--- | :--- |
| Giriş başlığı (H1) | Sequel Sans | 72 / 79 px | 310 | −4 px (≈ −0.055em) |
| Bölüm başlığı (H2) | Sequel Sans | 52 / 62 px | 310 | −2 px |
| Fiyat | Sequel Sans | 44 / 57 px | 310 | −1.5 px |
| Kart başlığı (H3) | Sequel Sans | 32 / 42 px | 310 | −1.5 px |
| Küçük kart başlığı (H4) | Sequel Sans | 26 / 34 px | 310 | −1.5 px |
| Büyük gövde, alıntı | Poppins | 20 / 36 px | 400–500 | normal |
| Gövde | Poppins | 16–18 / 29–32 px | 400 | normal |
| Küçük | Poppins | 14 / 25 px | 400–500 | normal |

- Gövdede satır yüksekliği çok geniş (≈1.8): ferah, sakin okuma.
- **Telefonda:** H1 40/48 px.

## 4. Biçim dili

| Öğe | Değer |
| :--- | :--- |
| **Köşe** | Kart 20–24 px, iç kart 12–16 px, düğme 14 px, menü 22 px, hap 100 px |
| **Kenarlık** | 1 px; açık gri (`#C1C1C1`), beyaz ya da yeşilin %24'ü |
| **Gölge (kart)** | `6px 6px 16px rgba(16,25,24,.06)`: çok hafif, sağ alta bulanık |
| **Gölge (düğme)** | Katmanlı küçük dış gölgeler + yeşil düğmede içe doğru hafif koyu gölge (`inset 0 -2px 7.6px -2px rgba(5,80,73,.6)`): kabartma his |
| **Menü** | Ortada, 1000 px genişlikte, beyaz, 22 px köşeli yüzen kart; altında içe gölge ve yumuşak dış gölge. Kaydırınca üstte kalır. |
| **Etiket hapı** | Bölüm başlıklarının üstünde, küçük logo ikonlu, beyaz, ince kenarlıklı hap ("Key Features") |
| **Zemin deseni** | Giriş ve kapanışta ince dikey çizgiler; bölümler arasında bulanık gri bantlar |
| **İkonlar** | İnce çizgili; fiyat maddelerinde yeşil rozet içinde onay işareti |

## 5. Yerleşim

- **İçerik genişliği:** 1320 px (1920 px ekranda); yanlarda 60 px.
- **Bölüm boşluğu:** Üst ve alt 80 px; giriş üstte 220 px.
- **Başlık ile içerik arası:** 60 px. Başlık bloğu: etiket hapı → iki satır başlık → iki satır gövde, 16 px aralıkla.
- **Kart aralıkları:** 24 px (bazı ızgaralarda 32 px).

### Bölümler (yukarıdan aşağı)

1. **Menü:** Yüzen beyaz kart; solda logo, ortada bağlantılar (açılır "Pages" menüsü), sağda yeşil "Join Waitlist".
2. **Giriş:** Ortada puan + kullanıcı sayısı hapı (ataşla tutturulmuş), iki satır ince dev başlık, iki satır gövde, yeşil ("Get The App ↗") + siyah ("View Pricing") düğme. İki yanda çapraz duran 3B kalemler.
3. **Ürün görseli:** Tam genişlikte uygulama ekranı (kenar çubuğu, kanban panosu); kenarlarında ataş ve raptiye gibi 3B nesneler; altı beyaza doğru solarak bitiyor.
4. **Logo şeridi:** "Join 4,000+ companies" ve kayan gri şirket logoları.
5. **Değerler:** Üç eşit kart; başlık, metin, altta beyaz iç kartta 3B ikon görseli (büyüteç, grafik, kalkan).
6. **Özellikler:** İki büyük kart yan yana + altta bir geniş kart; her birinde başlık, metin ve gerçek ekran parçası (kanban, takvim, menü). Geniş kartta yeşil "Learn More ↗" düğmesi.
7. **Neden Mobilo:** Metin ve ekran parçası yan yana, sırası değişen satırlar.
8. **Fiyat:** Aylık/yıllık geçiş düğmesi; üç kart, ortadaki "Popular" etiketli ve yeşil düğmeli, arka planında yeşil ışıma. Altında "Unique Request" geniş kartı.
9. **Yorumlar:** İki sıra beyaz kart, zıt yönlere kayıyor; yıldız, alıntı, fotoğraf, isim, şirket logosu.
10. **Entegrasyonlar:** Logo görseli + üç küçük özellik kartı.
11. **SSS:** Ortalı başlık, açılır sorular, "Still looking for an answer?" bağlantısı.
12. **Kapanış:** Açık gri, köşeleri yuvarlak büyük kart; ortada başlık, metin, App Store / Google Play düğmeleri; iki yanda eğik duran ekran parçaları.
13. **Alt bilgi:** Koyu yeşil (`#055049`) zemin, arkada dev soluk "Mobilo" yazısı; logo ve açıklama, bülten alanı, üç sütun bağlantı, sosyal medya ikonları, telif satırı.

## 6. Hareket

- Bölümler ve kartlar kaydırınca aşağıdan, saydamlıktan belirerek geliyor (doğrudan atlayınca tetiklenmiyor).
- Logo şeridi ve yorum kartları sürekli kayıyor.
- 3B nesneler yerinde hafifçe süzülüyor.
- Fiyat geçişinde aylık/yıllık kartlar değişiyor.

---

## 7. StudyLounge için uyarlama notları

### Bölümleri bize çevirince

| Mobilo | StudyLounge karşılığı |
| :--- | :--- |
| Giriş + kalemler | "Ayrı masalarda, aynı lobide." + 3B masa lambası, kitap, kalem |
| Ürün görseli | Gerçek çalışma odası ekran görüntüsü (plan: Aşama 2) |
| Logo şeridi | **Yok.** Gerçek kurum/kullanıcı kanıtımız yok. |
| Değerler (3B ikonlu) | Sorun bölümü: dikkat dağılıyor, motivasyon eriyor, yanında kimse yok (3B telefon, kum saati, boş sandalye) |
| Özellikler (ekran parçalı) | Ortak sayaç, ortak tahta, kamera isteğe bağlı: gerçek ekran parçalarıyla |
| Neden Mobilo | Nasıl çalışır: üç adım |
| Fiyat (aylık/yıllık geçişli) | Ücretsiz + Premium; geçiş Premium kartında aylık ₺49 / yıllık ₺499 arasında |
| Yorumlar | **Yok** (gerçek yorum yok). |
| Entegrasyonlar | **Yok.** |
| SSS | Aynı |
| Kapanış (mağaza düğmeleri) | "Bu akşam bir masa boş." + hesap aç düğmesi. Mağaza düğmeleri yok. |
| Koyu yeşil alt bilgi | Alt bilgi |

### Dikkat edilmesi gerekenler
- **Uydurma kanıt yok:** "48,890+ users", "4.90/5", şirket logoları, yorumlar bizde ancak gerçekse kullanılır.
- **Font:** Sequel Sans yerine ücretsiz muadil (yukarıda).
- **"Yapay zekâ sitesi" görünümü:** Mobilo'nun dili çok yaygın SaaS dilidir: ince başlık, beyaz kartlar, yeşil düğme. Ayırt edici olan 3B nesneler ve gerçek ürün görseli; bunlar özenle seçilmezse sayfa jenerik görünür. Bizim imzamız lamba ışığı olmalı: sahnede tek sıcak ışık kaynağı.
- **Yeşil vurgu:** `#055049` güzel ama başka bir markanın rengi. Palet denemelerinde StudyLounge'a özgü bir ton aranmalı.
