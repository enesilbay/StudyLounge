# Proje: StudyLounge (Mezuniyet Projesi )
- Backend: NestJS (TypeScript)
- Mobil: Expo / React Native (TypeScript) — mevcut haliyle korunuyor, değişiklik yapılmıyor.
- Web: React 19 + Vite + Tailwind v4 (TypeScript), `web/` klasörü.
- Tasarım (mobil): Her zaman `mobile/app/(tabs)/sensor.tsx` içindeki "C" (Colors) sabitlerini kullan.
- Tasarım (web): `web/src/index.css` içindeki tema token'larını (`bg-surface`, `text-textDark`, `bg-accent` vb.) ve `web/src/components/ui.tsx` bileşenlerini kullan; sabit hex renk yazma. Palet: krem zemin, turkuaz ana renk (`primary`), açık pembe lamba rengi (`accent`). Pembe yalnızca "odakta" durumu ve ana eylem içindir; pembe tonlu metin için `text-accentDark`, pembe dolgunun üstündeki metin için `text-onAccent` kullan.
- Mimari: Backend'de tüm yeni özellikler için Controller ve Service yapısını koru. 
- Ağ: IP adreslerini ve fetch URL'lerini her zaman projeye uygun şekilde yönet.
- Veritabanı: TypeORM kullanılıyor, yeni Entity eklendiğinde ilişkileri (ManyToOne vs.) kontrol et.
- Geriye uyumluluk: Backend değişiklikleri mobil istemciyi bozmamalı; yeni kolonlar varsayılan değerli, yeni socket event'leri isteğe bağlı olmalı.
- WebRTC: Kameralı odalar P2P mesh (en fazla 6 kişi). Sinyalleşme `backend/src/rtc/rtc.service.ts` + `sensors.gateway.ts` içindeki `rtc_*` event'leri; istemci tarafı `web/src/lib/rtc/`.
- PDF tahtası: Oda başına ortak PDF + çizim durumu `backend/src/whiteboard/` içinde (bellekte tutulur, oda boşalınca 2 dk sonra silinir); socket event'leri `board_*` (`sensors.gateway.ts`); istemci tarafı `web/src/lib/board/` ve `web/src/components/room/PdfBoard.tsx`. Mobil bu event'leri yok sayar.

## Model seçimi
Oturum modeli varsayılan olarak Sonnet'tir. Oturum kendi modelini değiştiremez; iş parçası `Agent` aracının `model` parametresiyle devredilir ya da kullanıcıya `/model` önerilir.

| Model | İş türü |
|---|---|
| Haiku | Dosya/kod arama, grep taraması, log ve CI çıktısı okuma, PR gövdesi/commit mesajı taslağı, ROADMAP/devir notu güncelleme, port/süreç listeleme, mekanik yeniden adlandırma |
| Sonnet (varsayılan) | Özellik geliştirme, hata düzeltme, test yazma, PR açma/birleştirme akışı, migration, web/backend kodu, tek dosyalık refactor |
| Opus | Mimari ve veri modeli kararları (ödeme modeli, WebRTC/TURN tasarımı gibi), kök nedeni belirsiz hata, güvenlik ve ödeme incelemesi, çok dosyalı refactor, canlıya taşıma öncesi son inceleme |

- Emin değilsen Sonnet. Kısa prompt'larda belirsizlik çoktur; yanlışlıkla Haiku'ya verilen karmaşık iş tasarrufu götürür.
- Haiku'ya yalnızca sonucu doğrulanabilir, karar gerektirmeyen iş devredilir; çıktıyı ana oturum kontrol eder.
- Opus'a devir: kullanıcı "plan yap/tasarla/incele" dediğinde ya da iş birden fazla geçerli çözüm içerdiğinde.
- Tek komut ya da tek dosya okuma gibi küçük işi subagent'a verme; yalnızca çok adımlı veya çok çıktılı işte devret. Bu madde, subagent devri için kullanıcının açık iznidir.
- Hazır subagent'lar: `arastirmaci` (Haiku, salt okur arama), `git-yardimci` (Haiku, durum/diff/CI özeti ve taslak metin), `mimar` (Opus, salt okur tasarım/inceleme).
- İş seçili modelden belirgin biçimde zor ya da kolay görünüyorsa tek cümleyle `/model` öner (ör. "bu mimari karar, Opus'a geçmek isteyebilirsin").
- Gizli bilgi ve Git akışı kuralları model seçiminden bağımsız geçerlidir.

## Git akışı
- Ortamlar: `main` → canlı (Render `studylounge-backend`, Netlify ana site, Neon `production`); `staging` → test (Render `studylounge-backend-staging`, `staging--cozy-melba-59db2a.netlify.app`, Neon `staging`).
- Her iş `staging`'den açılan bir dalda yapılır (`ozellik/...`, `duzeltme/...`). `main` ve `staging`'e doğrudan commit/push yok; `.claude/hooks/dal-koruma.js` bunu engeller.
- PR önce `staging`'e açılır. Test sitesinde denenince `staging` → `main` PR'ı açılır. `main`'e yalnızca `staging`'den PR ile gelinir.
- Acil düzeltme istisnası: dal `main`'den açılır, PR doğrudan `main`'e gider, ardından `main` → `staging` PR'ı ile test dalı eşitlenir.
- `staging` → `main` birleştirmesinden sonra ayrıca eşitleme gerekmez (yalnızca birleştirme commit'i farklıdır, içerik aynıdır). Yerelde `git switch staging; git pull` yeterli. GitHub dal koruması açıkken doğrudan push (`origin/main:staging` dahil) GitHub tarafından reddedilir; eşitleme her zaman PR ile yapılır.
- Gizli bilgiler (veritabanı adresleri, `JWT_SECRET`, SMTP/Resend anahtarları) yalnızca Render/Netlify/Neon panellerinde tutulur; repoya, sohbete ya da log'a yazılmaz. Canlı ve test ortamı veritabanı ve `JWT_SECRET` paylaşmaz.
- Migration'lar önce `staging`'de çalışır; test ortamında sorunsuz açıldıktan sonra `main`'e gider. Yeni kolonlar varsayılan değerli olmalı.
- PR'lar GitHub API ile açılıp birleştirilir; CI (backend-test, web-verify, web-e2e, mobile-verify) yeşil olmadan birleştirilmez. Commit/PR'lara Claude atıf satırı eklenmez.
