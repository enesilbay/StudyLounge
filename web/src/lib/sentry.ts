import type { Breadcrumb, ErrorEvent, EventHint } from '@sentry/react';
import { useAuthStore } from '../store/authStore';

/**
 * Sentry hata takibi. DSN yalnızca canlı ve test sitesinde tanımlıdır (`netlify.toml`);
 * geliştirmede, CI'da ve PR ön izlemelerinde Sentry kapalı kalır.
 *
 * SDK ana pakete girmez: açılış sayfası hızlı kalsın diye ayrı parça olarak sonradan yüklenir.
 * Bu yüzden sayfanın ilk milisaniyelerindeki hatalar kaçabilir; kabul edilen bir ödünleşim.
 */
const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

export const sentryEnabled = Boolean(dsn);

/** Yeni sürüm yayınlanınca eski sayfa parçaları bulunamaz; kullanıcıya "yenile" denir, hata sayılmaz. */
export const STALE_CHUNK_PATTERN = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i;

/** URL'deki sorgu ve parça kısmını atar (doğrulama kodu, ödeme belirteci vb. gitmesin). */
export function stripQuery(url: string): string {
  return url.replace(/[?#].*$/, '');
}

/** Kullanıcının elinde olmayan ya da zaten yönetilen hatalar: Sentry'ye gönderilmez. */
export function shouldDrop(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  // API hataları: 4xx kullanıcı hatasıdır, 5xx zaten backend'de raporlanır.
  if ((error as { isAxiosError?: boolean }).isAxiosError) return true;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && STALE_CHUNK_PATTERN.test(message);
}

function beforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  if (shouldDrop(hint.originalException)) return null;
  if (event.request?.url) event.request.url = stripQuery(event.request.url);
  delete event.request?.query_string;
  return event;
}

function beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const data = breadcrumb.data;
  if (data) {
    for (const key of ['url', 'from', 'to']) {
      if (typeof data[key] === 'string') data[key] = stripQuery(data[key]);
    }
  }
  return breadcrumb;
}

type SentrySdk = typeof import('./sentrySdk');
let sdk: Promise<SentrySdk> | null = null;

export function initSentry(): void {
  if (!dsn || sdk) return;
  sdk = import('./sentrySdk').then((Sentry) => {
    setup(Sentry, dsn);
    return Sentry;
  });
}

function setup(Sentry: SentrySdk, dsn: string): void {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV || 'production',
    // Sürüm, derlemede Sentry Vite eklentisi tarafından (Netlify commit kimliği) eklenir.
    // Yalnızca hata takibi: performans izleme ve oturum kaydı (Replay) kapalı.
    tracesSampleRate: 0,
    // KVKK: kullanıcı yalnızca numarasıyla tanınır; IP, çerez, gövde ve sorgu toplanmaz.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Kamera/mikrofon izni reddedildi ya da cihaz yok: kullanıcı tercihidir.
      'NotAllowedError',
      'Requested device not found',
      // Otomatik oynatma tarayıcı tarafından durduruldu.
      /play\(\) request was interrupted/i,
      /play\(\) failed because the user didn't interact/i,
    ],
    denyUrls: [/^chrome-extension:\/\//i, /^moz-extension:\/\//i, /^safari-(web-)?extension:\/\//i],
    beforeSend,
    beforeBreadcrumb,
  });

  // Oturumdaki kullanıcı yalnızca numarasıyla eklenir (e-posta ve kullanıcı adı gitmez).
  const applyUser = (user: { id: number } | null) => Sentry.setUser(user ? { id: String(user.id) } : null);
  applyUser(useAuthStore.getState().user);
  useAuthStore.subscribe((state, previous) => {
    if (state.user?.id !== previous.user?.id) applyUser(state.user);
  });
}

/** Rota hata ekranı gibi yakalanan hataları bildirir; beklenen hatalar `beforeSend`'de elenir. */
export function reportError(error: unknown): void {
  void sdk?.then((Sentry) => Sentry.captureException(error));
}
