# StudyLounge

StudyLounge, ogrencilerin birlikte calisabilecekleri, telefonun masada olup olmadigini sensorlerle takip eden sosyal odaklanma uygulamasidir.

Proje uc parcadan olusur:

- `backend`: NestJS, TypeScript, TypeORM, PostgreSQL, Socket.IO
- `mobile`: Expo / React Native, TypeScript
- `web`: Vite / React / TypeScript

## Ozellikler

- JWT tabanli kayit, giris ve korumali API akislari
- Lobi olusturma, listeleme, premium/elite oda kontrolu
- Socket.IO ile odadaki kullanicilarin anlik durum takibi
- Sensor tabanli odak durumu ve odak puani kazanimi
- Lobi sohbeti, dosya/gorsel paylasimi ve avatarli mesaj gosterimi
- Arkadaslik istegi, kabul/red ve arkadas listesi
- Profil fotografi yukleme ve avatarin profil, lobi, liderlik ve sensor ekranlarinda gosterimi
- Profil ayarlari: ad soyad, e-posta, kullanici adi ve sifre degistirme
- Profil ayarlari degisince mobil token ve yerel kullanici bilgisi otomatik yenilenir
- Premium demo akisi, premium rozetleri, analitik ve ses mikseri
- Liderlik tablosu, rutbe sistemi ve haftalik analitik ekranlari
- Web arayuzu: login/register, dashboard, lobbies, leaderboard, profile

## Kurulum

Gerekenler:

- Node.js
- npm
- PostgreSQL
- Expo Go veya Android/iOS simulator

Bagimliliklari kurmak icin:

```bash
cd backend
npm install

cd ../mobile
npm install

cd ../web
npm install
```

## Ortam Degiskenleri

Backend icin `backend/.env.example` dosyasini `backend/.env` olarak kopyalayin:

```bash
cd backend
cp .env.example .env
```

Temel backend degiskenleri:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=*

JWT_SECRET=change-this-to-a-long-random-secret
JWT_EXPIRES_IN=7d

DB_HOST=localhost
DB_PORT=5432
DB_USER=enes_admin
DB_PASSWORD=studylounge_secret
DB_NAME=studylounge

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=StudyLounge <your-email@gmail.com>
```

Mobile backend adresi icin:

```env
EXPO_PUBLIC_BACKEND_URL=http://YOUR_LOCAL_IP:3000
```

Mobile tarafinda API adresleri `mobile/app/config/api.ts` icinden tek merkezden yonetilir.

## Calistirma

Backend:

```bash
cd backend
npm run start:dev
```

Mobile:

```bash
cd mobile
npm start
```

Web:

```bash
cd web
npm run dev
```

Docker ile PostgreSQL:

```bash
docker compose up -d
```

## Test ve Kontroller

Backend:

```bash
cd backend
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

Mobile:

```bash
cd mobile
npm run typecheck
npm run lint
```

Web:

```bash
cd web
npm run lint
npm run build
```

## Son Test Kapsami

Backend unit testleri artik sadece "defined olmali" seviyesinde degil; su davranislari kontrol eder:

- Auth register/login ve JWT payload uretimi
- Hatali login reddi
- Kullanici olusturmada sifre hashleme
- Login sonrasi password alaninin gizlenmesi
- Arkadaslik istegi olusturma
- Odak dakikasinin kullanici puanina ve gunluk analitige yazilmasi
- Lobi olusturma, private lobby password hash ve premium-only kontrolu
- Profil ayarlarinda e-posta/kullanici adi guncelleme
- Profil ayari sonrasi yeni JWT dondurme
- Sifre degistirmede mevcut sifre kontrolu

Backend e2e testleri:

- Register -> login
- Login -> create lobby
- Friend request -> accept
- Path `userId` ile baska kullanicinin profilini guncelleyememe

## Sunum Senaryosu

1. Kullanici kayit olur ve giris yapar.
2. Profil fotografi ekler, kullanici adi/e-posta ayarlarini gorur.
3. Lobi olusturur veya var olan lobiye girer.
4. Telefonu masaya birakarak odak durumunu baslatir.
5. Odadaki kullanicilarin avatarlarini ve odak durumlarini gorur.
6. Lobi sohbetinden mesaj gonderir.
7. Arkadaslik istegi gonderir ve kabul eder.
8. Liderlik tablosu, rutbe ve analitik ekranlarini inceler.
9. Premium demo akisiyle elite oda ve ses mikeri ozelliklerini gosterir.

## Repo Hijyeni

- Secret degerleri `.env` dosyalarinda tutulur ve git'e eklenmez.
- `backend/uploads/` kullanici yuklemeleri icindir ve repo disinda tutulur.
- `.agents/` lokal agent verisi olarak ignore edilir.

## Proje Sahibi

Enes Ilbay
