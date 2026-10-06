import { describe, expect, it } from 'vitest';
import { breakMinutesFor, timerPhase } from './roomTimer';
import type { RoomTimerSnapshot } from './roomTimer';

const snapshot = (overrides: Partial<RoomTimerSnapshot> = {}): RoomTimerSnapshot => ({
  focusSeconds: 25 * 60,
  breakSeconds: 5 * 60,
  startedAt: 0,
  pausedAt: null,
  startedBy: 1,
  startedByName: 'Ada',
  serverNow: 0,
  ...overrides,
});

describe('timerPhase', () => {
  it('starts in the focus phase of round one', () => {
    expect(timerPhase(snapshot(), 0)).toEqual({ phase: 'focus', remainingSeconds: 1500, round: 1 });
  });

  it('switches to the break when focus time is over', () => {
    expect(timerPhase(snapshot(), 25 * 60 * 1000)).toEqual({ phase: 'break', remainingSeconds: 300, round: 1 });
  });

  it('starts the next round after the break', () => {
    expect(timerPhase(snapshot(), 30 * 60 * 1000 + 1000)).toMatchObject({ phase: 'focus', round: 2, remainingSeconds: 1499 });
  });

  it('freezes at the moment it was paused', () => {
    const paused = snapshot({ pausedAt: 10 * 60 * 1000 });
    expect(timerPhase(paused, 60 * 60 * 1000)).toEqual({ phase: 'focus', remainingSeconds: 900, round: 1 });
  });

  it('never counts a negative elapsed time (clock skew)', () => {
    expect(timerPhase(snapshot({ startedAt: 5000 }), 0)).toMatchObject({ phase: 'focus', remainingSeconds: 1500 });
  });
});

describe('breakMinutesFor', () => {
  it('gives a longer break after long focus', () => {
    expect(breakMinutesFor(25)).toBe(5);
    expect(breakMinutesFor(45)).toBe(10);
  });
});
