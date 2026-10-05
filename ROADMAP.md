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

Fazlar sırayla uygulanır: önce güvenlik, sonra yeni değer. Her faz ayrı commit/PR olarak gelir.

**Ortak kurallar**
- Backend'de yeni kolonlar varsayılan değerli olur, yeni socket event'leri isteğe bağlıdır. Böylece mobil istemci bozulmaz.
- Yeni özellikler web'e gelir. Mobilde yalnızca Faz 1'deki kritik düzeltmeler yapılır.
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

### Faz 3: Sosyal özellikler ve görsel yenileme

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Yüksek | Oda sahibi kontrolleri | Odayı düzenleme/silme (`PATCH`/`DELETE /lobbies/:id`), kullanıcı çıkarma (`kick_user`), odayı yeni girişlere kilitleme (`lock_lobby`). |
| Yüksek | Engelleme, şikayet, admin | Engellenen kişi DM, düello, dürtme ve arkadaşlık isteği gönderemez. Mesaj veya kullanıcı şikayet edilebilir. `User.role` ('user' / 'admin') eklenir; admin web'deki `/app/admin` sayfasında şikayetleri inceler, kullanıcıyı susturur veya yasaklar. |
| Orta | Haftalık lig + yeni rozetler | Global ve arkadaşlar sıralaması Pazartesi 00:00'da (Türkiye saati) sıfırlanır. İlk 3'e coin ödülü verilir ve geçmiş haftaların şampiyonları görünür (`WeeklyResult`). Rozet kuralları tek dosyada (`users/badges.ts`) toplanır ve ~10 yeni rozet eklenir. |
| Orta | Kullanıcı arama + profil sayfası | Kullanıcı adıyla arama yapılabilir. Başkasının herkese açık profili (`/app/u/:id`) rozetleri, çerçeveyi ve istatistikleri gösterir; buradan arkadaş eklenebilir, DM gönderilebilir veya engellenebilir. |
| Orta | Mağaza, Analitik, Sıralama görsel yenilemesi | Yalnızca görünüm değişir, yeni işlev eklenmez. Mağazada kategori sekmeleri ve ürün önizleme kartları; Analitik'te özet kutuları ve okunur grafikler; Sıralama'da podyum ve kendi sıranı gösteren sabit satır. Tema token'ları ve `ui.tsx` bileşenleri kullanılır. |

### Faz 4: Test, altyapı ve görüntülü oda

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Yüksek | CI'a web job'u | Web şu an CI'da hiç derlenmiyor. Lint, build ve test adımları eklenir. |
| Yüksek | Web testleri | Vitest + Testing Library ile birim testleri; Playwright ile uçtan uca testler (kayıt/giriş, oda kur/katıl, sohbet, PDF tahtası). |
| Yüksek | Gateway testleri | `sensors.gateway.ts` için socket.io-client ile entegrasyon testleri: join/leave, oda doluluğu, şifreli oda mesaj yetkisi, rtc sinyal yetkisi, düello bahis doğrulaması. |
| Yüksek | TURN sunucusu | Okul ve kurumsal ağlarda P2P bağlantı kurulamayabilir. `TURN_URL` env'i hazır, bir sağlayıcı (ör. Metered, coturn) bağlanmalı. |
| Orta | README + örnek veri | Doğru `docker compose` komutları ve port ayarları (`PORT`, `DB_PORT`, `VITE_BACKEND_URL`). `.env.example` dosyaları tamamlanır. `npm run seed` ile demo kullanıcılar, odalar ve oturum geçmişi oluşturulur. |
| Orta | Cihaz seçimi | Birden fazla kamera ve mikrofon arasında seçim, odaya girmeden önizleme ekranı. |
| Orta | Bağlantı kalitesi göstergesi | `RTCPeerConnection.getStats()` ile karo üzerinde zayıf bağlantı uyarısı. |
| Düşük | Ekran paylaşımında sistem sesi | `getDisplayMedia({ audio: true })` desteklenen tarayıcılarda. |

## 🔭 Uzun vadede
- **Ödeme entegrasyonu:** Stripe PaymentIntent altyapısı backend'de var. Premium satın alma akışı (webhook ile Premium verme) tamamlanmalı. Sunum için demo Premium (`POST /users/demo/upgrade`) şimdilik kalıyor.
- **SFU'ya geçiş (LiveKit / mediasoup):** Mesh topolojisi 6 kişide sınırlanıyor. Daha kalabalık kameralı odalar için medya sunucusu gerekir.
- **Mobilde kameralı odalara katılım:** Şu an mobil kullanıcılar kameralı odalarda kamerasız masa olarak görünür. `react-native-webrtc` ile izleme veya katılım eklenebilir.
- **Ölçeklenebilir durum:** Gateway'deki oturum, düello ve arama durumu bellekte tutuluyor; birden fazla sunucu için Redis adapter gerekir.
- **Kayıt yok politikası:** Görüntülü odalarda kayıt özelliği bilinçli olarak eklenmeyecek; bu karar gizlilik metninde belgelenmeli.
