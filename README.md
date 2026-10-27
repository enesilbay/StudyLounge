# 🎓 StudyLounge — Sosyal Odaklanma Platformu

> **"Ayrı Masalarda, Aynı Lobide."**


[![NestJS](https://img.shields.io/badge/Backend-NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/Web-React%20%2B%20Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![WebRTC](https://img.shields.io/badge/Video-WebRTC%20P2P-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Render](https://img.shields.io/badge/Deployment-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://render.com/)

---

## 📌 Proje Hakkında

**StudyLounge**, evde veya kütüphanede tek başına ders çalışırken yaşanan yalnızlık, motivasyon kaybı ve dikkat dağılması sorunlarına yenilikçi bir çözüm sunan bir **sosyal odaklanma platformudur**. Web ve backend aynı depoda geliştirilir; proje şu an **kapalı beta hazırlığı** aşamasındadır (ödeme akışı yalnızca test/sandbox modunda).

### 💡 Temel Çözüm ve Felsefe
Geleneksel sanal çalışma odalarında kamera açma zorunluluğu mahremiyet endişesi yaratmaktadır. StudyLounge, web üzerinde **kamerası isteğe bağlı** ortak çalışma odaları sunar: normal odalar kamerasızdır ve masada kimin odakta, kimin molada olduğu görünür. Ek olarak Premium kullanıcıların kurduğu **kameralı odalarda** katılımcılar isteğe bağlı olarak **kamera, mikrofon ve ekran paylaşımı** açabilir.

- 🔕 **Varsayılan mahremiyet:** Kamera hiçbir odada zorunlu değildir; kameralı odalarda da kamera ve mikrofon kullanıcı açana kadar kapalıdır.
- 🔗 **Doğrudan bağlantı:** Görüntü ve ses sunucudan geçmez, tarayıcılar arasında **P2P WebRTC** ile akar ve kaydedilmez.
- 🤝 **Akademik dayanışma:** Odadaki herkesin masasında küçük bir "lamba" vardır; odaklananın lambası yanar.

---

## 🎨 Marka Kimliği ve Tasarım Dili

StudyLounge, öğrenci dostu, odaklanmayı teşvik eden sakin ve modern bir görsel dille tasarlanmıştır.

Projenin ana renkleri ve yazı tipleri aşağıdadır. Ayrıntılar (tipografi ölçeği, köşe, gölge, hareket, kontrast) [`docs/brand/marka-rehberi.md`](docs/brand/marka-rehberi.md) dosyasında; kod karşılıkları `web/src/index.css` içindeki `mb-*` token'larıdır.

| Eleman | Seçim | Açıklama |
| :--- | :--- | :--- |
| Zemin | `#FFFFFF` beyaz, `#F7F7F7` yüzey, `#ECECEC` bant | Sade, nötr ve aydınlık zemin |
| Yazı | `#000000` başlık, `#5C5C5C` gövde metni | Yüksek kontrast (gövde metni beyazda 6.7:1) |
| Ana renk (orman yeşili) | `#055049`, üzerine gelince `#1A746C` | Ana eylem ve "odakta" durumu; açık tonu `#E3EFED` |
| Başlık fontu | `Geist` (300) | İnce, sıkı harf aralıklı büyük başlıklar |
| Arayüz fontu | `Poppins` | Gövde metni ve arayüz |
| Biçim | Yuvarlak köşeler (kart 24px, düğme 14px), yumuşak gölgeler | |
| İmza öğe | Masa lambası | Odaklanan kullanıcının masa kartında lamba yanar |
| Pastel tonlar | `mb-tile-1…8` | Özet kutuları, rozetler, sol menü ikonları ve oda türleri kendi pastel renginde; yeşil yalnızca ana eylem ve "odakta" içindir |
| Üst çubuk | Sayfa başlığı + saydam imza | Hangi sayfadaysan başlığı üst çubukta görünür (renkli ikon rozeti, ince Geist); arkada saydam "StudyLounge" yazısı |

Bütün web sayfaları (açılış, giriş, uygulama ve yönetim paneli) bu renk ve yazı tiplerini kullanır. Yeni sayfalar `web/src/components/app/Kit.tsx` parçalarıyla (`AppPage`, `Card`, `TileStat`, `IconHeading`, `SegmentedTabs`, `EmptyState`) kurulur.

---

## 📐 Sistem Mimarisi ve Veri Akışı

Uygulama; katmanlı mimari, mikro ölçekli WebSocket event'leri ve TypeORM veri kalıcılığı üzerine kurulmuştur.

```mermaid
graph TD
    subgraph Web Client [React + Vite]
        WebUI[React Sayfaları]
        Media[getUserMedia / getDisplayMedia]
        Peer[RTCPeerConnection - PeerManager]
        WebSocket[Socket.IO Client]
    end

    subgraph Backend Core [NestJS Engine]
        Gateway[Lobby WebSocket Gateway]
        Rtc[RtcService: WebRTC Sinyalleşme]
        AuthModule[JWT Auth Module]
        LobbyModule[Lobbies Service & Controller]
        UserModule[Users & Analytics Service]
    end

    subgraph Data & Storage
        Postgres[(PostgreSQL DB)]
        StaticStorage[Uploads Folder / S3 Storage]
    end

    WebUI -->|HTTP REST| LobbyModule
    WebSocket <-->|Presence, sohbet, rtc_signal| Gateway
    Gateway --> Rtc
    Media --> Peer
    Peer <-.->|P2P medya: kamera, ses, ekran| Peer

    AuthModule --> UserModule
    LobbyModule --> Gateway
    UserModule --> Postgres
    LobbyModule --> Postgres
    Gateway --> StaticStorage
```

### 🎥 Web: Kamera ve Ekran Paylaşımı (P2P WebRTC)

Kameralı odalarda her katılımcı diğerleriyle doğrudan bir `RTCPeerConnection` kurar (**mesh** topolojisi). Bu yüzden kameralı odalar **en fazla 6 kişiliktir**. Sunucu medyayı görmez, yalnızca bağlantı kurulumu için gereken SDP ve ICE mesajlarını aynı odadaki kullanıcılar arasında taşır.

```mermaid
sequenceDiagram
    autonumber
    participant A as Ayşe (Tarayıcı)
    participant WS as NestJS Gateway + RtcService
    participant B as Burak (Tarayıcı)

    A->>WS: join_lobby → rtc_join {roomName}
    WS-->>A: rtc_peers [Burak]
    WS-->>B: rtc_peer_joined {Ayşe}
    A->>A: Kamerayı aç (getUserMedia) → addTrack
    A->>WS: rtc_signal {target: Burak, SDP offer}
    WS->>B: rtc_signal {from: Ayşe, offer}
    B->>WS: rtc_signal {target: Ayşe, SDP answer}
    WS->>A: rtc_signal {from: Burak, answer}
    A-->>B: ICE adayları (aynı yoldan)
    A<<->>B: Doğrudan medya akışı (SRTP)
    A->>WS: rtc_media_state {camera: true}
    WS-->>B: room_users (isCameraOn: true)
```

- **Perfect negotiation:** İki taraf aynı anda teklif gönderirse kullanıcı kimliği küçük olan taraf "kibar" davranıp geri çekilir. Böylece kamera ve ekran paylaşımı istenen sırayla açılıp kapatılabilir.
- **Ekran paylaşımı** ayrı bir `MediaStream` olarak gönderilir. Karşı taraf hangi stream'in ekran olduğunu bir `meta` sinyaliyle öğrenir ve onu büyük sahnede gösterir.
- **NAT geçişi:** Varsayılan olarak Google STUN kullanılır. Kurumsal ve okul ağlarında bağlantı kurulamazsa `TURN_URL`, `TURN_USERNAME` ve `TURN_CREDENTIAL` ile bir TURN sunucusu eklenebilir. İstemci bu listeyi `GET /rtc/ice-servers` ile alır.
- **Yetki:** Kameralı oda yalnızca **Premium** kullanıcılar tarafından kurulabilir (backend `403` döner). Odaya katılan herkes kamera açabilir.
- **Web'de odak takibi:** Odaklanma "Odaklan" düğmesiyle başlar. Sekme 60 saniyeden uzun gizli kalırsa odak otomatik duraklatılır (Page Visibility API).

---

## 🛠️ Teknoloji Yığını (Tech Stack)

### 🔴 Backend (`/backend`)
- **Framework:** NestJS (Node.js / TypeScript)
- **Veritabanı & ORM:** PostgreSQL & TypeORM
- **Gerçek Zamanlı İletişim:** WebSockets via Socket.IO
- **Kimlik Doğrulama:** JWT (JSON Web Tokens) & Passport.js
- **WebRTC Sinyalleşme:** `RtcService` + Socket.IO event'leri (`rtc_join`, `rtc_signal`, `rtc_media_state`, `rtc_leave`)
- **Doğrulama & Güvenlik:** Class-Validator (`ValidationPipe` whitelist), JWT korumalı soketler, CORS politikaları, `helmet`, `@nestjs/throttler` (istek sınırı)
- **Giriş:** E-posta/kullanıcı adı + şifre, e-posta doğrulama ve Google ile giriş (`google-auth-library`)
- **E-posta:** Brevo HTTPS API, Resend ya da SMTP (sırayla denenir); marka renkli ortak şablon (`backend/src/mail/mail-template.ts`)
- **Ödeme:** iyzico ödeme formu (şu an yalnızca sandbox); fiyatlar ve planlar sunucuda (`payments/plans.ts`)
- **Dosya depolama:** Backblaze B2 (S3 uyumlu, `@aws-sdk/client-s3`); ayarlanmazsa yerel `./uploads`
- **Hata takibi:** Sentry (`@sentry/nestjs`, yalnızca hata; kişisel veri temizlenir)
- **Test:** Jest (Unit Tests & E2E Integration Tests)

### 💻 Web (`/web`)
- **Framework:** React 19 + Vite, TypeScript
- **Stil:** Tailwind CSS v4 (`@theme` token'ları, açık/koyu tema)
- **Durum Yönetimi:** Zustand (oturum, bildirimler, dersler), React hook'ları
- **Animasyon ve ikonlar:** framer-motion (`LazyMotion`, "hareketi azalt" desteği), lucide-react
- **PDF tahtası:** `pdfjs-dist` (yalnızca tahta açılınca yüklenir)
- **Hata takibi:** `@sentry/react` (yalnızca hata, kaynak haritalı)
- **PWA:** `vite-plugin-pwa` (ana ekrana eklenebilir, service worker)
- **Test:** Vitest + Testing Library (birim), Playwright (uçtan uca)
- **Gerçek Zamanlı:** Socket.IO Client
- **Görüntülü İletişim:** Tarayıcı WebRTC API'leri (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`), harici kütüphane yok
- **Barındırma:** Netlify (`web/netlify.toml`)
- **Açılış sayfası görselleri:** Gerçek uygulamadan, demo hesaplarla `web/scripts/landing-shots.mjs` ile yeniden çekilir (bkz. "Açılış sayfası görselleri")

### 🐳 DevOps, CI/CD & Cloud Infrastructure
- **Containerization:** Multi-stage Dockerfile & Docker Compose Orchestration
- **CI/CD Pipeline:** GitHub Actions (Jest birim/E2E, socket.io gateway testleri, web Vitest + Playwright, typecheck, lint)
- **Cloud Hosting:** Render Web Service (Docker), Netlify (web), Neon (PostgreSQL), Backblaze B2 (dosyalar)
- **Versiyon Kontrol:** Git & GitHub

### 📁 Klasör Yapısı

```
StudyLounge/
├── backend/   NestJS API + Socket.IO gateway (auth, users, lobbies, study, league, payments, admin, rtc, whiteboard…)
├── web/       React 19 + Vite web uygulaması (açılış, uygulama, yönetim paneli)
├── docs/      Marka rehberi ve tasarım belgeleri
├── .github/   CI iş akışı (ci.yml)
└── ROADMAP.md Yol haritası ve proje durumu
```

---

## ✨ Temel Özellikler

1. 🎯 **Odak Takibi:**
   - "Odaklan" düğmesiyle süre başlar; odaklananın masasında lamba yanar.
   - Sekme uzun süre arka planda kalırsa odak otomatik duraklatılır.

2. 🚪 **Canlı Çalışma Lobileri (Study Lobbies):**
   - Genel, Özel ve Elite lobiler oluşturma ve katılma.
   - Odadaki katılımcıların anlık durumlarını (Odaklanıyor / Boşta) canlı izleme.

3. 💬 **Lobi Sohbeti & Görsel/Dosya Paylaşımı:**
   - Lobi üyeleri arasında anlık mesajlaşma.
   - Çalışma materyali, not ve görsel yükleme desteği.

4. 👋 **Nudge (Dürtme) & Sosyal Etkileşim:**
   - Arkadaş ekleme ve arkadaşların canlı durumunu görme.
   - Derse davet etmek için arkadaşlara tek tıkla anlık "Dürtme 👋" bildirimi gönderme.

5. 📊 **Analitik & Liderlik Tablosu (Leaderboard):**
   - Günlük, haftalık ve aylık toplam odaklanma süreleri grafiksel analizi.
   - Odaklanma sürelerine göre rütbe kazanma ve sıralamada yükselme.

6. 🎥 **Kameralı Odalar & Ekran Paylaşımı (Web):**
   - Premium kullanıcılar en fazla 6 kişilik kameralı oda kurabilir.
   - Katılımcılar kamera, mikrofon ve ekran paylaşımını istedikleri an açıp kapatabilir.
   - Paylaşılan ekran büyük sahnede gösterilir; birden fazla paylaşım varsa aralarında geçiş yapılır.

7. 📝 **Ortak PDF Tahtası ve Pomodoro (Web):**
   - Odadakiler aynı PDF ya da boş tahta üzerinde birlikte çizer; ortak Pomodoro sayacı herkesi aynı tura sokar.
   - **Odak ve mola süresini sen belirlersin:** odak 5–120 dk, mola 1–30 dk; hazır 15/25/45/60 dk seçenekleri de var. Seçimin tarayıcıda hatırlanır; mola süresi "Odayla" ortak sayacında uygulanır.

8. 📚 **Ders ve Görevler:**
   - Her odak oturumu ders, oda ve süreyle kaydedilir; analitikte ders dağılımı, 30 günlük takvim ve oturum geçmişi görünür.
   - Odada kişisel görev listesi ("bu turda" işaretleme, odada paylaşma).

9. 🏆 **Haftalık Lig ve Rozetler:**
   - Sıralama her pazartesi 00:00'da (Türkiye saati) sıfırlanır; ilk üç 100, 60 ve 30 puan alır.
   - Rozetler (seri, gece kuşu, ders ustası, haftanın şampiyonu…).

10. 🛡️ **Güvenlik ve Topluluk:**
    - Kullanıcı arama ve herkese açık profil; engelleme, mesaj/kullanıcı şikayeti ve yönetici paneli (susturma, yasaklama).
    - Oda sahibi kontrolleri: odayı düzenleme, kilitleme, kişiyi çıkarma, odayı kapatma.
    - İstek sınırı (rate limit), şifreli odaya sunucu tarafı erişim kontrolü, mağaza fiyatlarının sunucuda belirlenmesi.

11. 🔔 **Bildirimler (Web):**
    - Her sayfada DM, dürtme, davet ve rozet bildirimleri; sekme arka plandayken tarayıcı bildirimi.

12. 👑 **Premium ve Ödeme:**
    - Aylık ₺49, yıllık ₺499 (dönemlik satın alma, otomatik yenileme yok); kameralı ve Elite oda kurma, Elite odalarda 2 kat odak puanı.
    - iyzico güvenli ödeme sayfası (kart bilgisi sunucuya gelmez); ödeme onayı yalnızca sunucudan doğrulanır, aynı ödeme iki kez işlenmez. **Şu an yalnızca sandbox'ta**; canlı tahsilat Faz 6'da.

13. 🛍️ **Mağaza ve Profil:**
    - Odak puanıyla degrade profil çerçeveleri, profil kapağı, lamba rengi ve sohbet balonu rengi; 10 hazır avatar karakteri ya da fotoğraf yükleme.
    - Renkli özet kutuları, rütbe merdiveni ve rozet koleksiyonu (herkese açık profilde de).

14. 🧰 **Yönetim Paneli (`/admin`):**
    - Genel bakış (dönem karşılaştırmalı), kullanıcı yönetimi (arama, filtre, CSV), oda yönetimi, moderasyon (şikayetler, geri bildirimler), duyurular ve değiştirilemez işlem kaydı.

15. 👤 **Hesap:**
    - E-posta doğrulama, şifre sıfırlama, Google ile giriş, hesabı kalıcı silme ve menüden geri bildirim gönderme.

---

## 🐳 DevOps & Deployment Mühendisliği

StudyLounge projesi, modern DevOps prensiplerine uygun olarak konteynerize edilmiş ve sürekli entegrasyon (CI/CD) hatları ile desteklenmiştir.

### 1. 📦 Multi-Stage Docker Mimarisi (`backend/Dockerfile`)
Üretim ortamında minimum imaj boyutu ve yüksek güvenlik için Multi-Stage Build yapısı tercih edilmiştir:

```dockerfile
# Stage 1: Build Aşaması
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Aşaması
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD [ "npm", "run", "start:prod" ]
```

### 2. 🐙 Docker Compose Yapılandırması (`docker-compose.yml`)
Yerel geliştirmede yalnızca PostgreSQL konteyneri çalışır; backend isteğe bağlı bir profildir. Docker'daki backend, veritabanı `healthcheck`'ten geçmeden başlamaz (özet; tam dosya `docker-compose.yml`):

```yaml
services:
  postgres:
    image: postgres:15
    container_name: studylounge_db
    environment:
      POSTGRES_USER: ${DB_USER:-enes_admin}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-studylounge_secret}
      POSTGRES_DB: ${DB_NAME:-studylounge}
    ports:
      - "${DB_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-enes_admin} -d ${DB_NAME:-studylounge}"]

  # Yerelde backend `npm run start:dev` ile çalışır; Docker'da çalıştırmak için
  # `docker compose --profile docker-backend up -d`
  backend:
    profiles: ["docker-backend"]
    build: { context: ./backend, dockerfile: Dockerfile }
    depends_on:
      postgres:
        condition: service_healthy
```

### 3. ⚙️ GitHub Actions CI/CD Pipeline (`.github/workflows/ci.yml`)
Her `push` ve `pull_request` adımlarında otomatik test ve doğrulama süreçleri tetiklenir. Üç iş yeşil olmadan PR birleştirilmez: `backend-test`, `web-verify`, `web-e2e`.

- **Backend Job (`backend-test`):** `npm ci` ➔ `npm run build` ➔ Jest birim testleri ➔ E2E testleri (`npm run test:e2e`; REST uçları ve gerçek socket.io bağlantılarıyla gateway testleri).
- **Web Job (`web-verify`):** `npm ci` ➔ ESLint ➔ `npm run build` (tip kontrolü + Vite) ➔ Vitest birim testleri.
- **Web E2E Job (`web-e2e`):** Postgres servisi ➔ backend derlenip başlatılır ➔ `npm run seed` ➔ Playwright (Chromium) uçtan uca testleri. Hata olursa rapor artifact olarak saklanır.

### 4. 🌐 Cloud Deployment (Render Web Service)
Projenin canlı sunucu dağıtımı **Render** platformu üzerinde Docker runtime kullanılarak gerçekleştirilmiştir:
- **Binding:** Backend `0.0.0.0` IP adresi ve dinlenebilir port (`PORT`) üzerinden dış dünyaya açılmıştır.
- **CORS Yönetimi:** Production ortamında dinamik `CORS_ORIGIN` değişkeni ile güvenli origin yapılandırması sağlanır.
- **Environment Variables:** `JWT_SECRET`, `DATABASE_URL` (ya da `DB_*`), `DB_RUN_MIGRATIONS`, `CORS_ORIGIN`, e-posta (Brevo, Resend ya da SMTP; Render ücretsiz planı SMTP portlarını engellediği için canlıda Brevo) ve `TURN_*` değişkenleri cloud secrets üzerinden beslenir. Tam liste: `backend/.env.example`.

### 5. 🧭 Ortamlar: geliştirme, test ve canlı
Aynı kod üç ayrı ortamda, üç ayrı ayarla çalışır. Ortamlar **hiçbir şeyi paylaşmaz**: her birinin kendi veritabanı, kendi adresi ve kendi `JWT_SECRET`'ı vardır.

| | Geliştirme (dev) | Test (staging) | Canlı (prod) |
| :--- | :--- | :--- | :--- |
| **Git dalı** | Üzerinde çalışılan dal | `staging` | `main` |
| **Backend** | `npm run start:dev` | Render: `studylounge-backend-staging` | Render: `studylounge-backend` |
| **Web** | `npm run dev` (localhost:5173) | Netlify dal deploy'u: `staging--<site>.netlify.app` | Netlify ana site |
| **Veritabanı** | Docker Postgres (`docker compose up -d postgres`) | Neon `staging` dalı | Neon `production` dalı |
| **Veri** | Demo verisi (`npm run seed`) | Deneme verisi | Gerçek kullanıcılar |

**Kod akışı:** her değişiklik önce test ortamından geçer.
```
özellik dalı ──PR──► staging ──(test sitesinde denenir)──PR──► main ──► canlı
```
`staging` ya da `main` dalına gönderilen her commit, o ortamın backend'ini (Render) ve web sitesini (Netlify) otomatik olarak yeniden deploy eder. CI hem `staging`'e hem `main`'e açılan PR'larda çalışır.

**PR ön izlemeleri:** Netlify her PR için `deploy-preview-<N>--<site>.netlify.app` adresinde bir ön izleme açar. Bu ön izlemeler **test backend'ine** bağlanır (`web/netlify.toml` → `[context.deploy-preview.environment]`), yani canlı veriye dokunmaz. Test backend'i bu adreslere `CORS_ORIGIN_PATTERN` düzenli ifadesiyle izin verir. İfade tüm adrese uyacak şekilde otomatik `^…$` ile sarılır:
```
https://deploy-preview-\d+--cozy-melba-59db2a\.netlify\.app
```

**Ortama göre değişen ayarlar**

| Değişken | Geliştirme | Test | Canlı |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` | `production` | `production` |
| `DATABASE_URL` | yerel Docker | Neon `staging` | Neon `production` |
| `JWT_SECRET` | basit bir değer | **kendine özel** uzun değer | **kendine özel** uzun değer |
| `CORS_ORIGIN` | `*` | test web adresi | canlı web adresi |
| `CORS_ORIGIN_PATTERN` | gerekmez | PR ön izleme adresleri (aşağıda) | **ayarlanmaz** |
| `VITE_BACKEND_URL` (web) | `http://127.0.0.1:3000` | test backend adresi | canlı backend adresi |
| `DB_RUN_MIGRATIONS` | gerekmez | `true` | `true` |
| `THROTTLE_DISABLED` | olabilir | **olmaz** | **olmaz** |
| `ALLOW_DEMO_PREMIUM` | `true` | isteğe bağlı (`true`: Premium özellikleri denemek için) | **tanımlanmaz** |
| `S3_BUCKET` ve diğer `S3_*` | boş (yerel `./uploads`) | Backblaze B2 **test** deposu | Backblaze B2 **canlı** deposu |
| `IYZICO_*` | boş (ödeme kapalı) | iyzico **sandbox** anahtarları | canlı anahtarlar (şirket kurulunca, Faz 6) |
| `SENTRY_DSN` | boş (Sentry kapalı) | `studylounge-backend` projesinin DSN'i | aynı DSN |
| `SENTRY_ENVIRONMENT` | boş | `staging` | `production` |
| `VITE_SENTRY_DSN` (web) | boş (Sentry kapalı) | `web/netlify.toml` | `web/netlify.toml` |
| `SENTRY_AUTH_TOKEN` (Netlify, gizli) | boş (kaynak haritası yüklenmez) | Netlify paneli | Netlify paneli |

Test ortamı da `NODE_ENV=production` ile çalışır; böylece "test'te çalıştı, canlıda bozuldu" durumu yaşanmaz. Aradaki tek fark adresler, veritabanı ve gizli anahtarlardır. `JWT_SECRET` ortamlar arasında paylaşılmaz; paylaşılırsa test ortamında alınan oturum canlıda da geçerli olur.

**Kurallar**
- Canlı veritabanının verisi test ortamına kopyalanmaz. Test veritabanı gerektiğinde boşaltılıp `npm run seed` ile doldurulur.
- Yeni bir migration önce test ortamında çalışır (`DB_RUN_MIGRATIONS=true`), sorun yoksa canlıya gider.
- Gizli değerler (veritabanı adresleri, `JWT_SECRET`, SMTP şifreleri) yalnızca Render ve Netlify panellerinde tutulur, depoya yazılmaz.

---

## 🚀 Kurulum ve Lokal Çalıştırma

### 📋 Ön Gereksinimler
- **Node.js**: `v20.x` veya üzeri
- **Docker & Docker Compose** (Opsiyonel: Yerel PostgreSQL de kullanılabilir)

---

### 1️⃣ Repository'i Klonlayın
```bash
git clone https://github.com/enesilbay/StudyLounge.git
cd StudyLounge
```

---

### 2️⃣ Veritabanını Docker ile Başlatın
Yerel geliştirmede yalnızca PostgreSQL Docker'da çalışır; backend'i bir sonraki adımda kendiniz başlatırsınız:

```bash
docker compose up -d
```

> Backend'i de Docker'da çalıştırmak isterseniz: `docker compose --profile docker-backend up --build -d` (bu durumda 3. adımdaki `npm run start:dev`'i çalıştırmayın).

---

### 3️⃣ Backend'i Çalıştırın

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
# .env dosyasında JWT_SECRET'ı değiştirin; e-posta için Brevo, Resend ya da SMTP bilgilerini girin
npm run start:dev
```
Backend hazır olunca `http://localhost:3000/health` 200 döner. İlk açılışta geliştirme modu tabloları kendisi kurar.

**Demo verisi (sunum ve testler için):**
```bash
npm run seed
```
Altı doğrulanmış hesap (`demo_admin`, `demo_elif`, `demo_ali`, `demo_zeynep`, `demo_mert`, `demo_selin` @demo.studylounge, şifre `Demo12345!`), odalar, son 14 günün odak geçmişi, dersler, görevler ve bir planlı oturum oluşturur. Yalnızca kendi demo kayıtlarını yeniler; tekrar çalıştırmak güvenlidir.

**Dolu bir arayüz için (yalnızca yerel):**
```bash
SEED_ME_EMAIL=senin@epostan npm run seed:canli
```
11 oda (herkese açık, kameralı, Elite, şifreli), odalara yerleşmiş ve odakta 60'tan fazla sahte kullanıcı (`canli_01…@demo.studylounge`), bu haftanın odak geçmişi ve rozetler yazar. `SEED_ME_EMAIL` verirsen sahte kullanıcıların bir kısmı seninle arkadaş olur. Üretim veritabanında çalışmaz. `npm run seed` bu kullanıcıları ve odaları temizler. Odadaki kişi sayısı kullanıcıların "çevrim içi" olmasına bağlıdır; odalar boşalırsa betiği yeniden çalıştırın.

> **Port çakışması:** 3000 ya da 5432 başka bir projede kullanılıyorsa `backend/.env`'de `PORT=3100` ve `DB_PORT=5433`, proje kökündeki `.env`'de `DB_PORT=5433`, `web/.env`'de `VITE_BACKEND_URL=http://127.0.0.1:3100` yazın.

---

### 4️⃣ Web Uygulamasını Çalıştırın

```bash
cd web
npm install
cp .env.example .env      # VITE_BACKEND_URL backend adresini gösterir
npm run dev
```
Tarayıcıda `http://localhost:5173` adresini açın.

---

> ⚠️ Kamera ve ekran paylaşımı tarayıcı güvenliği gereği yalnızca **`localhost` veya HTTPS** üzerinde çalışır. Aynı ağdaki başka bir cihazdan `http://192.168.x.x` ile bağlanırsanız tarayıcı kameraya erişim vermez.

---

## 🧪 Testler

```bash
# Backend: birim testleri ve E2E (REST + socket.io gateway)
cd backend && npm test && npm run test:e2e

# Web: birim testleri
cd web && npm test

# Web: uçtan uca (çalışan backend + "npm run seed" gerekir)
cd web && npx playwright install chromium && npm run test:e2e
```
Uçtan uca testler kısa sürede çok giriş yapar. Arka arkaya çalıştırırken giriş sınırına takılırsanız backend'i `THROTTLE_DISABLED=true` ile başlatın (yalnızca üretim dışında etkilidir).

### 🖼️ Açılış sayfası görselleri

Açılış sayfasındaki uygulama görselleri gerçek uygulamadan çekilir; arayüz değişince yenilenmelidir:
```bash
# backend: npm run seed && npm run seed:canli && npm run start:dev
# web:     npm run dev
cd web && node scripts/landing-shots.mjs
```
Betik demo hesaplarla "Demo: Sessiz Kütüphane" odasına girer; Odalar sayfasını, sayaç panelini, ortak sayacı, sohbeti, masaları ve PDF tahtasını çekip `web/public/landing/` altına webp olarak yazar.

---

## 👮 Yönetici Hesabı

Şikayetleri inceleyen yönetici paneli (`/app/admin`) yalnızca `admin` rolündeki hesaplara açılır. Bir hesabı yönetici yapmak için:

```sql
UPDATE users SET role = 'admin' WHERE username = 'kullanici_adi';
```
Demo verisindeki `demo_admin` hesabı zaten yöneticidir.

---

## 🛡️ Repo Hijyeni ve Güvenlik Standartları

- 🔐 **Ortam Değişkenleri İzolasyonu:** Şifreler, API key'leri ve `JWT_SECRET` bilgileri kesinlikle versiyon kontrolüne (Git) eklenmez; `.env.example` şablonları kullanılır.
- 🛡️ **Gelişmiş DTO Validasyonu:** NestJS `ValidationPipe` ile gelen tüm payload'lar `whitelist: true` ve `forbidNonWhitelisted: true` kurallarıyla filtreler.
- 🎥 **Görüntülü İletişim Gizliliği:** Medya P2P akar ve kaydedilmez. Sunucu sinyalleri yalnızca aynı video odasındaki kullanıcılar arasında iletir (`RtcService.resolveSignalTarget`).
- 📂 **Statik Dosya Yönetimi:** Kullanıcı avatarları ve yüklenen notlar `/uploads` dizininde izole tutulur (Production için AWS S3 / Cloudinary mimarisi ile uyumludur).

---

## 👨‍💻 İletişim

- 👤 **Geliştirici:** Enes İlbay
- 📧 **E-Posta:** enesilbayy@gmail.com
- 🔗 **LinkedIn:** [linkedin.com/in/enes-ilbay](https://www.linkedin.com/in/enes-ilbay/)
- 🐙 **GitHub:** [@enesilbay](https://github.com/enesilbay)

---

<p align="center">
  <sub>StudyLounge — Ayrı Masalarda, Aynı Lobide.</sub>
</p>
