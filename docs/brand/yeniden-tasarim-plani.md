# Web yeniden tasarım planı

Bu belge, uygulamanın bütün sayfalarının yeni kimliğe taşınmasından sonra yapılan tasarım analizini ve onaylanan yeniden tasarım planını içerir (Ekim 2026). Analiz, gerçek ekranların 1536 px ve 390 px genişlikte, açık ve koyu temada alınan görüntülerine dayanır. Renk, yazı tipi ve token kuralları için tek kaynak `marka-rehberi.md`'dir.

## 1. Analiz

### Bütün sayfalarda tekrar eden kalıplar

1. **Aynı koyu bant dört sayfada.** Odalar'daki canlı şerit, Profil'in üst bandı, Sıralama'daki lig kartı ve Premium'un üst bandı aynı tarifle yapılmış: siyah zemin, sağ üstte bulanık lamba ışığı, sol altta yeşil ışık, sağda süzülen 3B nesne. Tekrar edildikçe anlamını yitiriyor.
2. **Aynı dört kutu.** Profil, başkasının profili ve Analitik'te eşit genişlikte dört istatistik kutusu var. Kutular sayfanın bilgi önceliğini yansıtmıyor.
3. **Her şey kart.** Ayarlar'da her bölüm, Profil'de hesap bilgisi, Analitik'te her grafik kart. Kart içinde kart da var (Odalar: gri kap → sütun → kart). Hiyerarşi tipografi ve boşlukla değil gölge ve kenarlıkla kurulmaya çalışılmış.
4. **Her başlık aynı.** Her uygulama sayfası solda ince bir h1 ve sağda düğmelerle açılıyor. Landing page'de beş bölüm aynı sırayı izliyor: ortalanmış hap, ortalanmış başlık, açıklama, eşit kartlar.
5. **Işıma ve bulanıklık her yerde.** Lamba ışığının bir anlamı olmalı ("biri odakta"); şu an süs olarak kullanılıyor.
6. **3B nesneler dolgu malzemesi.** Lamba üç ayrı sayfada, kupa Sıralama'da iki kez kullanılıyor; boşluğu dolduruyorlar, ürünü anlatmıyorlar.
7. **Tek animasyon reçetesi.** Her öğe aynı şekilde aşağıdan yukarı beliriyor, her sayı sayarak artıyor; hareket bir şey anlatmıyor.
8. **Tek köşe yarıçapı.** Hemen her şey 16–24 px yuvarlak; ölçek farkı yok.

### Sayfa sayfa

| Sayfa | Sorun | Korunacak |
| :--- | :--- | :--- |
| Odak odası | Kamerasız odada iki küçük masa sol üstte; ekranın çoğu boş. Ortak sayaç sağdaki panellerden biri, odanın merkezi değil. Lamba metaforu küçük bir noktaya sıkışmış. | Panel aç/kapa, menüsüz düzen, tahta ve ekran paylaşımı kuralı, genişliğe sığan PDF |
| Odalar | Dört eşit sütun; Elite boşken de yer kaplıyor. Koyu bant oda azken değer katmıyor. Hangi odaya girileceğine dair odak yok. | Canlı/boş kart ayrımı, sütun sınırı, arama |
| Landing page | Beş bölüm aynı iskelette; eşit üç kart; kayan şerit ve dev alt bilgi yazısı kalıp. | Giriş, kaydırınca düzleşen ürün görseli, gerçek ekran kesitleri, fiyat geçişi |
| Giriş | Cam çerçeve, bulanık lekeler ve geçişli düğme şablon hissi veriyor. "Şifremi unuttum" sekme olmamalı. | Sahne görseli, alan biçimi |
| Profil | Koyu bant + dört kutu + yarısı boş rütbe kartı + Ayarlar'ın kopyası hesap kartı; 12 eşit rozet kartı. | Rütbe merdiveni fikri, rozet kataloğu |
| Başkasının profili | Profilin aynısı; ilişki öne çıkmıyor. | Eylem düğmeleri |
| Sıralama | Koyu lig bandı diğer sayfalarla aynı. | Kürsü |
| Analitik | Dört kutu + beş kart alt alta; 20 satırlık oturum tablosu sayfanın yarısı. | Haftalık grafik, saat ısı haritası |
| Arkadaşlar | Sıradan iki bölmeli sohbet; arkadaşın hangi odada olduğu görünmüyor. | Düzen, telefon geçişi |
| Ayarlar | Her bölüm ikonlu kart; form sayfası için fazla süs. | Bölüm menüsü |
| Premium | Koyu bant + beş özellik kartı; Ücretsiz/Premium karşılaştırması yok. | Plan seçimi |
| Mağaza | Eşit ürün ızgarası; önizleme küçük bir yan kart. | Önizleme fikri |
| 404, yönetim paneli | Sorun yok. | Hepsi |

## 2. Ortak dil kuralları

- **Tek imza: lamba ışığı.** Işık yalnızca "biri odakta" anlamına geldiği yerde kullanılır (odadaki masa, ortak sayaç, canlı oda). Süs amaçlı bulanık lekeler kullanılmaz.
- **Koyu yüzey yalnızca "şimdi, canlı" demektir.** Bir sayfada en fazla bir tane. Koyu bantlar Profil, Sıralama ve Premium'dan, ilgili sayfanın adımında kalkar.
- **Kart yalnızca tıklanabilir nesne için.** Bilgi bölümleri boşluk, ince ayraç ve sola yaslı editoryal başlıklarla ayrılır.
- **Köşe ölçeği:** 8 px (etiket), 12 px (düğme, alan), 16 px (kart), 24 px yalnızca ürün görseli ve sahne.
- **Hiyerarşi tipografiyle kurulur.** Her sayfada tek bir dev rakam ya da cümle; diğerleri küçülür. Eşit kutu dizileri kullanılmaz.
- **3B nesneler** landing page, giriş ve gerçek boş durumlarda kalır; uygulama sayfalarında süs olmaz. İstisna: kişilerin 3B karakter avatarları (anlam taşır: kim).
- **Animasyon anlam taşır:** lamba yanınca ışık yayılır, sayaç halkası akar, sıralama değişince satır kayar. Genel belirme yalnızca ilk görünümde ve ölçülü.
- **Kit eklemeleri** (`web/src/components/app/Kit.tsx`): `SectionHeader` (sola yaslı bölüm başlığı), `DataRow` (etiket solda, değer sağda satır), `Ruler` (ince ilerleme cetveli). Ortak ısı haritası Analitik ve Profil adımında eklenir.

## 3. Sayfa planları

1. **Odak odası (3. sürüm, Meet/Discord düzeni):** "Okuma salonu" ve resimli salon denendi, kullanıcı beğenmedi; yerine görüntülü görüşme uygulamalarının düzeni geldi.
   - **Izgara:** Herkes kaydırmadan sığar (`web/src/lib/room/useFitGrid.ts`); kutu oranı kare ile 16:9 arasında esner, alan büyüdükçe kutular büyür. Kamera açıksa görüntü, kapalıysa kişiye özgü renkli zeminde avatar (8 renk, `mb-tile-*`, `web/src/lib/room/tileColors.ts`). Odaktaki kişinin kutusu lamba ışığıyla, konuşanınki yeşil halkayla çevrelenir. Yalnızken davet kutusu.
   - **Sayaç:** Üst çubuğun ortasında hap (`components/room/TimerDock.tsx`): kalan süre, aşama, tek ana eylem; ok düğmesi süre, ortak sayaç ve ders panelini açar.
   - **Sahne:** Tahta, izlenen ekran ya da büyütülen kamera solda; kişiler yanda şerit (telefonda altta). Tahta ortak çalışma alanı olduğu için biri açınca herkesin sahnesine gelir.
   - **Ekran paylaşımı isteğe bağlı (Discord gibi):** Paylaşım herkese bildirilir ve ızgarada "CANLI" kutusu olur; görüntü yalnızca "Yayını izle" diyene gönderilir (`PeerManager` `meta.watch`, arka uç değişmedi).
   - **Kontrol çubuğu:** Gizlenip gösterilebilir (tercih hatırlanır); oda tam ekrana alınabilir, tam ekranda fare 3 sn durunca çubuk gizlenir. Kapalı mikrofon/kamera kırmızı. Telefonda yalnızca mikrofon, kamera, sohbet, "Diğer" menüsü ve Ayrıl.
   - **Yan panel:** Sohbet, görevler ve ortam sesi tek panelde sekme; sohbet kapalıyken gelen mesajlar düğmede sayı olarak görünür. Telefonda alanın üstüne açılır.
   - **3B karakter avatarlar:** fotoğrafı olmayan kişi, adına göre seçilen 10 karakterden birini alır (`web/src/lib/avatars.ts`); her yerde aynı karakter görünür.
2. **Odalar, "Lobi":** Kanban kalkar. Üstte "Şu an canlı": en kalabalık oda geniş, diğerleri küçük (asimetrik). Altta bütün odalar sık bir dizin listesi; tür filtre hapı olur. Koyu bant kalkar; sayılar başlığın yanında tek satır.
3. **Landing page:** "Neden zor?" solda editoryal cümle + sağda bir akşamın zaman çizelgesi (3B nesneler çizgi üstünde). "Nasıl çalışır" yapışkan tek ürün ekranı + kaydırdıkça değişen adımlar. "Odada neler var" farklı boyutlu gerçek ekran kesitleri. SSS iki sütun. Kayan şerit kalkar.
4. **Giriş:** Bölünmüş ekran; solda tam boy sahne, sağda düz form. Cam çerçeve, lekeler, geçişli düğme kalkar; "Şifremi unuttum" bağlantı olur.
5. **Profil, "Öğrenci kimliği":** Sol kimlik kartı; sağda çalışma hikâyesi (30 günlük ısı haritası, rütbe cetveli, seri). Rozetler: kazanılanlar büyük, diğerleri küçük soluk jetonlar. Hesap kartı ve dört kutu kalkar. Başkasının profili ilişki odaklı varyant.
6. **Analitik, "Haftalık rapor":** Tek dev cümle, tam genişlik haftalık grafik, "Ritim" (saat ısı haritası + 30 gün yan yana), ders dağılımı tek yığılmış çubuk, oturum geçmişi son 5 + "tümünü göster".
7. **Sıralama:** Koyu bant kalkar; hafta cetveli başlığın altında. Kürsü merkez; liste düz tablo, kendi satırın yapışkan.
8. **Premium:** Başlık + gerçek özelliklerle Ücretsiz/Premium karşılaştırma tablosu; plan seçimi yapışkan.
9. **Mağaza, "Ayna":** Solda büyük yapışkan önizleme sahnesi, sağda ürün rafı.
10. **Arkadaşlar:** Kart içinde kart kalkar; liste tam boy ray; arkadaşın bulunduğu oda listede.
11. **Ayarlar:** Kartlar ve ikon kutuları kalkar; gruplu satırlar (etiket solda, alan sağda).
12. **404 ve yönetim paneli:** Değişmez.

## 4. Uygulama sırası

1. Ortak kurallar: kit eklemeleri, süs ışımalarının kaldırılması (koyu bantlar ilgili sayfanın adımında kalkar).
2. Odak odası.
3. Odalar.
4. Landing page.
5. Giriş.
6. Profil ve başkasının profili.
7. Analitik.
8. Sıralama.
9. Premium ve Mağaza.
10. Arkadaşlar ve Ayarlar.

Her adım ayrı commit'tir; her adımdan sonra gerçek ekranlar açık/koyu temada, masaüstü ve telefonda kontrol edilir.

## Durum

| Adım | Durum |
| :--- | :--- |
| 1. Ortak kurallar | Yapıldı |
| 2. Odak odası | Yapıldı (3. sürüm: Meet/Discord düzeni, isteğe bağlı yayın izleme, gizlenen kontrol çubuğu) |
| 3–10 | Bekliyor |
