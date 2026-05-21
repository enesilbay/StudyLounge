# StudyLounge Web Entegrasyon ve İyileştirme Planı

Bu plan, StudyLounge web uygulamasının mock verilerden kurtulup gerçek backend'e bağlanması ve mobil taraftaki özelliklerle eşzamanlı çalışabilmesi için hazırlanmıştır. Ayrıca build hatalarını giderip stabil bir web versiyonu oluşturmayı amaçlar.

## User Review Required

> [!WARNING]
> Web ve mobil arasında bazı UI/UX farkları var. Mobildeki AvatarWithFrame, Rank Badge gibi bileşenleri web için yeniden yazmamız gerekecek (veya mobilden ortak bir klasöre taşıma, ancak monorepo yapısı kurulu olmadığı için web içerisinde oluşturacağız). 
> Bu bileşenlerin tasarımlarında mobildeki "C" (Colors) sabitleriyle uyumlu web için Tailwind konfigürasyonunu güncel tutacağız. Lütfen bu yaklaşımı onaylayın.

## Open Questions

> [!IMPORTANT]
> - Backend'de web üzerinden (örn: dosya yükleme - resim/pdf) atılacak veriler için AWS S3 veya benzeri bir depolama servisi halihazırda bağlı mı?
> - Web'deki Premium demo sayfası, mobildeki gibi basit bir `upgrade` endpoint'ine mi vuracak yoksa Stripe/Iyzico entegrasyonu var mı?

## Proposed Changes

### 1. Web Build Temizliği
Bu aşamada sadece `npm run build` sonucunda patlayan kullanılmayan değişken hatalarını temizleyeceğiz.
- **`src/App.tsx`, `src/pages/*.tsx`, `src/components/Layout/AppLayout.tsx`, `src/router.tsx`**: Kullanılmayan tüm `React`, `motion`, `logout`, `roomUsers`, ikon (Shield, Bell, Medal vb.) ve router (`Outlet`) import ve değişkenlerini silme/düzenleme.

### 2. Auth & Store Standardizasyonu
- **`src/store/authStore.ts`**: Uygulama açıldığında (app load) local storage'daki token ile `/users/me` API'sine istek atıp gerçek kullanıcı verilerini çekecek `initAuth` fonksiyonunun yazılması.
- **`src/pages/AuthPage.tsx`**: Mock token yerine `axios` ile backend `/auth/login` ve `/auth/register` servislerine bağlanılması, hata yakalama eklenmesi.

### 3. Ortak Web Utility/Component Seti
Mobil tarafta olan ancak web tarafında eksik olan temel UI bileşenlerinin oluşturulması.
- **`src/components/UI/AvatarWithFrame.tsx`**: [NEW] Avatar çerçevelerini (ör. neon, legendary) render edecek bileşen.
- **`src/components/UI/RankBadge.tsx`**: [NEW] Rank seviyesini (Demir, Bronz, Elmas vb.) ikonla gösterecek bileşen.
- **`src/lib/api.ts`**: [MODIFY] Axios client'ı oluşturup token interceptor ekleme, standart HTTP çağrılarını yönetme.

### 4. Lobbies Ekranı (Gerçek API)
- **`src/pages/LobbiesPage.tsx`**: `mockRooms` yerine `/lobbies` endpointinden aktif lobileri çekme. Kategori bazlı filtrelemenin ve "Oda Kur", "Şifreli Oda" giriş senaryolarının bağlanması.

### 5. Focus Room (Sensör/Mobil Özellikleriyle Eşitleme)
- **`src/pages/FocusRoomPage.tsx`**: 
  - Chat geçmişi API bağlantısı (`/messages/:roomName`).
  - Gelen mesajlarda `AvatarWithFrame` ve baloncuk rengi kullanılması.
  - "Nudge" (Dürtme), Düello gibi web tarafında backend'den tetiklenebilecek WebSocket olaylarının mobildeki ile eşlenmesi.
  - (Görsel/PDF yükleme web'de masaüstü dosya seçimi olarak eklenecek).

### 6. Profile + Shop + Premium API Bağlantısı
- **`src/pages/ProfilePage.tsx`**: Sabit `Enes` ismini kaldırıp `/users/me` verisinden Avatar, Streak, Rank bilgilerini gösterme.
- **`src/pages/ShopPage.tsx`**: `/shop/items` ile ürünleri çekme, `/users/buy` ve `/users/equip` ile satın alma işlemlerini yönetme.
- **`src/pages/PremiumPage.tsx`**: Mock premium butonunu `/users/demo/upgrade` API'sine bağlama.

### 7. Leaderboard, Analytics ve DM
- **`src/pages/LeaderboardPage.tsx`**: `/users/leaderboard` API'sinden sıralama verisini çekme.
- **`src/pages/AnalyticsPage.tsx`**: `/users/analytics` verisini çekip Recharts veya benzeri bir kütüphaneyle Heatmap ve bar chart çizdirme.
- **`src/pages/DMPage.tsx`**: Arkadaş listesi, okunmamış bildirimler ve `send_dm/receive_dm` soket işlemlerinin uygulanması.

### 8. QA & Final Build Kontrolü
Tüm sayfalar responsive tasarım için test edilecek ve sonunda temiz bir `npm run build` alındığı doğrulanacak.

## Verification Plan

### Automated Tests
- Kodun `npm run build` (tsc ve vite build) sırasında hiç uyarı veya hata vermediğinden emin olunacak.

### Manual Verification
- Bir web kullanıcısının sıfırdan kayıt olması, lobiye girmesi, profil bilgilerini güncellemesi ve marketten eşya alması senaryosu baştan sona test edilecek.
- Konsolda WebSocket bağlantılarında hata olup olmadığı (cors, auth token eksikliği vb.) incelenecek.
