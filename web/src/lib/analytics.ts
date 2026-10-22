import type { StudySession } from './study';

/*
 * Analitik sayfasının hesapları: dönem toplamları, haftalık ritim (gün × saat), takvim ve oturum grupları.
 * Hepsi saf fonksiyon; tarih anahtarları tarayıcının yerel günüdür (kullanıcı ve backend Türkiye saatinde).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function localKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - index));
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
  return (date.getDay() + 6) % 7;
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
      const hourEnd = new Date(at.getFullYear(), at.getMonth(), at.getDate(), at.getHours() + 1).getTime();
      const until = Math.min(end, hourEnd);
      grid[weekdayIndex(at)][at.getHours()] += ((until - cursor) / 60000) * scale;
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
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const firstMonday = new Date(todayStart.getTime() - (weekdayIndex(todayStart) + (weeks - 1) * 7) * DAY_MS);
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = new Date(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate() + week * 7 + weekday);
      const key = localKey(date);
      return { key, date, minutes: byDate.get(key) ?? 0, future: date > todayStart, today: key === localKey(todayStart) };
    }),
  );
}

/** Oturumları güne göre gruplar (en yeni gün önce). */
export function groupByDay<T extends { startedAt: string }>(sessions: T[]) {
  const groups = new Map<string, { key: string; date: Date; items: T[] }>();
  for (const session of sessions) {
    const date = new Date(session.startedAt);
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
