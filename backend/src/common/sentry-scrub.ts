// Bu dosya instrument.ts tarafindan Sentry.init'ten once yuklenir; NestJS ya da
// baska bir kutuphane import etmemeli (yoksa Sentry onlari izleyemez).

/** Sentry'ye gitmeden silinecek alanlar (buyuk/kucuk harf duyarsiz, parca eslesmesi). */
const SENSITIVE_KEY =
  /pass(word)?|token|secret|code|authorization|cookie|api[-_]?key|card|cvc|iban/i;

export const REDACTED = '[silindi]';

/** Nesne ve dizilerde hassas anahtarlarin degerini, derinlik sinirli olarak siler. */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value))
    return value.map((item) => scrubValue(item, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY.test(key)
      ? REDACTED
      : scrubValue(inner, depth + 1);
  }
  return result;
}

interface ScrubbableEvent {
  request?: {
    data?: unknown;
    headers?: Record<string, string>;
    cookies?: unknown;
    query_string?: unknown;
  };
  extra?: Record<string, unknown>;
}

/** Sentry `beforeSend`: istek govdesi, basliklar ve ek verideki hassas alanlari siler. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const request = event.request;
  if (request) {
    if (request.data !== undefined) {
      if (typeof request.data === 'string') {
        try {
          request.data = scrubValue(JSON.parse(request.data));
        } catch {
          request.data = REDACTED;
        }
      } else {
        request.data = scrubValue(request.data);
      }
    }
    if (request.headers)
      request.headers = scrubValue(request.headers) as Record<string, string>;
    if (request.cookies !== undefined) request.cookies = REDACTED;
    // Sorgu dizesinde e-posta dogrulama/sifre sifirlama kodu olabilir.
    if (request.query_string !== undefined) request.query_string = REDACTED;
  }
  if (event.extra)
    event.extra = scrubValue(event.extra) as Record<string, unknown>;
  return event;
}
