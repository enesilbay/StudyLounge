# Test, Commit and Push Workflow

Bir kod değişikliği tamamlandıktan sonra şu adımları uygula:

1. Değiştirilen dosyaları kontrol et:
   - `git status`
   - `git diff`

2. Proje yapısına göre ilgili test veya çalıştırma komutlarını belirle.

3. Backend değiştiyse:
   - `cd backend`
   - Paket yöneticisini kontrol et.
   - Uygunsa şunları çalıştır:
     - `npm run lint`
     - `npm run test`
     - `npm run build`

4. Mobile değiştiyse:
   - `cd mobile`
   - Paket yöneticisini kontrol et.
   - Uygunsa şunları çalıştır:
     - `npm run lint`
     - `npm run typecheck`
     - `npx expo-doctor`

5. Docker veya genel proje dosyaları değiştiyse:
   - `docker compose config`
   - Gerekirse `docker compose up --build`

6. Herhangi bir test, build veya kontrol başarısız olursa:
   - Commit atma.
   - Push yapma.
   - Hatanın sebebini açıkla.
   - Düzeltilmesi gereken dosyaları belirt.

7. Her şey başarılıysa:
   - `git status` ile staged olmayan dosyaları kontrol et.
   - `.agents/` klasörünün commit'e dahil edilmediğinden emin ol.
   - İlgili dosyaları stage et.
   - Açıklayıcı bir commit mesajı oluştur.
   - Commit mesajları kısa, açıklayıcı ve İngilizce olmalı.
   - Commit at.
   - Mevcut branch'e pushla.
   - README.md dosyasını yapılan değişkliği tamamlanalar kısmına alarak güncelle ve pushla

8. İşlem sonunda kullanıcıya şunları özetle:
   - Hangi testler çalıştı
   - Commit mesajı neydi
   - Hangi branch'e pushlandı