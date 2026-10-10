# 🗺️ StudyLounge Yol Haritası

## ✅ Tamamlananlar

### Temel platform
- NestJS backend: JWT kimlik doğrulama, e-posta doğrulama, şifre sıfırlama
- PostgreSQL + TypeORM, migration'lar
- Socket.IO gateway: lobi varlığı (presence), oda sohbeti, DM, dürtme, düello
- Oyunlaştırma: odak puanı, seri (streak), rütbeler, mağaza, profil çerçeveleri
- Docker multi-stage build, Docker Compose, GitHub Actions CI, Render dağıtımı

### Mobil (Expo)
- İvmeölçer ile "telefon masada" algılama ve otomatik odak sayacı
- Telefon ekranı kapalı masadayken ekran parlaklığını kısma
- Ortam sesleri, pomodoro, push bildirimleri

### Web 2.0 (bu sürüm)
- "Kütüphane lambası" temalı yeni tasarım; açık/koyu tema
- **Kameralı odalar:** Premium kullanıcılar en fazla 6 kişilik oda kurabilir (`Lobby.allowVideo`)
- **P2P WebRTC:** kamera, mikrofon ve ekran paylaşımı; sinyalleşme mevcut Socket.IO üzerinden
- Ekran paylaşımı için büyük sahne görünümü, birden fazla paylaşım arasında geçiş
- Web'de odak takibi: sekme 60 sn'den uzun gizli kalınca odak duraklatılır
- Web'e e-posta doğrulama adımı eklendi
- Odadan ayrılma (`leave_lobby`) ve yeniden bağlanmada odaya otomatik dönüş

## 🔜 Sıradaki adımlar

### 🚩 Öncelikli açık işler (en önce bunlar)

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| ✅ | E-posta gönderimi | Çözüldü: Render'ın ücretsiz planı SMTP portlarını engelliyordu (`Connection timeout`). E-posta artık Brevo HTTPS API ile gidiyor (`BREVO_API_KEY`, `BREVO_FROM`); test ve canlıda denendi, gelen kutusuna düşüyor. |
| ✅ | Ortam ayrımı: son kontrol | Doğrulandı: test sitesinden açılan hesaplar yalnızca Neon `staging` dalında, `production`'da yok. Test sitesi test backend'ine, canlı site canlı backend'e bağlı; CORS ve `JWT_SECRET` ayrımı çalışıyor. |
| Yüksek | Ortam ayrımı: temizlik | Yapıldı: taşıma yedeği, `backend/.env.migration` ve test veritabanındaki deneme hesapları silindi. Kalan (panelden): `.env.migration` OneDrive'a da yüklendiği için Neon `neondb_owner` şifresi yenilenir ve iki Render servisindeki `DATABASE_URL` güncellenir; OneDrive geri dönüşüm kutusundaki kopya silinir; Render'daki eski veritabanı silinir (zaten ~2 Kasım 2026'da silinecek); Neon'un geri yükleme süresi kontrol edilir. |

Fazlar sırayla uygulanır: önce güvenlik, sonra yeni değer. Her faz ayrı commit/PR olarak gelir.

**Ortak kurallar**
- Backend'de yeni kolonlar varsayılan değerli olur, yeni socket event'leri isteğe bağlıdır. Böylece mobil istemci bozulmaz.
- Yeni özellikler web'e gelir. Mobilde yalnızca Faz 1'deki kritik düzeltmeler yapılır. Mobil için tek istisna Faz 6'daki ödeme ve mağaza yayını.
- Her şema değişikliği bir migration ile gelir.

### Faz 1: Güvenlik, e-posta ve web eksikleri ✅ (tamamlandı, `faz-1` dalı)

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Kritik | Mağaza fiyatı sunucuda | `POST /users/buy` şu an fiyatı istemciden alıyor; negatif fiyatla coin basılabiliyor. Ürün kataloğu backend'e (`users/shop-catalog.ts`) taşınır, fiyat orada belirlenir. Web kataloğu `GET /users/shop/catalog`'dan çeker. |
| Kritik | Oda ve düello yetkileri | Şifreli odaların mesajlarını yalnızca o odadakiler okuyabilir (`GET /messages/:roomName`). `send_message` oda üyeliğini kontrol eder. Düello bahsi 1–100 arası ve coin'den fazla olamaz. Daveti reddetme (`decline_duel`) ve 60 sn zaman aşımı eklenir. |
| Yüksek | Rate limit ve deneme sınırı | `@nestjs/throttler` + `helmet` eklenir. Doğrulama/sıfırlama kodu 5 yanlış denemede geçersiz olur ve `crypto.randomInt` ile üretilir. Yüklemelere dosya türü allowlist'i gelir. |
| Yüksek | E-posta teslimi | `mail.service.ts` şu an `SMTP_PORT`'u yok sayıyor (465'e sabit) ve gönderim başarısız olsa da başarılı diyor. Düzeltmeler: port env'den okunur, hata kullanıcıya iletilir, açılışta SMTP ayarı doğrulanır, `RESEND_FROM` env'i eklenir. Web'e "Kodu tekrar gönder" (60 sn bekleme) gelir. |
| Yüksek | Arkadaşlık istekleri (web) | Gelen istekler web'de görülüp kabul/ret edilebilir. Kenar çubuğunda istek sayısı rozeti. Backend uçları hazır. |
| Orta | Okunmamış DM rozetleri (web) | Nav'da ve arkadaş listesinde okunmamış mesaj göstergesi (`GET /messages/unread/dm-senders`). |
| Orta | Uygulama geneli bildirimler + PWA | Socket bağlantısı oda yerine uygulama seviyesine taşınır. DM, dürtme ve düello daveti her sayfada toast olarak görünür; sekme arka plandaysa tarayıcı bildirimi gönderilir. `vite-plugin-pwa` ile manifest ve service worker eklenir. |
| Orta | 404 ve hata sınırı | Bilinmeyen adreslerde 404 sayfası, çöken sayfada ErrorBoundary. `DMPage`'deki `premium={isOnline}` hatası düzeltilir. |
| Orta | Mobil: arka plan düzeltmesi | `sensor.tsx`, `AppState` ile uygulama arka plana geçince odağı durdurur; böylece süre yanlış sayılmaz. Mobilde yeni özellik eklenmez. |

### Faz 2: Çalışma özellikleri ✅ (tamamlandı, `faz-2` dalı)

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Yüksek | Çalışma oturumu geçmişi + dersler | Kullanıcı kendi derslerini (ad + renk) oluşturur (`Subject`). Her odak oturumu ayrı kaydedilir (`StudySession`: başlangıç, bitiş, süre, oda, ders). Analitik sayfasına ders dağılımı, oturum geçmişi ve aylık ısı haritası eklenir. Mobilin kullandığı `DailyAnalytics` aynen güncellenmeye devam eder. |
| Yüksek | Günlük/haftalık hedefler | Kullanıcı ayarlarda hedef belirler (`dailyGoalMinutes`, `weeklyGoalMinutes`, varsayılan kapalı). İlerleme halkası gösterilir; hedef tutulunca günde bir kez bonus coin verilir. |
| Orta | Odada görev listesi | Kişisel yapılacaklar listesi (`Task`). Odada yan panelde "bu turda ne yapacağım" yazılır; istenirse odada sohbet mesajı olarak paylaşılır. |
| Orta | Planlı çalışma oturumları | Arkadaşlarla ileri tarihli oturum planlama ve davet (`ScheduledSession`). Başlamadan 10 dk önce hatırlatma gider (`@nestjs/schedule`); mobil için mevcut push altyapısı kullanılır. |

### Faz 3: Sosyal özellikler ve görsel yenileme ✅ (tamamlandı, `faz-3` dalı)

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Yüksek | Oda sahibi kontrolleri | Odayı düzenleme/silme (`PATCH`/`DELETE /lobbies/:id`), kullanıcı çıkarma (`kick_user`), odayı yeni girişlere kilitleme (`lock_lobby`). |
| Yüksek | Engelleme, şikayet, admin | Engellenen kişi DM, düello, dürtme ve arkadaşlık isteği gönderemez. Mesaj veya kullanıcı şikayet edilebilir. `User.role` ('user' / 'admin') eklenir; admin web'deki `/app/admin` sayfasında şikayetleri inceler, kullanıcıyı susturur veya yasaklar. |
| Orta | Haftalık lig + yeni rozetler | Global ve arkadaşlar sıralaması Pazartesi 00:00'da (Türkiye saati) sıfırlanır. İlk 3'e coin ödülü verilir ve geçmiş haftaların şampiyonları görünür (`WeeklyResult`). Rozet kuralları tek dosyada (`users/badges.ts`) toplanır ve ~10 yeni rozet eklenir. |
| Orta | Kullanıcı arama + profil sayfası | Kullanıcı adıyla arama yapılabilir. Başkasının herkese açık profili (`/app/u/:id`) rozetleri, çerçeveyi ve istatistikleri gösterir; buradan arkadaş eklenebilir, DM gönderilebilir veya engellenebilir. |
| Orta | Mağaza, Analitik, Sıralama görsel yenilemesi | Yalnızca görünüm değişir, yeni işlev eklenmez. Mağazada kategori sekmeleri ve ürün önizleme kartları; Analitik'te özet kutuları ve okunur grafikler; Sıralama'da podyum ve kendi sıranı gösteren sabit satır. Tema token'ları ve `ui.tsx` bileşenleri kullanılır. |

### Faz 4: Test, altyapı ve görüntülü oda ✅ (tamamlandı, `faz-4` dalı)

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Yüksek | CI'a web job'u | Web şu an CI'da hiç derlenmiyor. Lint, build ve test adımları eklenir. |
| Yüksek | Web testleri | Vitest + Testing Library ile birim testleri; Playwright ile uçtan uca testler (kayıt/giriş, oda kur/katıl, sohbet, PDF tahtası). |
| Yüksek | Gateway testleri | `sensors.gateway.ts` için socket.io-client ile entegrasyon testleri: join/leave, oda doluluğu, şifreli oda mesaj yetkisi, rtc sinyal yetkisi, düello bahis doğrulaması. |
| Yüksek | TURN sunucusu | Kod hazır: `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` env'leri ve `.env.example`'da Metered örneği var. Sağlayıcının bağlanması Faz 5'e taşındı. |
| Orta | README + örnek veri | Doğru `docker compose` komutları ve port ayarları (`PORT`, `DB_PORT`, `VITE_BACKEND_URL`). `.env.example` dosyaları tamamlanır. `npm run seed` ile demo kullanıcılar, odalar ve oturum geçmişi oluşturulur. |
| Orta | Cihaz seçimi | Birden fazla kamera ve mikrofon arasında seçim, odaya girmeden önizleme ekranı. |
| Orta | Bağlantı kalitesi göstergesi | `RTCPeerConnection.getStats()` ile karo üzerinde zayıf bağlantı uyarısı. |
| Düşük | Ekran paylaşımında sistem sesi | `getDisplayMedia({ audio: true })` desteklenen tarayıcılarda. |

### Faz 5: Kapalı betaya hazırlık ⏳ (sıradaki)

Uygulama hâlâ geliştirme aşamasında. Bu fazın amacı, arkadaş çevresinden ilk gerçek kullanıcıların (kapalı beta) güvenle kullanabileceği hale gelmek. Şirket kurma, KVKK metinleri, gerçek tahsilat ve mağaza başvurusu bu fazda yapılmaz; Faz 6'ya kalır.

**Güvenlik ve veri kaybı**

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| ✅ | Demo Premium bayrağa bağlanır | Tamamlandı: `POST /users/demo/upgrade` yalnızca `ALLOW_DEMO_PREMIUM=true` olan ortamda çalışır, yoksa 403 döner. Canlıda tanımlı olmadığı için kapalı; mobildeki demo yükseltme düğmesi canlıda hata mesajı gösterir. |
| ✅ | Kalıcı veritabanı | Tamamlandı: veriler Render'dan Neon'a taşındı (Neon `production` dalı, PostgreSQL 17); canlı backend Neon'a bağlı. Neon'un ücretsiz plandaki geri yükleme süresi kontrol edilmeli. |
| ✅ | Dosya depolama | Tamamlandı: `StorageService` (`backend/src/storage/`) dosyaları Backblaze B2'ye (S3 uyumlu, gizli depo) yazar, `GET /uploads/:key` sunar; adresler (`/uploads/...`) değişmediği için mobil ve web etkilenmez. Test ve canlı için ayrı depo ve anahtar; test sitesinde yeniden deploy sonrası kalıcılık doğrulandı. |
| ✅ | Hesap silme | Tamamlandı: Ayarlar → "Hesabı sil" (`DELETE /users/me`, kullanıcı adı + varsa şifre ile onay). Oturumlar, dersler, görevler, arkadaşlıklar, engeller, şikayetler, lig sonuçları ve özel mesajlar silinir; oda sohbetindeki mesajlar kalır ama yazarı boşalır; sahibi olduğu odaların sahibi boşalır. Yüklediği dosyalar (avatar dışında) dosya depolama taşınınca ele alınacak. Mobilde henüz yok. |
| ✅ | TURN sunucusu bağlanır | Tamamlandı: Metered TURN (`TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`); test sitesinde Wi-Fi ile mobil veri arasında kameralı oda bağlantısı doğrulandı. Kimlik bilgileri şimdilik sabit; süreli kimlik bilgisine geçiş Faz 6'da. |

**Ödeme akışı (yalnızca sandbox / test modu)**

Gerçek para alınmadan bütün akış test ortamında kurulur; şirket kurulunca yalnızca API anahtarları değişir.

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
Karar: **dönemlik satın alma** (otomatik yenileme yok). Aylık ₺49, yıllık ₺499 (aylığa göre %15, yılda ₺89 tasarruf). Otomatik yenilenen abonelik gerçek kullanıcılar gelince değerlendirilir.

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| ✅ | Sağlayıcı: iyzico (ödeme formu) | Kod hazır: IYZWSv2 imzalı istemci (`payments/iyzico.client.ts`), iyzico'nun güvenli ödeme sayfası; kart bilgisi sunucumuza gelmez. Stripe taslağı kaldırıldı. Kalan: sandbox anahtarlarının test ortamına girilip test kartıyla denenmesi. |
| ✅ | Fiyat sunucuda | Planlar ve fiyatlar `payments/plans.ts`'te; istemci yalnızca `planId` gönderir, fazladan alan reddedilir. |
| ✅ | Sahte başarı yanıtı kaldırıldı | Sağlayıcı hata verirse ödeme "başarısız" kaydedilir ve kullanıcıya bildirilir. |
| ✅ | Premium süresi | `User.premiumUntil` (migration). Süresi dolan Premium'u saatlik görev kapatır; süre bitmeden alınan plan kalan sürenin sonuna eklenir. Elle verilen (bitiş tarihi olmayan) Premium etkilenmez. `isPremium` mobil uyumluluk için korunur. |
| ✅ | Ödeme onayı yalnızca sunucudan | iyzico dönüşünde sonuç iyzico'ya tekrar sorulur; ödeme durumu, tutar, sepet numarası, eşleştirme kimliği ve dolandırıcılık durumu tutmazsa Premium verilmez. Aynı ödeme iki kez işlenmez (eşzamanlı isteklerde de). `payments` tablosu her denemeyi kaydeder. |
| ✅ | Web ödeme ekranları | Premium sayfasında plan seçimi (yıllık indirim gösterilir), ödeme sonrası başarılı/başarısız/beklemede mesajları, Premium bitiş tarihi ve ödeme geçmişi. |
| Faz 6 | Fatura bilgisi | iyzico alıcı adı, adres ve TC kimlik numarası istiyor; şimdilik yer tutucu değerler gönderiliyor. Canlı tahsilattan önce ödeme sayfasında gerçek fatura bilgisi toplanır. |
| Faz 6 | Mobilde satın alma | Mobildeki eski demo ödeme ekranı artık hata mesajı gösteriyor; mobil ödeme mağaza kurallarıyla (Faz 6, "Mobil ödeme") ele alınacak. |

**Beta deneyimi ve takip**

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Yüksek | Hata takibi | Sentry (ücretsiz plan) backend ve web'e eklenir; başkaları kullanmaya başladığında hatalar ancak böyle görülür. Kapalı beta başlamadan önce kurulacak (Sentry hesabı gerekiyor). |
| ✅ | Staging ortamı | Tamamlandı: `staging` dalı → Render `studylounge-backend-staging` + Netlify dal deploy'u + Neon `staging` dalı. Test sitesinde "Test ortamı" etiketi görünür. Ayrıntılar README'deki "Ortamlar" bölümünde. |
| ✅ | Geri bildirim / hata bildir | Tamamlandı: menüdeki geri bildirim düğmesi (Hata / Öneri / Diğer; sayfa ve tarayıcı bilgisi otomatik eklenir, 10 dakikada 5 gönderim). Yöneticiler "Yönetim → Geri bildirimler"de görür ve tamamlandı olarak işaretler. |
| ✅ | Google ile giriş ve giriş ekranı | Tamamlandı: Google ile giriş (`POST /auth/google`, `googleId` kolonu), e-posta ya da kullanıcı adıyla giriş, kayıtta canlı şifre kuralları ve Chrome otomatik doldurma düzeltmesi. Google uygulaması şimdilik "Testing" modunda: yalnızca Google Cloud'da **Test users** listesine eklenen hesaplar Google ile girebilir (en fazla 100). Herkese açmak Faz 6'da. |
| ✅ | Onboarding | Tamamlandı: Odalar sayfasında "Masanı hazırla" kartı: ders ekle → günlük hedef seç → odada ilk lambanı yak. Adımlar gerçek veriden işaretlenir; hepsi bitince ya da kapatılınca görünmez. |

**Görsel kimlik: daha az yazı, daha çok görsel**

Uygulama ve açılış sayfası şu an yazı ağırlıklı. Yapay zekâyla üretilen, tek bir stile bağlı görsellerle anlatım sadeleşir ve marka tanınır hale gelir.

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Yüksek | Görsel stil rehberi | Önce tek bir stil belirlenir: mevcut lamba metaforu ve marka renkleri (turkuaz, açık pembe, krem) temel alınır. Tek bir prompt şablonu ve 2–3 referans görsel `docs/brand/` altında saklanır; sonraki bütün görseller bu şablonla üretilir, böylece hepsi aynı elden çıkmış gibi görünür. Kullanılan aracın ticari kullanım koşulları kontrol edilir. |
| Yüksek | Logo ve uygulama simgeleri | Logo (yatay ve yalnız işaret), favicon, PWA simgeleri (192/512 ve maskable), mobil uygulama simgesi ve açılış ekranı (splash), sosyal medya paylaşım görseli (Open Graph). Logo son halinde SVG olarak temizlenir; açık ve koyu temada denenir. Mobilde yalnızca simge ve splash değişir (`mobile/` kodu değişmez). |
| Orta | İllüstrasyonlar ve metin sadeleştirme | Yazı yoğun yerler görselle desteklenir ve yazıları kısaltılır: açılış sayfası, boş durumlar (oda yok, arkadaş yok, geçmiş yok), "Masanı hazırla" kartı, Premium sayfası, 404/hata sayfaları, e-posta şablonları. Görseller WebP/SVG olarak optimize edilir, her birine açıklayıcı alt metin yazılır. |

**Yönetim paneli**

Şu an `/app/admin` yalnızca şikayetleri ve geri bildirimleri gösteriyor. Kapalı betada uygulamayı izlemek ve kullanıcılara destek verebilmek için genişletilir. Bütün uçlar `RolesGuard` ile yalnızca `admin` rolüne açık kalır.

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Yüksek | Genel bakış | Toplam ve yeni kullanıcı (gün/hafta), günlük aktif kullanıcı, toplam odak süresi, şu an açık odalar ve odadaki kişi sayısı, açık şikayet ve geri bildirim sayısı; son 30 gün için basit grafikler. |
| Yüksek | Kullanıcı yönetimi | Kullanıcı arama (ad, kullanıcı adı, e-posta); kullanıcı ayrıntısı (kayıt tarihi, son görülme, odak süresi, Premium, rol, şikayet geçmişi); susturma/yasaklama (mevcut uçlar), rol verme, destek amacıyla Premium verme/geri alma, e-posta doğrulamayı elle onaylama, hesap silme. |
| Orta | Oda yönetimi | Bütün odaların listesi (kişi sayısı, sahibi, kilitli mi); odayı silme, kilitleme ve sahibini değiştirme. |
| Orta | Duyurular | Uygulamanın üstünde görünen kısa duyuru (bakım, yeni özellik); başlangıç ve bitiş zamanıyla. |
| Orta | İşlem kaydı | Hangi yöneticinin, kime, ne zaman, ne yaptığı (susturma, yasak, rol, Premium, silme) ayrı bir tabloda tutulur ve panelde listelenir. |
| Sonra | Ödeme kayıtları | Ödeme akışı kurulunca: işlem listesi, iade ve abonelik durumu. |

Önerilen sıra: güvenlik ve veri kaybı → ödeme akışı (sandbox) → beta deneyimi → yönetim paneli (genel bakış ve kullanıcı yönetimi) → görsel kimlik (stil rehberi ve logo) → arkadaş çevresiyle kapalı beta. İllüstrasyonlar, duyurular ve işlem kaydı beta sırasında tamamlanır.

### Faz 6: Yayına çıkış (gerçek kullanıcı ve gerçek para)

Kapalı beta oturduktan sonra, para almaya ve herkese açılmaya başlamadan önce yapılacaklar.

| Alan | Başlık | Not |
| :--- | :--- | :--- |
| Hukuk | Şirket ve fatura | Şahıs şirketi yeterli; fatura için e-Arşiv. |
| Hukuk | KVKK ve sözleşmeler | KVKK aydınlatma metni ve açık rıza (kamera, mesajlar ve çalışma verisi kişisel veri). Gizlilik politikası (görüntülü odalarda kayıt yok politikası dahil) ve kullanım koşulları. Web'de `/legal/...` sayfaları ve kayıt ekranında onay kutusu. |
| Hukuk | Satış metinleri | Mesafeli satış sözleşmesi, ön bilgilendirme formu ve iptal/iade politikası (dijital içerikte cayma hakkı istisnası açıkça bildirilir); ödeme sayfasında onay kutusuyla gösterilir. |
| Hukuk | Yaş sınırı | Öğrenci kitlesi nedeniyle 18 yaş altı kullanıcılar için veli onayı konusu netleştirilir. |
| Ödeme | Canlı tahsilat | iyzico canlı anahtarlarına geçilir; `ALLOW_DEMO_PREMIUM` kapalıdır. İsteğe bağlı: coin paketi satışı (mağaza zaten coin ile çalışıyor). |
| Ödeme | Mobil ödeme | Uygulama içinde Premium satarken Apple ve Google kendi ödeme sistemlerini zorunlu tutuyor (%15–30 komisyon). RevenueCat, mağaza ve web aboneliklerini aynı `premiumUntil` alanında birleştirir. |
| Altyapı | Süreli TURN kimlik bilgileri | Şu an Metered kullanıcı adı/şifresi sabit ve giriş yapmış her kullanıcıya `GET /rtc/ice-servers` ile veriliyor; kötüye kullanılırsa TURN kotası harcanabilir. Backend her istekte Metered API'sinden kısa ömürlü kimlik bilgisi üretir (`METERED_API_KEY`). |
| Altyapı | Ücretli sunucu ve izleme | Render'ın ücretsiz planı uyku moduna geçiyor ve socket bağlantıları kopuyor; ücretli plana geçilir. Uptime izleme ve log toplama (ör. Better Stack). |
| Büyüme | Ölçüm ve bildirimler | PostHog ya da Plausible ile kullanım analitiği. Seri bozulmak üzereyken ve haftalık özet için e-posta bildirimleri (mail servisi hazır). |
| Hesap | Google girişini herkese aç | Google Cloud → Google Auth Platform → Audience → **Publish app**. Uygulama yalnızca e-posta ve ad istediği için Google incelemesi gerekmez; ama yayına çıkarken onay ekranında uygulama adı, logo, destek e-postası, gizlilik politikası ve kullanım koşulları bağlantıları (KVKK maddesindeki `/legal/...` sayfaları) istenir. Kendi alan adına geçilirse yeni adres "Authorized JavaScript origins" listesine eklenir. |
| Hesap | Alan adı ve e-posta | Kendi alan adı (ör. `studylounge.app`) alınır; site bu adrese taşınır. E-posta göndericisi Gmail yerine bu alan adına geçirilir (Brevo'da SPF/DKIM doğrulaması). Böylece e-postaların spam'e düşme riski azalır. |
| Büyüme | Görünürlük ve destek | Meta etiketleri ve Open Graph görselleri, destek e-postası ya da iletişim formu (ödeme sağlayıcıları başvuruda istiyor). |
| Mobil | Mağaza yayını | EAS ile build; App Store ve Play Store başvurusu (`eas.json` hazır). |

## 🔭 Uzun vadede
- **SFU'ya geçiş (LiveKit / mediasoup):** Mesh topolojisi 6 kişide sınırlanıyor. Daha kalabalık kameralı odalar için medya sunucusu gerekir.
- **Mobilde kameralı odalara katılım:** Şu an mobil kullanıcılar kameralı odalarda kamerasız masa olarak görünür. `react-native-webrtc` ile izleme veya katılım eklenebilir.
- **Ölçeklenebilir durum:** Gateway'deki oturum, düello, arama, ortak tahta ve ortak sayaç durumu bellekte tutuluyor. Tek sunucuda sorun değil; ikinci bir sunucu açılmadan önce Redis adapter gerekir.
- **Kayıt yok politikası:** Görüntülü odalarda kayıt özelliği bilinçli olarak eklenmeyecek; bu karar Faz 6'daki gizlilik politikasında belgelenir.
