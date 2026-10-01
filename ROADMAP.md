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

| Öncelik | Başlık | Not |
| :--- | :--- | :--- |
| Yüksek | TURN sunucusu | Okul ve kurumsal ağlarda P2P bağlantı kurulamayabilir. `TURN_URL` env'i hazır, bir sağlayıcı (ör. Metered, coturn) bağlanmalı. |
| Yüksek | Gateway testleri | `sensors.gateway.ts` için socket.io-client ile entegrasyon testleri (join/leave, rtc sinyal yetkisi). |
| Orta | Cihaz seçimi | Birden fazla kamera ve mikrofon arasında seçim, önizleme ekranı. |
| Orta | Bağlantı kalitesi göstergesi | `RTCPeerConnection.getStats()` ile karo üzerinde zayıf bağlantı uyarısı. |
| Orta | Ekran paylaşımında sistem sesi | `getDisplayMedia({ audio: true })` desteklenen tarayıcılarda. |
| Düşük | Ödeme entegrasyonu | Stripe PaymentIntent altyapısı backend'de var, Premium satın alma akışı tamamlanmalı. |

## 🔭 Uzun vadede
- **SFU'ya geçiş (LiveKit / mediasoup):** Mesh topolojisi 6 kişide sınırlanıyor. Daha kalabalık kameralı odalar için medya sunucusu gerekir.
- **Mobilde kameralı odalara katılım:** Şu an mobil kullanıcılar kameralı odalarda kamerasız masa olarak görünür. `react-native-webrtc` ile izleme veya katılım eklenebilir.
- **Ölçeklenebilir durum:** Gateway'deki oturum, düello ve arama durumu bellekte tutuluyor; birden fazla sunucu için Redis adapter gerekir.
- **Kayıt yok politikası:** Görüntülü odalarda kayıt özelliği bilinçli olarak eklenmeyecek; bu karar gizlilik metninde belgelenmeli.
