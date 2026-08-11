# StudyLounge

StudyLounge, öğrencilerin birlikte çalışabilecekleri, telefonun masada olup olmadığını sensörlerle takip eden sosyal odaklanma uygulamasıdır. 
*Ayrı Masalarda, Aynı Lobide.*

> **Not:** Bu proje portfolyo amaçlı geliştirilmiştir. Projenin eski `web` uygulaması aktif geliştirme kapsamından çıkarılmış (archived) olup, odak noktası tamamen **Backend (NestJS)** ve **Mobil (React Native/Expo)** üzerine kurulmuştur.

## Mimari

Proje iki ana bileşenden oluşur:
- **`backend`**: NestJS, TypeScript, TypeORM, PostgreSQL, Socket.IO. Gerçek zamanlı haberleşme, JWT auth, lobi ve sensör verilerini yönetir.
- **`mobile`**: Expo / React Native, TypeScript. Sensör takibi, lobi sohbeti, profil yönetimi ve gerçek zamanlı etkileşimleri sağlar.
- *(Arşivlenmiş)* **`web`**: Vite / React (Aktif olarak bakımı yapılmamaktadır).

## Özellikler

- **Sensör Tabanlı Odaklanma**: Telefon masaya bırakıldığında odaklanma süresi başlar, kaldırıldığında durur.
- **Gerçek Zamanlı Lobiler (Socket.IO)**: Odadaki arkadaşlarınızın anlık durum (odaklanıyor/boşta) takibi.
- **Lobi Sohbeti & Dosya Paylaşımı**: Lobide anlık mesajlaşma ve dosya/görsel paylaşımı.
- **Arkadaşlık & Nudge Sistemi**: Arkadaş ekleme, mesajlaşma ve uygulamayı kullanan arkadaşa anlık "Dürtme (👋)" bildirimi.
- **Kapsamlı Profil & Liderlik**: Rutbe sistemi, haftalık analitik ekranları ve profil yönetimi.
- **Güvenli API**: JWT tabanlı kimlik doğrulama, şifreli veritabanı yönetimi ve kısıtlı CORS (production).

## Kurulum ve Çalıştırma

### Gereksinimler
- Node.js & npm
- PostgreSQL veya Docker
- Expo Go (veya Android/iOS simülatörü)

### 1. Backend Kurulumu
```bash
cd backend
npm install
cp .env.example .env
```
`.env` dosyasındaki `JWT_SECRET`, veritabanı bağlantı bilgilerini ve `CORS_ORIGIN` değişkenini kendi ortamınıza göre düzenleyin.

### 2. Veritabanını Başlatma (Docker)
PostgreSQL ve backend uygulamasını Docker ile tek bir komutta çalıştırabilirsiniz:
```bash
docker compose up --build -d
```
VEYA sadece lokal postgres veritabanını başlatmak isterseniz:
```bash
docker compose up postgres -d
```

### 3. Backend'i Lokal Çalıştırma
```bash
cd backend
npm run start:dev
```
Backend ayağa kalktığında `http://localhost:3000/health` adresinden çalıştığını doğrulayabilirsiniz.

### 4. Mobil Uygulamayı Çalıştırma
Mobil uygulamanın backend'e bağlanabilmesi için lokal IP adresinizi belirtmeniz gereklidir:
```bash
cd mobile
npm install
EXPO_PUBLIC_BACKEND_URL=http://<LOKAL_IP_ADRESINIZ>:3000 npx expo start
```
*Not: `10.x.x.x` veya `192.168.x.x` gibi kendi ağınızdaki lokal IP'nizi kullanın.*

## CI/CD ve DevOps (GitHub Actions)
Projede portfolyo gösterimi amacıyla bir CI/CD pipeline'ı (`.github/workflows/ci.yml`) bulunmaktadır:
- **Backend Testleri**: Jest unit ve e2e testleri çalıştırılır.
- **Mobil Doğrulama**: TypeScript typecheck ve ESLint kuralları kontrol edilir.
- **Docker**: `Dockerfile` ve `docker-compose.yml` kullanılarak sistemin konteynerize çalışabilirliği doğrulanır.

## Sunum / Demo Senaryosu
1. Kullanıcı uygulamaya kayıt olur ve profil resmi ekler.
2. Bir lobi oluşturur (Premium demo özelliği ile Elite lobi seçeneği incelenebilir).
3. Lobideyken telefonu masaya bırakır, sensör devreye girer ve lobideki diğer kullanıcılara "Ahmet burada odaklanıyor" bildirimi gider.
4. Odaklanma sonlandırıldığında Analytics ve Liderlik tablosu güncellenir.
5. Kullanıcı arkadaşlarına anlık Toast (Nudge) atarak çalışmaya davet edebilir.

## Repo Hijyeni ve Güvenlik
- Gizli anahtarlar, veritabanı şifreleri (`.env`) repoda tutulmaz.
- Backend testleri `expo-server-sdk` gibi ESM paketleriyle uyumlu çalışacak şekilde izole edilmiştir.
- Kullanıcı yüklemeleri (ör. profil fotoğrafları) lokal development ortamında `backend/uploads/` altında toplanır. (Production için S3 vb. harici storage entegrasyonu planlanmıştır).
