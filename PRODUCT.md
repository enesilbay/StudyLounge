# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Tasarım çalışmalarının hedefi `web/` (React 19 + Vite + Tailwind v4). Aynı hesabı kullanan bir Expo/React Native mobil uygulaması da var (`mobile/`), ama mevcut haliyle korunuyor; yeni özellik ve tasarım değişikliği yalnızca web'e gelir.

## Users

İki birincil kitle, eşit önemde:

- **Üniversite öğrencileri:** vize/final haftasında evde ya da kütüphanede tek başına çalışırken, arkadaşlarıyla aynı masadaymış gibi "birlikte" çalışma hissi arıyorlar.
- **Sınava hazırlananlar** (YKS, KPSS, ALES vb.): aylara yayılan bir hazırlıkta düzenli çalışma, takip ve disiplin arıyorlar.

İkisinin de işi aynı: dikkat dağıtmadan odaklanmak ve bunu tek başına değil, başkalarının varlığını hissederek yapmak.

## Product Purpose

StudyLounge, ayrı yerlerde çalışan öğrencileri aynı sanal çalışma odasında buluşturur. Kim odaklanıyorsa onun "lambası yanar"; odadakiler birbirinin çalıştığını görür, birlikte mola verir.

Hedef **gerçek bir ürün**: mezuniyet projesi olarak başladı, ama gerçek kullanıcılara açılacak ve Premium gelirle sürdürülecek. Başarı, kullanıcıların düzenli olarak odalara dönmesi ve birlikte çalışmayı sürdürmesiyle ölçülür.

## Positioning

Ayırt edici nokta **birlikte çalışma odası**: odadaki herkesin aynı anda başlayıp birlikte mola verdiği ortak Pomodoro, üstüne birlikte çizilen ortak PDF/boş tahta, oda sohbeti ve isteğe bağlı kamera/ekran paylaşımı. Sıradan bir zamanlayıcı ya da tek kişilik odak uygulaması bunu sunamaz.

Destekleyen özellik: kamera zorunlu değil. Mobilde odak, telefonun masada durmasıyla (ivmeölçer) ölçülür; web'de sekme açıklığıyla. Kamera yalnızca kameralı odalarda ve kullanıcı açarsa devreye girer.

## Operating Context

- Kullanım anı: uzun, kesintisiz çalışma oturumları (25–60 dk odak + mola). Kullanıcı ekrana sürekli bakmaz; oda ve sayaç arka planda "varlık" hissi verir.
- Web'de sekme 60 sn'den uzun gizli kalırsa odak duraklatılır.
- Odalar 24 saat açık kalır. Kameralı odalar en fazla 6 kişiliktir (P2P mesh).
- Arayüz dili Türkçe. Saatler ve günler Türkiye saatine göre (haftalık lig Pazartesi 00:00'da sıfırlanır).
- Ders notları PDF olarak odaya yüklenip birlikte incelenir; tablet kalemiyle çizim desteklenir.

## Capabilities and Constraints

Mevcut özellikler:
- Hesap: JWT, e-posta doğrulama, şifre sıfırlama.
- Çalışma odaları: kur/katıl, şifreli oda, Elite (Premium) oda, oda sahibi kontrolleri (düzenle, sil, kullanıcı çıkar, kilitle).
- Odada: kişisel ve ortak Pomodoro, ortam sesleri, sohbet ve dosya paylaşımı, ortak PDF ve boş tahta (kalem, fosforlu kalem, lazer, silgi), kameralı odalarda kamera/mikrofon/ekran paylaşımı, cihaz seçimi, bağlantı kalitesi göstergesi, konuşanı vurgulama, dürtme, düello.
- Çalışma takibi: dersler, oturum geçmişi, günlük/haftalık hedefler, görev listesi, planlı oturumlar, analitik.
- Sosyal: arkadaşlık, DM, okunmamış mesajlar, kullanıcı arama ve herkese açık profil, engelleme ve şikayet, admin paneli.
- Oyunlaştırma: odak puanı, seri, rütbeler, rozetler, haftalık lig, mağaza (sohbet balonu rengi, isim ikonu, profil çerçevesi).
- PWA, uygulama geneli bildirimler.

Kısıtlar:
- Backend değişiklikleri mobil istemciyi bozmamalı: yeni kolonlar varsayılan değerli, yeni socket event'leri isteğe bağlı.
- Görüntü/ses kaydı bilinçli olarak yok; medya kaydedilmez.
- Kameralı oda kapasitesi 6 kişi (SFU yok).
- Tahta ve ortak sayaç durumu sunucu belleğinde tutulur; kalıcı değildir.

Henüz karar verilmemiş / tamamlanmamış:
- Ödeme: Premium web'de ₺49/ay olarak gösteriliyor, ama ödeme akışı canlı değil (Stripe altyapısı var; şimdilik demo yükseltme).
- TURN sunucusu sağlayıcısı (okul/kurum ağlarında kameralı odalar için) bağlanmadı.

## Brand Commitments

- Ad: **StudyLounge**. Slogan: **"Ayrı masalarda, aynı lobide."**
- Ürün dilinde temel metafor **lamba**: odaklanan kişinin lambası yanar, molada söner. "Odakta" ve "Molada" bu metaforun parçası.
- Ses: sade, samimi, Türkçe; öğrenciye "sen" diye hitap eder.
- Kullanıcının bağlayıcı olarak belirlediği renkler: turkuaz, açık pembe ve krem/kırık beyaz. Proje kuralına göre pembe yalnızca "odakta" durumu ve ana eylem için kullanılır.

## Evidence on Hand

- Çalışan ürün: web (Netlify) ve backend (Render) yayında.
- Demo verisi: `npm run seed` ile 4 doğrulanmış demo hesap, odalar, 14 günlük oturum geçmişi, dersler, görevler ve planlı oturum (README'de).
- Uçtan uca testler (Playwright) ve CI mevcut.
- **Yok:** gerçek kullanıcı sayısı, kullanım metrikleri, kullanıcı yorumu/testimonial, basın, kurum ortaklığı. Bunlar uydurulmamalı; arayüzde örnek kişiler (ör. açılış sayfasındaki masalar) açıkça örnek olarak kalmalı.

## Product Principles

1. **Oda merkezdedir.** Yeni özellikler önce "birlikte çalışmayı" güçlendirip güçlendirmediğine göre değerlendirilir; tek kişilik özellikler odayı destekler, onunla yarışmaz.
2. **Varlık, gözetim değil.** Birinin çalıştığını bilmek yeterlidir; kamera, kayıt ya da izleme hiçbir zaman zorunlu olmaz.
3. **Dikkat dağıtmaz.** Akış, beğeni, sonsuz kaydırma gibi sosyal ağ alışkanlıkları eklenmez; arayüz çalışma sırasında geri çekilir.
4. **Gerçek ürün disiplini.** Sahte veri, sahte kanıt ya da çalışmayan vaat gösterilmez; güvenlik ve mobil uyumluluk her değişiklikte korunur.
