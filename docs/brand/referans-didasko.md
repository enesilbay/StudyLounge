# Referans: Didasko

StudyLounge'ın yeni görsel kimliği için seçilen referans açılış sayfası.

- **Adres:** https://didasko.framer.website/
- **Marketplace:** https://www.framer.com/marketplace/templates/didasko/ (ücretsiz, "Remix for Free"; yapımcı: Domenico Griffo)
- **Ne olduğu:** Neobrütalist tarzda bir LMS (çevrimiçi kurs platformu) tanıtım şablonu. Tek sayfa; menü bağlantıları sayfa içi bölümlere gider.
- **İncelendi:** 11 Ekim 2026; tarayıcıda 1440 px (masaüstü) ve 390 px (telefon) genişlikte. Değerler sayfanın hesaplanmış stillerinden ölçüldü.
- **Kullanım notu:** Bu dosya **ilham kaynağıdır**. Renk, yazı tipi, biçim dili ve yerleşim tercihleri alınabilir. Logo, uygulama ekranı görselleri, metinler ve sahte kullanıcı yorumları şablonun malıdır ya da bizim kurallarımıza aykırıdır; alınmaz. Şablonun lisansı, tasarımın Framer dışında yeniden kodlanmasını kapsıyor mu, kullanmadan önce kontrol edilmeli.

Ekran görüntüleri: [`referans/`](referans/) klasörü.

| Dosya | İçerik |
| :--- | :--- |
| `didasko-01-giris.jpg` | Menü ve giriş bölümü |
| `didasko-02-urun-gorseli.jpg` | Girişin altındaki büyük uygulama ekranı görseli |
| `didasko-03-sorun.jpg` | "Problem" bölümü, üç kart |
| `didasko-04-faydalar.jpg` | "Benefits" renkli kart ızgarası |
| `didasko-05-entegrasyonlar.jpg` | Kayan logo şeridi olan beyaz panel |
| `didasko-06-nasil-calisir.jpg` | Şeftali zeminli adım adım bölüm, el çizimi oklar |
| `didasko-07-yorumlar.jpg` | İki sıra kayan yorum kartı |
| `didasko-08-fiyat.jpg` | Üç renkli fiyat kartı |
| `didasko-09-sss.jpg` | Sık sorulan sorular |
| `didasko-10-bulten-alt-bilgi.jpg` | Bülten bloğu ve nane yeşili alt bilgi |
| `didasko-11-telefon.jpg` | 390 px giriş bölümü |

---

## 1. Genel karakter

- **Neobrütalizm:** Kalın siyah kenarlıklar, sivri köşeler, bulanıksız ve kaydırılmış siyah gölgeler. Her şey "kâğıttan kesilip masaya yapıştırılmış" gibi.
- **Açık tema:** Hafif pembemsi kırık beyaz zemin, üstünde çok ince bir kâğıt/ızgara dokusu.
- **Pastel kartlar + tek güçlü vurgu:** Kartlar limon, şeftali, nane ve beyaz arasında dönüyor. Bütün eylemler hardal sarısı.
- **Bağıran başlıklar:** Çok kalın (900), tamamen büyük harf, sıkı aralıklı başlıklar; gövde metni ise sakin ve küçük harfli.
- **Oyuncu ama düzenli:** El çizimi oklar ve yıldızlar gibi şakacı detaylar var, ama ızgara ve boşluklar çok disiplinli.

## 2. Renkler

Sitenin kendi renk token'ları (Framer değişkenleri) sekiz renkten ibaret:

| Rol | Hex | Nerede |
| :--- | :--- | :--- |
| Zemin | `#F9F5F6` | Sayfa arka planı (üstünde ince desen) |
| Mürekkep | `#000000` | Metin, bütün kenarlıklar, bütün gölgeler |
| Soluk metin | `#777777` | Alt başlıklar, açıklamalar |
| Kart (nötr) | `#FFFFFF` | Sorun kartları, SSS satırları, entegrasyon paneli |
| Limon | `#FDFD96` | Fayda kartı, yorum kartları, bülten bloğu, "Starter" fiyat kartı |
| Şeftali | `#F8D6B3` | Bölüm etiketleri, "nasıl çalışır" bölüm zemini, "Pro" fiyat kartı, fayda kartı |
| Nane | `#DAF5F0` | Fayda kartı, "Academy" fiyat kartı, alt bilgi zemini |
| Hardal (eylem) | `#FFDB58` | Bütün düğmeler, ikon daireleri, SSS ok ikonları, logo dolgusu |

**Kural:** Pasteller yüzeyler için, hardal yalnızca tıklanabilir şeyler için. Siyah hem metin hem çizgi hem gölge.

**Kontrast (yaklaşık):**

| Çift | Oran | WCAG |
| :--- | :--- | :--- |
| Siyah / bütün zeminler ve pasteller | 15:1 ve üstü | AA geçer |
| Siyah / hardal | ~15:1 | AA geçer |
| `#777777` / `#F9F5F6` | ~4.2:1 | Gövde metni için AA'nın (4.5:1) biraz altında |

## 3. Yazı tipleri

İkisi de **Google Fonts**'ta, OFL lisanslı, ücretsiz; Latin Extended (Türkçe karakterler) desteği var. Gerçek Türkçe metinle denenmeli.

| Font | Kullanım | Kalınlıklar |
| :--- | :--- | :--- |
| **Epilogue** | Her şey: başlıklar, gövde, menü, düğmeler | 500, 600, 700, 900 |
| **Lexend Mega** | Yalnızca küçük bölüm etiketleri ("PROBLEM", "BENEFITS") | 900 |

### Yazı ölçeği (masaüstü)

| Öğe | Font | Boyut / satır yüksekliği | Kalınlık | Harf aralığı | Biçim |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Giriş başlığı (H1) | Epilogue | 60 / 72 px | 900 | −2.4 px (−0.04em) | BÜYÜK HARF |
| Bölüm başlığı (H2) | Epilogue | 40 / 48 px | 900 | −1.6 px (−0.04em) | BÜYÜK HARF |
| Kart başlığı (H3) | Epilogue | 28 / 33.6 px | 900 | −1.12 px (−0.04em) | BÜYÜK HARF |
| Küçük başlık, "/ MO" | Epilogue | 20 / 24 px | 900 | −0.8 px | BÜYÜK HARF |
| Gövde (büyük) | Epilogue | 18 / 27 px | 500 | −0.72 px (−0.04em) | normal |
| Gövde, düğme, menü | Epilogue | 16 / 24 px | 500–700 | −0.64 px | normal |
| Küçük metin, menü bağlantısı | Epilogue | 14 / 21 px | 500–700 | −0.56 px | normal |
| Bölüm etiketi | Lexend Mega | 10 / 12 px | 900 | −0.4 px | BÜYÜK HARF |

- **Kural:** Her yerde −0.04em harf aralığı. Başlıklarda satır yüksekliği 1.2, gövdede 1.5.
- **Telefonda:** H1 36/43 px, H2 26/31 px.

## 4. Biçim dili (neobrütalizmin kuralları)

| Öğe | Değer |
| :--- | :--- |
| **Kenarlık** | 2 px düz siyah (Framer ayarı; tarayıcı 1.6 px ölçtü). Bölüm ayırıcı çizgiler de 2 px siyah. Birkaç vurgulu yerde 4 px. |
| **Köşe** | 0, sivri. İstisnalar: ikon daireleri (%50) ve bülten e-posta alanı (tam yuvarlak hap). |
| **Gölge** | Bulanıksız, sağ alta kaydırılmış düz siyah: `Npx Npx 0 0 #000`. |
| **Gölge ölçeği** | 2 px (üzerine gelince) · 4 px (düğme, etiket) · 6 px (kart, en yaygın) · 8 px (büyük panel) · 10 px (giriş ekranı görseli) |
| **Etkileşim** | Düğmenin üzerine gelince gölge 4 → 2 px'e iner; düğme "basılmış" gibi görünür. |
| **Zemin dokusu** | 187.5 px'lik tekrar eden SVG desen; çok hafif kâğıt/ızgara hissi. |
| **İkonlar** | İnce çizgili, siyah; çoğu hardal sarısı bir dairenin içinde, daire de siyah kenarlıklı. |
| **El çizimi öğeler** | Kıvrımlı siyah oklar (adımlar arası), yıldızlar (yorumlar), fiyat listelerinde "✳" madde işareti. |

## 5. Yerleşim

- **İçerik genişliği:** 1200 px; yanlarda 40 px boşluk.
- **Bölüm boşluğu:** Her bölümün üstünde ve altında 100 px.
- **Bölüm başlığı ile içerik arası:** 100 px; giriş bölümünde 60 px.
- **Kart aralıkları:** 20 px.
- **Bölüm başlığı kalıbı:** Ortada küçük şeftali etiket → iki satırlık büyük harf başlık → iki satır soluk açıklama. Her bölümde tekrar ediyor.

### Bölümler (yukarıdan aşağı)

1. **Menü** (88 px, kaydırınca üstte sabit): Solda logo, sağda dört bölüm bağlantısı ve hardal "Start for free" düğmesi. Telefonda logo + hamburger menü.
2. **Giriş:** Ortada etiket ("Over 50K courses launched"), iki satır dev başlık, üç satır soluk açıklama, hardal birincil düğme + oklu metin bağlantı ("Compare plans →"), altında küçük güvence notu. Hemen altında 8–10 px gölgeli, kalın çerçeveli büyük uygulama ekranı görseli (pano, grafikler, sıralama tablosu).
3. **Sorun ("Problem"):** Üç eşit beyaz kart; ortada hardal daire içinde ✕ ikonu, büyük harf başlık, kısa açıklama.
4. **Faydalar ("Benefits"):** Altı kartlık "bento" ızgara; her satırda bir geniş (yaklaşık 2/3) ve bir dar (1/3) kart, sırası değişerek. Geniş kartlar renkli ve içinde küçük bir uygulama ekranı parçası var; dar kartlar beyaz ve yalnızca metin.
5. **Entegrasyonlar:** Büyük beyaz panel; üstte iki sıra, zıt yönlere kayan gri logo şeridi, altta bölüm başlığı.
6. **Nasıl çalışır:** Tam genişlikte şeftali zeminli bant, üç adım. Her adımda metin bir yanda, renkli çerçeveli ekran parçası diğer yanda; adımlar arasında el çizimi kıvrımlı ok. Her adım 650 px yükseklikte.
7. **Yorumlar:** Tam genişlikte iki sıra limon kart, zıt yönlere sürekli kayıyor; yıldızlar, alıntı, isim.
8. **Fiyatlar:** Üç eşit kart (limon, şeftali, nane): plan adı, açıklama, büyük fiyat + "/ MO", "INCLUDES:" listesi, tam genişlik hardal düğme.
9. **SSS:** Ortada 600 px'lik tek sütun; beyaz, kenarlıklı ve gölgeli satırlar, sağda hardal daire içinde ok. Tıklayınca açılıyor.
10. **Bülten:** Limon zeminli büyük blok; etiket, başlık, açıklama, hap biçimli e-posta alanı ve siyah daire içinde ok düğmesi.
11. **Alt bilgi:** Üstte 2 px siyah çizgi, nane yeşili zemin; solda logo, ortada bağlantılar, sağda hardal daire içinde sosyal medya ikonları, altta telif satırı.

## 6. Hareket

- Bölümler kaydırınca belirerek geliyor.
- Entegrasyon logoları ve yorum kartları iki sıra halinde, zıt yönlere sürekli kayıyor.
- Düğme gölgesi üzerine gelince küçülüyor (basılma hissi).
- SSS satırları açılıp kapanıyor.

---

## 7. StudyLounge için uyarlama notları

Bu bölüm benim yorumum; karar senin.

### Neden iyi bir eşleşme
- **Kitle:** Eğitim ürünü; öğrenciye hitap eden canlı, enerjik bir dil. "Kurumsal" değil.
- **Lamba metaforuyla doğal bağ:** Hardal sarısı (`#FFDB58`) "yanan lamba ışığı" rengi olarak kullanılabilir. Bütün eylemlerin hardal olması "lambanı yak" fikrine oturuyor.
- **Dokulu illüstrasyon tercihinle uyumlu:** Zemindeki kâğıt dokusu, el çizimi oklar ve pasteller, daha önce seçtiğin grenli/dokulu illüstrasyon tarzını iyi taşır.
- **Ürün görseli odaklı:** Şablon, gerçek uygulama ekranlarını büyük çerçeveler içinde gösteriyor. Bizim oda, sayaç ve analitik ekranlarımız buraya doğrudan oturur.

### Bölümleri bize çevirince

| Didasko bölümü | StudyLounge karşılığı |
| :--- | :--- |
| Giriş + uygulama ekranı | "Ayrı masalarda, aynı lobide." + çalışma odası ekranı (lambalar, ortak sayaç) |
| Sorun | Evde tek başına çalışmanın zorlukları: dikkat dağılıyor, motivasyon düşüyor, kimse yok |
| Faydalar (bento) | Ortak Pomodoro, birlikte çizilen PDF tahtası, kamera zorunlu değil, dersler ve hedefler, haftalık lig |
| Entegrasyonlar | Bizde karşılığı yok. Kaldırılır. |
| Nasıl çalışır (3 adım) | Oda seç ya da kur → lambanı yak → birlikte mola ver |
| Yorumlar | **Şimdilik yok.** Gerçek kullanıcı yorumumuz yok, uydurulamaz (PRODUCT.md). Beta sonrasında gerçek yorumlarla eklenir. |
| Fiyatlar (3 kart) | Ücretsiz + Premium (aylık ₺49 / yıllık ₺499) |
| SSS | Kamera zorunlu mu, verilerim nerede, Premium neler katıyor |
| Bülten | "Kapalı betaya katıl" ya da kaldırılır |

### Dikkat edilmesi gerekenler
- **Uydurma kanıt yok:** "Over 50K courses launched", "14 day money back guarantee", yıldızlı yorumlar gibi öğeler bizde ancak gerçekse kullanılır.
- **Türkçe büyük harf:** Başlıklar CSS ile büyük harfe çevriliyor. Türkçede "i" → "İ" dönüşümünün doğru olması için sayfada `lang="tr"` şart, yoksa "İ" yerine "I" çıkar. Uzun metinlerde büyük harf okumayı zorlaştırır; yalnızca başlıklarda kalmalı.
- **Soluk metin kontrastı:** `#777777` gövde metni için biraz açık. `#666666` civarına koyulaştırırsak AA'yı geçer.
- **Bölüm etiketleri:** Şablon her başlığın üstüne küçük bir etiket koyuyor. Bizim tasarım kurallarımız (Impeccable) bu kalıbı önermiyor; ya hiç kullanmamalı ya da yalnızca birkaç yerde bilinçli kullanmalıyız.
- **Uygulama içi yoğunluk:** Neobrütalizm açılış sayfasında güçlü, ama saatlerce açık kalan bir çalışma odasında her yerde kalın kenarlık ve sert gölge yorucu olabilir. Uygulama ekranları için aynı palet ve fontlarla daha sakin bir sürüm önerilir: gölgeler yalnızca tıklanabilir öğelerde, kalın kenarlıklar yalnızca kartlarda.
- **Koyu tema yok:** Şablonda koyu tema yok. Uygulamada gece çalışanlar için koyu tema tasarlanmalı. Neobrütalizmin koyu sürümü ayrıca düşünülmesi gereken bir iş.
- **Logo:** Didasko'nun logosu yapboz parçası biçiminde. Bizim logomuz kendi keşif sürecimizden gelecek; bu şablondan alınmaz.
