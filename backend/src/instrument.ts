// Sentry hata takibi. main.ts'in ILK importu olmalidir; boylece Express, HTTP ve
// PostgreSQL cagrilari baslamadan izlenir.
// SENTRY_DSN tanimli degilse (gelistirme, CI) SDK kapali kalir ve hicbir sey gonderilmez.
import * as Sentry from '@sentry/nestjs';
import { scrubEvent } from './common/sentry-scrub';

const dsn = process.env.SENTRY_DSN?.trim();

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  // Test ve canli ikisi de NODE_ENV=production ile calistigi icin ortam ayri bir degiskenden okunur.
  environment:
    process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  // Render her deploy'da commit kimligini verir; hangi surumun hatayi getirdigi gorulur.
  release: process.env.RENDER_GIT_COMMIT || undefined,
  // Yalnizca hata takibi: performans izleme kapali (ucretsiz kota).
  tracesSampleRate: 0,
  // KVKK: kullanici bilgisi, cerez, istek/yanit govdesi, sorgu parametreleri, veritabani
  // degerleri ve yerel degiskenler toplanmaz; basliklardan yalnizca zararsiz olanlar alinir.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: { allow: ['user-agent', 'content-type', 'origin', 'referer'] },
      response: false,
    },
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
  },
  // Yukaridakine ek guvence: yine de gelen veride hassas alan varsa silinir.
  beforeSend: (event) => scrubEvent(event),
});
