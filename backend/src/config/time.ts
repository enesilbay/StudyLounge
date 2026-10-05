/**
 * Gün, saat ve hafta hesapları Türkiye saatine göre yapılır: kullanıcılar Türkiye'de,
 * sunucu (Render) ise UTC'de çalışır. Aksi halde gece 00:00–03:00 arasında yapılan
 * çalışma bir önceki güne yazılırdı.
 */
export const APP_TIME_ZONE = 'Europe/Istanbul';

const DAY_MS = 24 * 60 * 60 * 1000;

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

function localParts(date: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return parts as Record<'year' | 'month' | 'day' | 'hour' | 'weekday', string>;
}

/** Türkiye saatine göre gün anahtarı (YYYY-AA-GG); `daily_analytics.date` ile aynı biçim. */
export function localDayKey(date: Date): string {
  const parts = localParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Türkiye saatine göre saat (0–23). */
export function localHour(date: Date): number {
  return Number(localParts(date).hour);
}

/** Gün anahtarına gün ekler/çıkarır (takvim aritmetiği, saat diliminden bağımsız). */
export function addDaysToKey(key: string, days: number): string {
  return new Date(new Date(`${key}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** İki gün anahtarı arasındaki gün farkı (b - a). */
export function daysBetweenKeys(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / DAY_MS);
}

/** İçinde bulunulan haftanın pazartesisi (Türkiye saatine göre gün anahtarı). */
export function localWeekStartKey(date: Date): string {
  const key = localDayKey(date);
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
  return addDaysToKey(key, -((weekday + 6) % 7));
}
