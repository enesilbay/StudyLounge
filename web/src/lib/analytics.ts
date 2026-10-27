import type { StudySession } from './study';

/*
 * Analitik sayfasının hesapları: dönem toplamları, haftalık ritim (gün × saat), takvim ve oturum grupları.
 * Hepsi saf fonksiyon. Gün sınırları tarayıcının saat diliminden bağımsız olarak İstanbul saatine (UTC+3,
 * yaz saati uygulaması yok) sabittir; backend de günleri böyle böler. Günler "İstanbul öğlesi" anıyla
 * temsil edilir; böylece `Intl` ile hangi saat diliminde biçimlenirse biçimlensin aynı gün görünür.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ISTANBUL_OFFSET_MS = 3 * HOUR_MS;

/** `Intl` biçimleyicileri için saat dilimi. */
export const ISTANBUL_TZ = 'Europe/Istanbul';

/** UTC alıcılarıyla okunduğunda İstanbul duvar saatini veren kaydırılmış tarih. */
function wall(date: Date) {
  return new Date(date.getTime() + ISTANBUL_OFFSET_MS);
}

/** Günün İstanbul'daki öğle 12:00 anı. */
function noonOf(date: Date) {
  const w = wall(date);
  return new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate(), 12) - ISTANBUL_OFFSET_MS);
}

/** İstanbul saatine göre "YYYY-AA-GG" gün anahtarı. */
export function localKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const w = wall(date);
  return `${w.getUTCFullYear()}-${pad(w.getUTCMonth() + 1)}-${pad(w.getUTCDate())}`;
}

/** İstanbul saatine göre saat (0-23). */
export function istanbulHour(date: Date) {
  return wall(date).getUTCHours();
}

/** Bugünle biten `count` günlük dönemin ilk İstanbul gününün 00:00 anı (oturum listesi `from` parametresi için). */
export function periodStart(count: number, today = new Date()) {
  return new Date(noonOf(today).getTime() - (count - 1) * DAY_MS - 12 * HOUR_MS);
}

export interface DayValue {
  key: string;
  date: Date;
  minutes: number;
}

/** Bugünle biten `count` günlük dizi; verisi olmayan gün 0 dakikadır. */
export function lastDays(daily: { date: string; minutes: number }[], count: number, today = new Date()): DayValue[] {
  const byDate = new Map(daily.map((day) => [day.date, day.minutes]));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(noonOf(today).getTime() - (count - 1 - index) * DAY_MS);
    const key = localKey(date);
    return { key, date, minutes: byDate.get(key) ?? 0 };
  });
}

/** Son `count` gün ile ondan önceki `count` günün toplamı. */
export function periodTotals(daily: { date: string; minutes: number }[], count: number, today = new Date()) {
  const both = lastDays(daily, count * 2, today);
  const sum = (days: DayValue[]) => days.reduce((total, day) => total + day.minutes, 0);
  return { current: sum(both.slice(count)), previous: sum(both.slice(0, count)) };
}

/** Önceki döneme göre yüzde değişim; önceki dönem boşsa karşılaştırma yapılmaz. */
export function changePercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Pazartesi = 0 ... Pazar = 6 */
export function weekdayIndex(date: Date) {
  return (wall(date).getUTCDay() + 6) % 7;
}

/**
 * Haftalık ritim: 7 gün × 24 saat, dakika. Oturum başladığı ve bittiği saatler arasında
 * gerçek süresine göre bölünür (ör. 21:40–22:20 → 21'e 20 dk, 22'ye 20 dk).
 */
export function rhythmGrid(sessions: Pick<StudySession, 'startedAt' | 'endedAt' | 'minutes'>[]) {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const session of sessions) {
    const start = new Date(session.startedAt).getTime();
    const end = Math.max(start, new Date(session.endedAt).getTime());
    const span = end - start;
    if (!span) continue;
    // Duraklatmalar düşülmüş gerçek dakika, aralığa oranla dağıtılır.
    const scale = session.minutes / (span / 60000);
    let cursor = start;
    while (cursor < end) {
      const at = new Date(cursor);
      const hourEnd = (Math.floor((cursor + ISTANBUL_OFFSET_MS) / HOUR_MS) + 1) * HOUR_MS - ISTANBUL_OFFSET_MS;
      const until = Math.min(end, hourEnd);
      grid[weekdayIndex(at)][istanbulHour(at)] += ((until - cursor) / 60000) * scale;
      cursor = until;
    }
  }
  return grid;
}

export const DAYPARTS = [
  { label: 'gece', from: 0, to: 6 },
  { label: 'sabah', from: 6, to: 12 },
  { label: 'öğleden sonra', from: 12, to: 18 },
  { label: 'akşam', from: 18, to: 24 },
] as const;

export const WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

/** Ritimdeki en yoğun gün + gün dilimi (ör. "Salı akşamları"); veri yoksa null. */
export function bestSlot(grid: number[][]) {
  let best: { weekday: number; part: (typeof DAYPARTS)[number]; minutes: number } | null = null;
  grid.forEach((hours, weekday) => {
    for (const part of DAYPARTS) {
      const minutes = hours.slice(part.from, part.to).reduce((sum, value) => sum + value, 0);
      if (minutes > 0 && (!best || minutes > best.minutes)) best = { weekday, part, minutes };
    }
  });
  return best as { weekday: number; part: (typeof DAYPARTS)[number]; minutes: number } | null;
}

/** En yoğun saat (0-23); veri yoksa null. */
export function peakHour(grid: number[][]) {
  const totals = Array.from({ length: 24 }, (_, hour) => grid.reduce((sum, row) => sum + row[hour], 0));
  const max = Math.max(...totals);
  return max > 0 ? totals.indexOf(max) : null;
}

/**
 * Takvim: bugünü içeren haftayla biten `weeks` hafta; sütunlar hafta, satırlar Pazartesi→Pazar.
 * Henüz gelmemiş günler `future` işaretlidir.
 */
export function calendarWeeks(daily: { date: string; minutes: number }[], weeks: number, today = new Date()) {
  const byDate = new Map(daily.map((day) => [day.date, day.minutes]));
  const todayStart = noonOf(today);
  const firstMonday = new Date(todayStart.getTime() - (weekdayIndex(todayStart) + (weeks - 1) * 7) * DAY_MS);
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = new Date(firstMonday.getTime() + (week * 7 + weekday) * DAY_MS);
      const key = localKey(date);
      return { key, date, minutes: byDate.get(key) ?? 0, future: date > todayStart, today: key === localKey(todayStart) };
    }),
  );
}

/** Oturumları güne göre gruplar (en yeni gün önce). */
export function groupByDay<T extends { startedAt: string }>(sessions: T[]) {
  const groups = new Map<string, { key: string; date: Date; items: T[] }>();
  for (const session of sessions) {
    const date = noonOf(new Date(session.startedAt));
    const key = localKey(date);
    const group = groups.get(key) ?? { key, date, items: [] };
    group.items.push(session);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Aralıksız odaklanılan en uzun gün sayısı (dizi içinde). */
export function longestRun(days: DayValue[]) {
  let best = 0;
  let run = 0;
  for (const day of days) {
    run = day.minutes > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
