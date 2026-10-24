# StudyLounge marka rehberi

Projenin ana renkleri, yazı tipleri ve tipografisi açılış sayfasınınkilerdir; bu dosya onların tek kaynağıdır. Köşe, gölge ve hareket kuralları da burada tanımlanır.

Kod tarafındaki karşılıkları `web/src/index.css` içindeki `mb-*` token'larıdır. Bütün web sayfaları (açılış, giriş, uygulama ve yönetim paneli) bu kimliği kullanır.

## Uygulama sayfaları

- **İskelet:** Sol menü ve üst çubuk `web/src/components/Layout/AppLayout.tsx` içinde. Sol menü daraltılabilir; tercih tarayıcıda hatırlanır. Odak odasında menü ve üst çubuk gizlenir; oda kendi üst şeridini ve alttaki kontrol çubuğunu (Meet/Discord düzeni) kullanır. Yönetim panelinin kendi iskeleti `web/src/components/admin/AdminLayout.tsx`.
- **`.sl-yeni` kapsamı** (`web/src/index.css`): uygulama ve yönetim paneli iskeletiyle giriş ve 404 sayfalarının kökünde durur. Eski bileşenlerin (`ui.tsx`: düğme, form, modal, avatar) `--sl-*` değişkenlerini ve serif yazı tipini yeni kimlikle ezer, koyu temayı tanımlar.
- **Ortak kit** (`web/src/components/app/Kit.tsx`): `AppPage` (sayfa başlığı ve eylemler), `Card`, `CardTitle`, `Rise` (görününce belirme), `SegmentedTabs` (kayan göstergeli sekmeler), `CountUp` (sayarak artan sayı), `EmptyState` (3B görselli boş durum) ve düğme/alan sınıfları (`actionButton`, `solidButton`, `outlineButton`, `ghostButton`, `inputClass`). Yeni sayfa bunlarla kurulur.
- **Animasyon:** framer-motion `AppLayout` içinde `LazyMotion` + `MotionConfig reducedMotion="user"` ile bir kez yüklenir; sayfalar `m.*` bileşenlerini kullanır. "Hareketi azalt" açıkken hareketler durur.
- **Profil parçaları** (`web/src/components/profile/ProfileParts.tsx`): lamba ışıklı üst bant, istatistik kutuları ve rozet ızgarası.

## Renkler

Zemin beyaz ve açık gri, yazı siyah, tek vurgu rengi koyu orman yeşili. Sayfanın büyük kısmı nötr kalır; yeşil yalnızca eylem ve "odakta" anlamı taşıyan yerlerde görünür.

| Rol | Token | Değer | Kullanım |
| :--- | :--- | :--- | :--- |
| Zemin | `mb-bg` | `#ffffff` | Sayfa zemini, kartların iç yüzü |
| Yüzey | `mb-surface` | `#f7f7f7` | Kart ve bölüm zemini |
| Bant | `mb-band` | `#ececec` | Giriş ve kapanış gibi vurgulu bölümler |
| Mürekkep | `mb-ink` | `#000000` | Başlıklar, ana metin, ikincil (koyu) düğme |
| Gövde metni | `mb-body` | `#5c5c5c` | Açıklama ve yardımcı metinler |
| Çizgi | `mb-line` | `#e2e2e2` | Kenarlıklar, ayraçlar |
| Izgara | `mb-grid` | `#0000000a` | Bant bölümlerindeki dikey çizgi deseni |
| Eylem (orman yeşili) | `mb-action` | `#055049` | Ana eylem düğmesi, lamba/odak işareti, vurgu ikonları |
| Eylem, üzerine gelince | `mb-action-2` | `#1a746c` | Düğme hover rengi, lamba ışıması |
| Eylem üstü metin | `mb-on-action` | `#ffffff` | Yeşil dolgunun üstündeki yazı |
| Yeşil ton | `mb-tint` | `#e3efed` | İkon zeminleri, onay işaretleri, açık vurgu alanları |

**Kurallar**

- Ekranda tek bir ana eylem yeşil olur; ikincil eylem siyah (`mb-ink`) ya da yalnızca metindir.
- Yeşil, "odakta" durumu ve ana eylem için ayrılmıştır; dekoratif büyük yeşil alanlar kullanılmaz.
- Sabit hex renk yazılmaz; her zaman token kullanılır.
- Gerçek ekran görüntüleri (uygulama kesitleri) oldukları gibi gösterilir, renkleri değiştirilmez.

**Kontrast (WCAG AA'yı geçer)**

| Metin / zemin | Oran |
| :--- | :--- |
| `mb-ink` / `mb-bg` | 21.0 |
| `mb-body` / `mb-bg` | 6.7 |
| `mb-body` / `mb-surface` | 6.2 |
| `mb-body` / `mb-band` | 5.7 |
| `mb-on-action` / `mb-action` | 9.3 |
| `mb-on-action` / `mb-action-2` | 5.6 |
| `mb-action` / `mb-tint` | 7.9 |

## Yazı tipleri

| Rol | Yazı tipi | Ağırlıklar | Token |
| :--- | :--- | :--- | :--- |
| Başlık | **Geist** | 300 (büyük başlık), 400–500 (küçük başlık, logo yazısı) | `font-mb-display` |
| Gövde ve arayüz | **Poppins** | 400, 500, 600 | `font-mb-body` |
| Yedek | Atkinson Hyperlegible Next, system-ui | | |

Her iki yazı tipi de Google Fonts'tan yüklenir (`web/index.html`). Geist, Mobilo'nun kullandığı ücretli Sequel Sans'ın ücretsiz karşılığı olarak seçildi.

## Tipografi ölçeği

Başlıklar ince (Geist 300) ve sıkı harf aralıklıdır; büyüklük ağırlıkla değil boyutla kurulur.

| Öğe | Telefon | Geniş ekran | Satır yüksekliği | Harf aralığı |
| :--- | :--- | :--- | :--- | :--- |
| H1 (giriş başlığı) | 2.75rem (44px) | 4.5rem (72px) | 1.08 | −0.045em |
| H2 (bölüm başlığı) | 2.25rem (36px) | 3.25rem (52px) | 1.15 | −0.045em |
| H3 (kart başlığı, büyük) | 1.75rem (28px) | 2rem (32px) | 1.25 | −0.045em |
| H3 (kart başlığı, küçük) | 1.25rem (20px) | 1.25rem | 1.3 | −0.02em |
| Fiyat / büyük sayı | 3rem (48px) | 3rem | 1 | −0.045em, `tabular-nums` |
| Gövde, giriş metni | 1rem (16px) | 1.125rem (18px) | 1.8 | normal |
| Gövde, kart metni | 0.9375rem (15px) | 0.9375rem | 1.75 | normal |
| Küçük metin, etiket | 0.875rem (14px) | 0.875rem | 1.7 | normal |

- Başlıklarda `text-balance` kullanılır.
- Gövde metni satır başına en fazla ~70 karakter olacak şekilde sınırlanır (`max-w-[38rem]`–`[40rem]`).
- Tamamı büyük harf başlık kullanılmaz.

## Biçim

| Öğe | Köşe yarıçapı |
| :--- | :--- |
| Büyük kart, bölüm kutusu | 24px |
| Kapanış bandı | 28px |
| Ürün görseli çerçevesi | 24px (4px beyaz kenarlık) |
| Ekran kesiti, SSS satırı | 16px |
| Düğme | 14px |
| İkon kutusu | 12px |
| Etiket hapı, seçim anahtarı | tam yuvarlak |

| Gölge | Token | Kullanım |
| :--- | :--- | :--- |
| Kart | `shadow-mb-card` | Beyaz kartlar, ekran kesitleri |
| Kabartma | `shadow-mb-raised` | Üst çubuk, hap, ikincil düğme |
| Basılı düğme | `shadow-mb-press` | Yeşil ana eylem (içe gölge + yeşilimsi alt gölge) |
| Ürün görseli | `shadow-mb-shot` | Büyük ürün görseli, öne çıkan fiyat kartı |

- İçerik genişliği en fazla 1320px (`max-w-mb`), yanlarda 20px (telefon) / 32px (geniş ekran) boşluk.
- Bölümler arası dikey boşluk 80px (telefon) / 112px (geniş ekran).
- Dokunma hedefleri en az 44px.

## Hareket

- Yumuşak çıkış eğrisi: `cubic-bezier(0.16, 1, 0.3, 1)`. Yaylı hareketlerde düşük sönümlü yay (ör. notlar, adım noktaları).
- Yalnızca `transform` ve `opacity` canlandırılır.
- `prefers-reduced-motion` açıkken bütün hareketler durur, içerik baştan görünür.
- Açılış sayfasında kullanılan hareketler `web/src/components/landing-mobilo/Effects.tsx` ve `web/src/components/landing/Motion.tsx` içindedir. Uygulama sayfalarında hareket daha az kullanılır: saatlerce açık kalan bir çalışma ekranında yalnızca durum değişimleri (lamba yanması, sayaç) canlandırılır.

## Logo ve görseller

- **Logo:** Açık kitabın üstünde yanan lamba, yanında Geist 500 ile "StudyLounge" yazısı (harf aralığı −0.03em). İşaret yazıyla birlikte kullanılır; tek başına yalnızca simge gereken yerlerde (favicon, uygulama simgesi).
  - Dosyalar `docs/brand/logo/`: `studylounge-isaret.svg` (açık zemin: yeşil işaret), `studylounge-isaret-beyaz.svg` (koyu ya da yeşil zemin), `studylounge-isaret-tek-renk.svg` (ışıksız, tek renk baskı), `studylounge-simge.svg` (yeşil kare içinde beyaz işaret).
  - Kodda `web/src/components/brand/Logo.tsx` (`LogoMark`). Lamba ve kitap `currentColor` ile boyanır, ışık her zaman lamba rengindedir (`mb-lamp`, `#FFD27A`).
  - Açık zeminde işaret orman yeşili, yazı siyah; koyu zeminde ikisi de beyaz. Işık rengi değiştirilmez, işaret eğilmez ya da gölgelendirilmez.
  - Şu an yalnızca açılış sayfasında kullanılıyor. Favicon, uygulama simgeleri ve uygulama sayfaları yeni tasarıma geçtikçe güncellenecek.
- İllüstrasyonlar: 3B nesne tarzı (lamba, kitap, kalem, kahve…), şeffaf arka planlı. Promptlar ve dosya adları `docs/brand/gorseller/` için belirlendi.
- Ürün görselleri: her zaman gerçek uygulamadan, demo hesaplarla alınmış ekran görüntüleri. Sahte kullanıcı sayısı, puan ya da yorum gösterilmez.
