# StudyLounge Portfolyo Hazırlık Yol Haritası

Projenin portfolyöye uygun hale getirilmesi için odak noktamız: projeyi **mobil + NestJS backend** ürünü olarak netleştirmek, ayrı Vite `web/` uygulamasını aktif kapsamdan çıkarmak, DevOps görünürlüğünü (CI/CD, Docker) güçlendirmek ve mevcut kalite açıklarını kapatmaktır.

## User Review Required

> [!WARNING]
> Web klasörü (`web/`) silinmeyecektir, ancak aktif akıştan çıkarılacak ve bakım yapılmadığına dair (archived) not düşülecektir.
> Mobil uygulamada Premium / Ödeme sistemi gerçek bir ödeme altyapısı (Stripe/Iyzico) ile değil, portfolyoda gösterilebilir bir "demo" akışı olarak kalacaktır. Bu yaklaşımı onaylıyor musunuz?

## Open Questions

> [!IMPORTANT]
> - Mobil taraftaki lint uyarılarını temizlerken, çok fazla efor gerektiren kısımlarda (örneğin any tipleri) bunları düzeltmek yerine `eslint-disable` ile gerekçelendirmeyi mi tercih edersiniz, yoksa hepsini tek tek refactor edelim mi?

## Proposed Changes

### Web Archival & Documentation

#### [MODIFY] [README.md](file:///c:/Users/Enes/OneDrive/Desktop/studylounge/README.md)
Portfolyo odaklı olarak yeniden yazılacak. Özellikler, mimari (backend + mobile), kurulum, test, Docker, demo senaryosu ve ekran görüntüsü alanları eklenecek. Web kısımları çıkarılacak.

#### [MODIFY] [implementation_plan.md](file:///c:/Users/Enes/OneDrive/Desktop/studylounge/implementation_plan.md)
Eski web entegrasyon planı yerine bu portfolyo yol haritası kopyalanacak/değiştirilecek.

### Backend Production Readiness & Fixes

#### [MODIFY] [backend/src/app.module.ts](file:///c:/Users/Enes/OneDrive/Desktop/studylounge/backend/src/app.module.ts)
TypeORM ayarlarında `synchronize: true` değerinin production ortamında kapalı olması (migration bazlı çalışması) sağlanacak.

#### [MODIFY] [backend/src/app.controller.ts](file:///c:/Users/Enes/OneDrive/Desktop/studylounge/backend/src/app.controller.ts)
Sistemin ayakta olduğunu doğrulamak (ve Docker/CI healthcheck'leri için) basit bir `/health` endpoint'i eklenecek.

#### [MODIFY] [backend/src/main.ts](file:///c:/Users/Enes/OneDrive/Desktop/studylounge/backend/src/main.ts)
CORS ayarları production'da kısıtlı olacak şekilde çevre değişkenine (Environment Variable) bağlanacak.

#### [MODIFY] [backend/package.json](file:///c:/Users/Enes/OneDrive/Desktop/studylounge/backend/package.json)
Jest konfigürasyonu güncellenerek, `expo-server-sdk` ESM import hatasını çözmek için `moduleNameMapper` veya mock ayarları eklenecek.

#### [MODIFY] [backend/.env.example](file:///c:/Users/Enes/OneDrive/Desktop/studylounge/backend/.env.example)
`JWT_SECRET`, DB ayarları ve upload path gibi değerler için açıklayıcı notlar eklenecek. Lokal `uploads/` kullanımının portfolyo/demo amaçlı olduğu dokümante edilecek.

### DevOps & CI/CD

#### [NEW] [backend/Dockerfile](file:///c:/Users/Enes/OneDrive/Desktop/studylounge/backend/Dockerfile)
NestJS uygulamasını production ortamında çalıştırmak için multi-stage Dockerfile eklenecek.

#### [MODIFY] [docker-compose.yml](file:///c:/Users/Enes/OneDrive/Desktop/studylounge/docker-compose.yml)
Backend ve Postgres container'ları yapılandırılacak. Postgres için `healthcheck` tanımı eklenecek.

#### [NEW] [.github/workflows/ci.yml](file:///c:/Users/Enes/OneDrive/Desktop/studylounge/.github/workflows/ci.yml)
GitHub Actions workflow dosyası oluşturulacak. İçeriği:
- Backend install, build ve test (`npm test -- --runInBand`, e2e testleri)
- Mobile install, typecheck (`npm run typecheck`) ve lint (`npm run lint`)

### Mobile App Refinement

#### [MODIFY] [mobile/app/config/api.ts](file:///c:/Users/Enes/OneDrive/Desktop/studylounge/mobile/app/config/api.ts)
`10.192.24.96` gibi sabit LAN IP'leri kaldırılıp tamamen environment (`EXPO_PUBLIC_BACKEND_URL`) odaklı yapı güçlendirilecek.

#### [MODIFY] Mobile Components
`npm run lint` sonucunda çıkan uyarılar (kullanılmayan değişkenler, bağımlılık array'leri vb.) temizlenecek veya bilinçli olarak ignore edilip yorum eklenecek.

## Verification Plan

### Automated Tests
- `cd backend && npm run build`
- `cd backend && npm test -- --runInBand`
- `cd backend && npm run test:e2e -- --runInBand`
- `cd mobile && npm run typecheck`
- `cd mobile && npm run lint`

### DevOps Verification
- `docker-compose up --build` komutuyla sistemin sorunsuz ayağa kalktığı ve db/backend bağlantısının kurulduğu görülecek.
- GitHub Actions CI workflow'unun commit sonrası hatasız çalıştığı doğrulanacak.

### Manual Verification
- Expo üzerinden uygulamanın başlatılıp:
  - Kayıt/Giriş
  - Lobi oluşturma/girme
  - Sensör odak akışı
  - Sohbet ve dosya paylaşımı (demo amaçlı)
  - Profil, Liderlik ve Premium demo ekranlarının API bağlantılarının doğru çalıştığı test edilecek.
- `http://localhost:3000/health` (veya ilgili port üzerinden) backend healthcheck kontrolü yapılacak.
