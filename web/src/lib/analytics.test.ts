import { describe, expect, it } from 'vitest';
import { bestSlot, calendarWeeks, changePercent, groupByDay, istanbulHour, lastDays, localKey, longestRun, peakHour, periodStart, periodTotals, rhythmGrid } from './analytics';

// Testler çalıştırıcının saat diliminden bağımsız olmalı: tarihler açıkça İstanbul (+03:00) ile verilir.
const today = new Date('2026-10-22T15:00:00+03:00'); // Perşembe

describe('analytics', () => {
  it('fills missing days with zero and ends on today', () => {
    const days = lastDays([{ date: '2026-10-21', minutes: 40 }], 3, today);
    expect(days.map((day) => [day.key, day.minutes])).toEqual([
      ['2026-10-20', 0],
      ['2026-10-21', 40],
      ['2026-10-22', 0],
    ]);
  });

  it('compares the period with the one before it', () => {
    const daily = [
      { date: '2026-10-22', minutes: 60 },
      { date: '2026-10-16', minutes: 30 },
      { date: '2026-10-15', minutes: 10 },
    ];
    // Bu dönem 16–22 Ekim, önceki dönem 9–15 Ekim.
    expect(periodTotals(daily, 7, today)).toEqual({ current: 90, previous: 10 });
    expect(changePercent(60, 40)).toBe(50);
    expect(changePercent(60, 0)).toBeNull();
  });

  it('splits a session across the hours it covers', () => {
    const grid = rhythmGrid([
      { startedAt: '2026-10-20T21:40:00+03:00', endedAt: '2026-10-20T22:20:00+03:00', minutes: 40 },
    ]);
    // 20 Ekim 2026 Salı → satır 1
    expect(Math.round(grid[1][21])).toBe(20);
    expect(Math.round(grid[1][22])).toBe(20);
    expect(peakHour(grid)).toBe(21);
    expect(bestSlot(grid)).toMatchObject({ weekday: 1, part: { label: 'akşam' } });
  });

  it('scales split minutes down when the session had pauses', () => {
    const grid = rhythmGrid([
      { startedAt: '2026-10-20T10:00:00+03:00', endedAt: '2026-10-20T12:00:00+03:00', minutes: 60 },
    ]);
    expect(Math.round(grid[1][10])).toBe(30);
    expect(Math.round(grid[1][11])).toBe(30);
  });

  it('builds Monday-first calendar weeks ending with this week', () => {
    const weeks = calendarWeeks([{ date: '2026-10-22', minutes: 25 }], 2, today);
    expect(weeks).toHaveLength(2);
    expect(localKey(weeks[0][0].date)).toBe('2026-10-12');
    expect(weeks[1][3]).toMatchObject({ key: '2026-10-22', minutes: 25, today: true, future: false });
    expect(weeks[1][4].future).toBe(true);
  });

  it('groups sessions by day, newest first, and finds the longest run', () => {
    const groups = groupByDay([
      { startedAt: '2026-10-21T09:00:00+03:00' },
      { startedAt: '2026-10-22T09:00:00+03:00' },
      { startedAt: '2026-10-22T20:00:00+03:00' },
    ]);
    expect(groups.map((group) => [group.key, group.items.length])).toEqual([
      ['2026-10-22', 2],
      ['2026-10-21', 1],
    ]);
    expect(longestRun(lastDays([{ date: '2026-10-20', minutes: 5 }, { date: '2026-10-21', minutes: 5 }], 5, today))).toBe(2);
  });

  it('uses Istanbul day boundaries regardless of the browser time zone', () => {
    // 22 Ekim 23:30 İstanbul = 20:30 UTC; 23 Ekim 00:30 İstanbul = 21:30 UTC (aynı UTC günü, farklı İstanbul günü).
    expect(localKey(new Date('2026-10-22T20:30:00Z'))).toBe('2026-10-22');
    expect(localKey(new Date('2026-10-22T21:30:00Z'))).toBe('2026-10-23');
    expect(istanbulHour(new Date('2026-10-22T21:30:00Z'))).toBe(0);
    const groups = groupByDay([{ startedAt: '2026-10-22T20:30:00Z' }, { startedAt: '2026-10-22T21:30:00Z' }]);
    expect(groups.map((group) => group.key)).toEqual(['2026-10-23', '2026-10-22']);
    // "Bugün" gece yarısından hemen sonra bile İstanbul gününe göre hesaplanır.
    expect(lastDays([], 2, new Date('2026-10-22T21:05:00Z')).map((day) => day.key)).toEqual(['2026-10-22', '2026-10-23']);
  });

  it('starts a period at Istanbul midnight of its first day', () => {
    // Bugün 22 Ekim 15:00 İstanbul; 7 günlük dönem 16 Ekim 00:00 (+03:00) ile başlar.
    expect(periodStart(7, today).toISOString()).toBe('2026-10-15T21:00:00.000Z');
    expect(periodStart(1, today).toISOString()).toBe('2026-10-21T21:00:00.000Z');
  });
});
