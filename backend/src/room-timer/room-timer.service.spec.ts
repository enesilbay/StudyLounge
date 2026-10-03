import { BadRequestException } from '@nestjs/common';
import { RoomTimerService, timerPhase } from './room-timer.service';

describe('RoomTimerService', () => {
  let service: RoomTimerService;
  const t0 = 1_000_000;

  beforeEach(() => {
    service = new RoomTimerService();
  });

  it('validates focus and break lengths', () => {
    expect(() => service.start('Oda', 1, 'Enes', 2, 5, t0)).toThrow(
      BadRequestException,
    );
    expect(() => service.start('Oda', 1, 'Enes', 25, 0, t0)).toThrow(
      BadRequestException,
    );
    expect(() => service.start('Oda', 1, 'Enes', 'x', 5, t0)).toThrow(
      BadRequestException,
    );
    expect(service.start('Oda', 1, 'Enes', 25, 5, t0)).toMatchObject({
      focusSeconds: 1500,
      breakSeconds: 300,
      pausedAt: null,
    });
  });

  it('derives focus and break phases from elapsed time', () => {
    const state = service.start('Oda', 1, 'Enes', 25, 5, t0);

    expect(timerPhase(state, t0)).toEqual({
      phase: 'focus',
      remainingSeconds: 1500,
      round: 1,
    });
    expect(timerPhase(state, t0 + 1499_000)).toMatchObject({
      phase: 'focus',
      remainingSeconds: 1,
    });
    expect(timerPhase(state, t0 + 1500_000)).toMatchObject({
      phase: 'break',
      remainingSeconds: 300,
      round: 1,
    });
    expect(timerPhase(state, t0 + 1800_000)).toEqual({
      phase: 'focus',
      remainingSeconds: 1500,
      round: 2,
    });
  });

  it('freezes while paused and continues where it left off', () => {
    service.start('Oda', 1, 'Enes', 25, 5, t0);
    expect(service.pause('Oda', t0 + 60_000)).toBe(true);
    expect(service.pause('Oda', t0 + 70_000)).toBe(false);

    const paused = service.getState('Oda')!;
    expect(timerPhase(paused, t0 + 600_000).remainingSeconds).toBe(1440);

    expect(service.resume('Oda', t0 + 600_000)).toBe(true);
    const resumed = service.getState('Oda')!;
    expect(timerPhase(resumed, t0 + 600_000).remainingSeconds).toBe(1440);
    expect(timerPhase(resumed, t0 + 660_000).remainingSeconds).toBe(1380);
  });

  it('includes server time in snapshots and stops cleanly', () => {
    service.start('Oda', 1, 'Enes', 25, 5, t0);
    expect(service.snapshot('Oda', t0 + 5)?.serverNow).toBe(t0 + 5);
    expect(service.stop('Oda')).toBe(true);
    expect(service.snapshot('Oda')).toBeNull();
  });

  it('keeps the timer for a grace period after the room empties', () => {
    jest.useFakeTimers();
    service.start('Oda', 1, 'Enes', 25, 5, t0);

    service.scheduleDrop('Oda', 1000);
    service.cancelDrop('Oda');
    jest.advanceTimersByTime(2000);
    expect(service.getState('Oda')).not.toBeNull();

    service.scheduleDrop('Oda', 1000);
    jest.advanceTimersByTime(1001);
    expect(service.getState('Oda')).toBeNull();
    jest.useRealTimers();
  });
});
