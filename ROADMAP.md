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
| Yüksek | Günlük/haftalık hedefler | Web'den kaldırıldı (kullanıcı kararı, Ekim 2026): sol menüdeki hedef kutusu, Ayarlar'daki hedef formu, Analitik'teki hedef çizgisi, ilk giriş adımı ve hedef bildirimi çıkarıldı. Backend'deki `dailyGoalMinutes`/`weeklyGoalMinutes` kolonları ve günlük hedef bonusu henüz duruyor; tamamen silinmesi ayrı bir iş. |
| Orta | Odada görev listesi | Kişisel yapılacaklar listesi (`Task`). Odada yan panelde "bu turda ne yapacağım" yazılır; istenirse odada sohbet mesajı olarak paylaşılır. |
| Orta | Planlı çalışma oturumları | Web'den kaldırıldı (kullanıcı kararı, Ekim 2026): arayüz, bildirimler ve rozet çıkarıldı. Backend'deki `ScheduledSession` uç noktaları, tablo ve hatırlatma görevi henüz duruyor; tamamen silinmesi ayrı bir iş (migration gerekir). |

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
| ✅ | Sağlayıcı: iyzico (ödeme formu) | Kod hazır: IYZWSv2 imzalı istemci (`payments/iyzico.client.ts`), iyzico'nun güvenli ödeme sayfası; kart bilgisi sunucumuza gelmez. Stripe taslağı kaldırıldı. Sandbox anahtarlarıyla test ortamında test kartıyla denendi, çalışıyor. |
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
| ✅ | Hata takibi | Tamamlandı (15 Ekim 2026, PR #45–#47): Sentry (ücretsiz plan, EU bölgesi), org `enes-ilbay`, projeler `studylounge-backend` ve `studylounge-web`. Yalnızca hata takibi yapılır (tracing ve Replay kapalı). Backend'de `SENTRY_DSN` ve `SENTRY_ENVIRONMENT` (Render) kullanılır; 4xx hataları gönderilmez, socket, ödeme, e-posta ve push hataları bildirilir. Web'de DSN `netlify.toml`'da (PR ön izlemelerinde kapalı); SDK ayrı parça olarak sonradan yüklenir; kaynak haritaları `SENTRY_AUTH_TOKEN` (Netlify) ile yüklenip yayından silinir. Kullanıcı yalnızca numarasıyla görünür; çerez, gövde, sorgu ve IP gönderilmez (Sentry il düzeyinde yaklaşık konumu yine de bağlantıdan çıkarır). Yönetim paneli → Genel bakış → "Hata takibini dene". Test ortamında backend ve web, canlıda web doğrulandı; canlı backend testi, canlıda yönetici hesabı olmadığı için yapılmadı. |
| ✅ | Staging ortamı | Tamamlandı: `staging` dalı → Render `studylounge-backend-staging` + Netlify dal deploy'u + Neon `staging` dalı. Test sitesinde "Test ortamı" etiketi görünür. Ayrıntılar README'deki "Ortamlar" bölümünde. |
| ✅ | Geri bildirim / hata bildir | Tamamlandı: menüdeki geri bildirim düğmesi (Hata / Öneri / Diğer; sayfa ve tarayıcı bilgisi otomatik eklenir, 10 dakikada 5 gönderim). Yöneticiler "Yönetim → Geri bildirimler"de görür ve tamamlandı olarak işaretler. |
| ✅ | Google ile giriş ve giriş ekranı | Tamamlandı: Google ile giriş (`POST /auth/google`, `googleId` kolonu), e-posta ya da kullanıcı adıyla giriş, kayıtta canlı şifre kuralları ve Chrome otomatik doldurma düzeltmesi. Google uygulaması şimdilik "Testing" modunda: yalnızca Google Cloud'da **Test users** listesine eklenen hesaplar Google ile girebilir (en fazla 100). Herkese açmak Faz 6'da. |
| ✅ | Onboarding | Web'den kaldırıldı (kullanıcı kararı, 22 Ekim 2026): Odalar sayfasındaki "Masanı hazırla" kartı çıkarıldı. Yönetim panelindeki onboarding hunisi (backend verisi) duruyor. |

**Mağaza ve avatar (22 Ekim 2026)**

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| ✅ | Avatar seçimi | Profilde 10 hazır karakterden seçim ya da fotoğraf yükleme (`PUT /users/me/avatar-character`). Kayıtta isteğe bağlı Kadın / Erkek seçimi; o gruptan rastgele karakter atanır, cinsiyet kaydedilmez. Karakterler `avatarUrl`'de `/avatars/avatar-NN.webp` olarak tutulur ve backend tarafından da sunulur (mobil de gösterir). Yüklenen fotoğrafın web'de yalnızca odada görünmesi hatası düzeltildi. |
| ✅ | Mağaza yenilemesi | İsim ikonları web'den kaldırıldı (mobil uyumluluk için katalogda duruyor). Degrade çerçeveler (9 çerçeve; Aurora ve Gökkuşağı döner), profil kapağı, lamba rengi (odada odaklanınca kutunun ışığı), web'de de görünen mesaj balonu rengi ve seri koruma (en fazla 2; kaçırılan her gün için biri kendiliğinden harcanır). Migration `1780200000000`. Ürün renkleri `web/src/lib/cosmetics.ts`'te veri olarak tutulur (marka token'ı değildir). |

**Görsel kimlik: daha az yazı, daha çok görsel**

Uygulama ve açılış sayfası şu an yazı ağırlıklı. Yapay zekâyla üretilen, tek bir stile bağlı görsellerle anlatım sadeleşir ve marka tanınır hale gelir.

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Yüksek | Görsel stil rehberi | Stil belirlendi: 3B nesne tarzı, lamba metaforu ve yeni marka renkleri (beyaz/açık gri, siyah, orman yeşili; bkz. `docs/brand/marka-rehberi.md`). Tek bir prompt şablonu ve 2–3 referans görsel `docs/brand/` altında saklanır; sonraki bütün görseller bu şablonla üretilir, böylece hepsi aynı elden çıkmış gibi görünür. Kullanılan aracın ticari kullanım koşulları kontrol edilir. |
| Yüksek | Logo ve uygulama simgeleri | Logo (yatay ve yalnız işaret), favicon, PWA simgeleri (192/512 ve maskable), mobil uygulama simgesi ve açılış ekranı (splash), sosyal medya paylaşım görseli (Open Graph). Logo son halinde SVG olarak temizlenir; açık ve koyu temada denenir. Mobilde yalnızca simge ve splash değişir (`mobile/` kodu değişmez). |
| Orta | İllüstrasyonlar ve metin sadeleştirme | Yazı yoğun yerler görselle desteklenir ve yazıları kısaltılır: açılış sayfası, boş durumlar (oda yok, arkadaş yok, geçmiş yok), "Masanı hazırla" kartı, Premium sayfası, 404/hata sayfaları, e-posta şablonları. Görseller WebP/SVG olarak optimize edilir, her birine açıklayıcı alt metin yazılır. |

**Yönetim paneli**

Şu an `/app/admin` yalnızca şikayetleri ve geri bildirimleri gösteriyor. Kapalı betada uygulamayı izlemek ve kullanıcılara destek verebilmek için genişletilir. Bütün uçlar `RolesGuard` ile yalnızca `admin` rolüne açık kalır.

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| ✅ | Genel bakış | Tamamlandı: panel uygulamadan ayrı `/admin` düzenine taşındı (sol menü: Genel bakış, Moderasyon; diğer bölümler kendi aşamalarında eklenir). Dönem seçimi (7/30/90 gün, Türkiye takvim günleri), önceki döneme göre değişim, bekleyenler şeridi, aktif kullanıcı (`users.lastSeenAt`), günlük eğilim grafiği, onboarding hunisi, elde tutma (1/7/30. gün) ve yoğun saatler ısı haritası. Kayıt tarihi (`users.createdAt`) bu sürümle tutulmaya başladı; eski hesaplar migration gününde kaydolmuş görünür. |
| ✅ | Kullanıcı yönetimi | Tamamlandı: `/admin/users` arama (ad, kullanıcı adı, e-posta), birleştirilebilir filtreler, sıralama, sayfalama ve CSV dışa aktarma (Excel uyumlu, formül kaçışlı; dışa aktarma da kayda yazılır). Sağda açılan ayrıntı paneli: hesap, son 30 gün odak, son oturumlar, şikayetler, ödemeler ve kişiye ait işlem kaydı. Onaylı işlemler: susturma, yasak, rol, Premium verme/uzatma/geri alma, e-postayı doğrulanmış sayma, hesap silme (kullanıcı adı + gerekçe). Yönetici kendine rol değiştiremez ve kendini silemez; başka yöneticiye susturma, yasak ve silme uygulanamaz. Ctrl+K ile genel arama. |
| ✅ | Oda yönetimi | Tamamlandı: `/admin/rooms` sayfasında bütün odaların listesi (kişi sayısı, sahibi, kilitli/şifreli/kameralı); odayı kilitleme, sahibini değiştirme ve kapatma. Her işlem işlem kaydına yazılır. |
| ✅ | Duyurular | Tamamlandı: `/admin/announcements` sayfasından kısa duyuru (en fazla 280 karakter, Bilgi/Uyarı türü) başlangıç ve bitiş zamanıyla yayınlanır; planlama, şimdi bitirme ve silme vardır. Uygulamada üst çubuğun altında şerit olarak görünür (`GET /announcements/active`, 5 dakikada bir tazelenir); kullanıcı kapatınca o tarayıcıda bir daha görünmez. Odak odasında şerit yoktur. Yeni `announcements` tablosu (migration `1780100000000`); yayınlama, bitirme ve silme işlem kaydına yazılır. Mobil bu ucu kullanmaz. |
| ✅ | İşlem kaydı | Tamamlandı: `admin_actions` tablosu ve `/admin/actions` sayfası; susturma, yasak, rol, Premium, e-posta onayı, hesap silme, şikayet kapatma ve liste indirme kaydedilir. Kayıtlar düzenlenemez; hedef silinse de kullanıcı adı kayıtta kalır. |
| Sonra | Ödeme kayıtları | Ödeme akışı kurulunca: işlem listesi, iade ve abonelik durumu. |

**Impeccable ile proje analizi**

Kapalı betadan önce, web arayüzü Impeccable ile baştan sona taranır; böylece arkadaşların ilk gördüğü ekranlarda tutarsızlık ve erişilebilirlik sorunu kalmaz. Bulgular yeni özellik eklemeden, küçük düzeltme PR'larıyla (`duzeltme/...`) kapatılır.

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Yüksek | Tasarım eleştirisi ve denetim | Impeccable `critique` ve `audit` ile ana akışlar taranır: giriş/kayıt, odalar, oda içi (kamera, PDF tahtası), Premium, ayarlar, yönetim paneli, açılış sayfası. Bulgular önem sırasıyla listelenir; hata ve erişilebilirlik sorunları (kontrast, klavye, odak halkası, alt metin) önce düzeltilir. |
| Orta | Tema ve bileşen tutarlılığı | `web/src/index.css` token'ları ve `ui.tsx` bileşenleri dışında sabit renk ya da tek seferlik stil kalmış mı kontrol edilir; vurgu rengi (orman yeşili) yalnızca "odakta" ve ana eylemde kullanılır. Gerekirse `polish` ile ince ayar yapılır. |
| Orta | Mobil genişlik ve duyarlılık | Web'in telefon genişliğinde (360–430 px) kırılma, taşma ve dokunma hedeflerine göre gözden geçirilmesi. |
| Düşük | Performans ve boş/hata durumları | Yükleme, boş ve hata durumları ile ilk yükleme boyutu denetlenir. |

Çıktı: kısa bir bulgu raporu (`docs/` altında) ve kapatılan/ertelenen maddelerin listesi. Görsel kimlik işleriyle çakışan bulgular (logo, illüstrasyon) o başlıklara aktarılır.

Önerilen sıra: güvenlik ve veri kaybı → ödeme akışı (sandbox) → beta deneyimi → yönetim paneli (genel bakış ve kullanıcı yönetimi) → görsel kimlik (stil rehberi ve logo) → Impeccable ile proje analizi → arkadaş çevresiyle kapalı beta → Faz 6. İllüstrasyonlar, duyurular ve işlem kaydı beta sırasında tamamlanır.

**Güncel sıra (14 Ekim 2026):** web tasarımı ertelendi (en sonda). Faz 5'in kalanı şu sırayla yapılır: (1) yönetim paneli: oda yönetimi ✅ → (2) duyurular ✅ → (3) erişilebilirlik düzeltmeleri ✅ (modal odak yönetimi, menü/sekme klavye erişimi, sohbet canlı bölgeleri, kontrast, "İçeriğe geç"; PR #39–#42) → (4) Sentry hata takibi ✅ (PR #45–#47) → **kapalı beta (sıradaki)** → Faz 6.

### Faz 6: Yayına çıkış (gerçek kullanıcı ve gerçek para)

Kapalı beta oturduktan sonra, para almaya ve herkese açılmaya başlamadan önce yapılacaklar.

| Alan | Başlık | Not |
| :--- | :--- | :--- |
| Hukuk | Şirket ve fatura | Şahıs şirketi yeterli; fatura için e-Arşiv. |
| Hukuk | KVKK ve sözleşmeler | KVKK aydınlatma metni ve açık rıza (kamera, mesajlar ve çalışma verisi kişisel veri). Gizlilik politikası (görüntülü odalarda kayıt yok politikası dahil; hata takibi için Sentry'nin (AB) teknik hata bilgisi ve yaklaşık konum işlediği belirtilir) ve kullanım koşulları. Web'de `/legal/...` sayfaları ve kayıt ekranında onay kutusu. |
| Hukuk | Satış metinleri | Mesafeli satış sözleşmesi, ön bilgilendirme formu ve iptal/iade politikası (dijital içerikte cayma hakkı istisnası açıkça bildirilir); ödeme sayfasında onay kutusuyla gösterilir. |
| Hukuk | Yaş sınırı | Öğrenci kitlesi nedeniyle 18 yaş altı kullanıcılar için veli onayı konusu netleştirilir. |
| Ödeme | Canlıya taşıma ve canlı tahsilat | Ödeme kodu (PR #24) şu an yalnızca `staging`'de; test ortamında sandbox ile doğrulandı. Canlıya (`main`) Faz 6'da taşınır. Not: sonraki `staging` → `main` PR'ları bu kodu da taşır; canlıda `IYZICO_*` tanımlı olmadığı için ödeme düğmesi "Ödeme şu an kapalı" görünür, ama `premiumUntil` ve `payments` migration'ı çalışır. Canlıya geçişte: iyzico canlı anahtarları girilir, gerçek fatura bilgisi toplanır, `ALLOW_DEMO_PREMIUM` kapalı kalır. İsteğe bağlı: coin paketi satışı (mağaza zaten coin ile çalışıyor). |
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

## ⏸️ Ertelenen: web ön yüz yeniden tasarımı (Ekranlar v3)

Kullanıcı kararı (14 Ekim 2026): web arayüzünün yeniden tasarımı şimdilik rafa kalktı; arka uç, ödeme, beta hazırlığı ve yayın işleri önce gelir. Yeniden başlanınca plan ve durum tablosu `docs/brand/yeniden-tasarim-plani.md` içinde (özellikle "Ekranlar v3" bölümü), dal `ozellik/ekranlar-v3`.

| Durum | Başlık | Not |
| :--- | :--- | :--- |
| ✅ | Ortak kurallar, odak odası 3. sürüm (Meet/Discord düzeni), Ekranlar v3 adım 0 | Yapıldı: mb token'ları, Kit'e `OverflowMenu`/`LiveBadge`/`CountBadge`/`AvatarStack`/`Skeleton`/`ErrorState`, ikonlu `EmptyState`, açılış sayfası görselleri yeni oda düzeniyle güncel. |
| ✅ | Analitik sayfası (22 Ekim 2026) | Dönem seçimi (7/30/90 gün) ve önceki döneme göre değişim, koyu özet bandı, renkli özet kutuları, ortalama çizgili günlük grafik, ders halka grafiği, gün × saat çalışma ritmi, 12 haftalık takvim ve güne göre gruplu oturum listesi. Backend değişmedi (`/study/summary`, `/study/sessions`). |
| ✅ | Sıralama, Arkadaşlar, Profil ve sol menü (22 Ekim 2026) | Sıralama: canlı geri sayım, "senin sıran" ve bir üst sıraya kalan süre, altın/gümüş/bronz kürsü. Arkadaşlar: "Şu an aktif" şeridi, odadaki arkadaşa oda etiketi ve "Odaya katıl", sohbette gün ayraçları ve satın alınmış balon renkleri. Profil: renkli özet kutuları, ikonlu rütbe merdiveni (herkese açık profilde de), son 7 gün grafiği, renkli rozetler. Menüde her sayfanın kendi pastel rengi. |
| ✅ | Renklendirme, üst çubuk başlığı ve ayarlar (24 Ekim 2026) | Sayfa başlığı üst çubukta (renkli ikon rozeti, saydam StudyLounge imzası); Odalar (tür bazlı pastel sütunlar, küçültülmüş üst bar), rozetler, Ayarlar, Geri bildirim, Sıralama, Arkadaş ekle renklendirildi; pencerelerde gövde kayar, düğmeler altta sabit. Odak ve mola süresi kullanıcı tarafından ayarlanır (5–120 / 1–30 dk). E-posta şablonu marka renklerine alındı. Açılış sayfası görselleri yeniden çekildi (`web/scripts/landing-shots.mjs`), alt bar yenilendi. Yerelde dolu arayüz için `npm run seed:canli`. |
| Ertelendi | Ekranlar v3 adım 1–6 | Uygulama kabuğu + Odalar; Arkadaşlar + Sıralama; Profil; Analitik + Ayarlar; Mağaza + Premium; 404 + oda yan pencereleri. |
| Ertelendi | Yeniden tasarım planının 3–10. adımları | Landing page, giriş ekranı, profil, analitik, sıralama, premium, mağaza, arkadaşlar, ayarlar (bkz. plan belgesi). |
| Ertelendi | Impeccable ile proje analizi | Faz 5'teki tasarım eleştirisi/denetimi, tema tutarlılığı ve telefon genişliği taramaları tasarım çalışmasıyla birlikte yapılır; erişilebilirlik hataları (kontrast, klavye, odak halkası) kapalı betadan önce yine de düzeltilmelidir. |
