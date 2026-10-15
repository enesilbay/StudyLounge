// Sentry SDK'dan yalnızca kullanılan parçalar; `sentry.ts` bu dosyayı sonradan yükler.
// Paketin tamamını dinamik içe aktarmak Replay ve Feedback'i de getirir (~150 KB gzip).
export { captureException, init, setUser } from '@sentry/react';
