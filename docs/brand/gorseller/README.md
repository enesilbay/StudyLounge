# Açılış sayfası 3B görselleri

Bütün görseller aynı stil şablonuyla üretilir; böylece hepsi aynı elden çıkmış gibi görünür. Renkler `../marka-rehberi.md` ile aynıdır.

## Nasıl üretilir

1. **Araç:** ChatGPT (görsel üretimi). Şeffaf arka planı en güvenilir veren araç bu. Gemini kullanılırsa arka plan düz beyaz istenir, şeffaflaştırmayı sonra ben yaparım.
2. **Sıra:** Önce `lamba.png` üretilir. Beğenilince **aynı sohbette** diğerleri istenir ve her promptun başına şu cümle eklenir: *"Same style, lighting, materials and colors as the lamp image above."* Bu, bütün setin tutarlı olmasını sağlar.
3. **Biçim:** PNG, şeffaf arka plan, kare (1:1), mümkün olan en yüksek çözünürlük (en az 1024px; `masa-sahne.png` 4:3).
4. **Kayıt:** Dosyalar aşağıdaki adlarla `docs/brand/gorseller/` klasörüne konur. WebP'ye çevirme ve sayfaya yerleştirme bende.

## Ortak stil şablonu

Her promptun sonuna aynen eklenir:

```
3D render of a single object, soft matte clay material with a subtle satin sheen, rounded friendly proportions, minimal detail, clean modern product-illustration style. Color palette strictly limited to: off-white (#F7F7F7), light gray (#E2E2E2), deep forest green (#055049) as the main accent, lighter green (#1A746C), and small touches of black. Soft studio lighting from the upper left, gentle ambient occlusion, a very soft contact shadow directly beneath the object. Three-quarter view from slightly above (about 30 degrees). Centered, the object fills about 80% of the frame. Transparent background (PNG with alpha channel). No text, no letters, no numbers, no logos, no extra props. Square 1:1 aspect ratio, high resolution.
```

## Görseller

| # | Dosya | Nerede | Nesne promptu (şablondan önce yazılır) |
| :--- | :--- | :--- | :--- |
| 1 | `lamba.png` | Giriş, başlığın sol yanında süzülür | A classic banker's desk lamp with a deep forest green glass shade, a black base and a slim black stem, switched on, casting a soft warm-white glow just under the shade. |
| 2 | `kitaplar.png` | Giriş, başlığın sağ yanında süzülür | A neat stack of three closed hardcover books, slightly offset from each other, covers in deep forest green, off-white and light gray, with a green ribbon bookmark hanging out of the top book. |
| 3 | `kahve.png` | Giriş, ürün görselinin köşesinde | A simple ceramic coffee mug in off-white with a thin deep forest green band around the rim, three soft wisps of steam rising from it. |
| 4 | `telefon.png` | "Dikkat dağılıyor" kartı | A modern smartphone lying at a slight tilt, its screen glowing softly, with four small rounded notification bubbles (blank, no text) popping out above the screen in green and light gray. |
| 5 | `kum-saati.png` | "Motivasyon eriyor" kartı | An hourglass with a black frame and clear glass, deep forest green sand, almost all of the sand already fallen into the bottom bulb, a thin last stream still falling. |
| 6 | `bos-sandalye.png` | "Yanında kimse yok" kartı | A single empty study chair with a rounded backrest, off-white seat and forest green legs, slightly pulled out and turned, as if someone just left. |
| 7 | `hedef.png` | "Dersler ve hedefler" kartı | A round target board with off-white and deep forest green rings, a single dart with a black body stuck exactly in the center. |
| 8 | `kamera.png` | "İstersen kamera" kartı | A small round webcam on a short clip stand, off-white body, deep forest green ring around the lens, a tiny unlit indicator light. |
| 9 | `kupa.png` | "Haftalık lig" kartı | A small trophy cup in deep forest green with off-white handles and an off-white rounded base. |
| 10 | `masa-sahne.png` | Kapanış bölümü ("Bu akşam bir masa boş.") | A small isometric study-desk scene: a light wooden-clay desk with a lit green banker's lamp, an open notebook, a pencil, the off-white coffee mug, and an empty chair pulled out in front of the desk, inviting someone to sit. (Bu görselde şablondaki "single object" ve "Square 1:1" yerine "a small scene" ve "4:3 aspect ratio" yazılır.) |

## Sonra gelecekler

- **Logo:** Ayrı bir iş. İşaret + yazılı hâl, mümkünse SVG. Gelince üst çubuk, alt bilgi, favicon ve uygulama simgeleri değişir.
- **Paylaşım görseli (1200×630):** Bu görsellerden ben birleştiririm.

## Odak odası (`oda/`)

Kullanıcının ürettiği görseller; işlenmiş halleri `web/public/avatars/` altında WebP. Salon ve masa görselleri odanın 3. sürümünde kaldırıldı (git geçmişinde duruyor).

| Dosya | Nerede |
| :--- | :--- |
| `avatar1.png` … `avatar10.png` | Fotoğrafı olmayan kullanıcıların 3B karakter avatarları; daire maskeli, 256 px |
