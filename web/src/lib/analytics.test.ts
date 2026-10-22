import { describe, expect, it } from 'vitest';
import { bestSlot, calendarWeeks, changePercent, groupByDay, lastDays, localKey, longestRun, peakHour, periodTotals, rhythmGrid } from './analytics';

const today = new Date(2026, 9, 22, 15, 0); // Perşembe

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
      { startedAt: new Date(2026, 9, 20, 21, 40).toISOString(), endedAt: new Date(2026, 9, 20, 22, 20).toISOString(), minutes: 40 },
    ]);
    // 20 Ekim 2026 Salı → satır 1
    expect(Math.round(grid[1][21])).toBe(20);
    expect(Math.round(grid[1][22])).toBe(20);
    expect(peakHour(grid)).toBe(21);
    expect(bestSlot(grid)).toMatchObject({ weekday: 1, part: { label: 'akşam' } });
  });

  it('scales split minutes down when the session had pauses', () => {
    const grid = rhythmGrid([
      { startedAt: new Date(2026, 9, 20, 10, 0).toISOString(), endedAt: new Date(2026, 9, 20, 12, 0).toISOString(), minutes: 60 },
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
      { startedAt: new Date(2026, 9, 21, 9).toISOString() },
      { startedAt: new Date(2026, 9, 22, 9).toISOString() },
      { startedAt: new Date(2026, 9, 22, 20).toISOString() },
    ]);
    expect(groups.map((group) => [group.key, group.items.length])).toEqual([
      ['2026-10-22', 2],
      ['2026-10-21', 1],
    ]);
    expect(longestRun(lastDays([{ date: '2026-10-20', minutes: 5 }, { date: '2026-10-21', minutes: 5 }], 5, today))).toBe(2);
  });
});
