import { BadRequestException, Injectable } from '@nestjs/common';

export interface RoomTimerState {
  focusSeconds: number;
  breakSeconds: number;
  /** Duraklatmalar kadar ileri kaydirilmis baslangic zamani (epoch ms). */
  startedAt: number;
  /** Duraklatildiysa duraklatma ani (epoch ms), calisiyorsa null. */
  pausedAt: number | null;
  startedBy: number;
  startedByName: string;
}

export interface RoomTimerSnapshot extends RoomTimerState {
  /** Istemci kendi saatiyle arasindaki farki bununla duzeltir. */
  serverNow: number;
}

export type TimerPhase = 'focus' | 'break';

const MIN_FOCUS_MINUTES = 5;
const MAX_FOCUS_MINUTES = 120;
const MIN_BREAK_MINUTES = 1;
const MAX_BREAK_MINUTES = 30;
const EMPTY_ROOM_GRACE_MS = 2 * 60 * 1000;

/**
 * Odanin ortak Pomodoro sayaci. Sunucu yalnizca baslangic zamanini, sureleri
 * ve duraklatmayi tutar; hangi asamada olunduguna herkes `timerPhase` ile ayni
 * sonuca varir. Bu yuzden sunucuda asama degisimi icin zamanlayici gerekmez.
 */
@Injectable()
export class RoomTimerService {
  private timers = new Map<string, RoomTimerState>();
  private dropTimers = new Map<string, ReturnType<typeof setTimeout>>();

  getState(roomName: string): RoomTimerState | null {
    return this.timers.get(roomName) ?? null;
  }

  snapshot(roomName: string, now = Date.now()): RoomTimerSnapshot | null {
    const state = this.timers.get(roomName);
    return state ? { ...state, serverNow: now } : null;
  }

  start(
    roomName: string,
    userId: number,
    userName: string,
    focusMinutes: unknown,
    breakMinutes: unknown,
    now = Date.now(),
  ): RoomTimerState {
    const focus = Math.trunc(Number(focusMinutes));
    const rest = Math.trunc(Number(breakMinutes));
    if (
      !Number.isFinite(focus) ||
      focus < MIN_FOCUS_MINUTES ||
      focus > MAX_FOCUS_MINUTES ||
      !Number.isFinite(rest) ||
      rest < MIN_BREAK_MINUTES ||
      rest > MAX_BREAK_MINUTES
    ) {
      throw new BadRequestException(
        `Odak ${MIN_FOCUS_MINUTES}-${MAX_FOCUS_MINUTES} dk, mola ${MIN_BREAK_MINUTES}-${MAX_BREAK_MINUTES} dk olabilir.`,
      );
    }
    const state: RoomTimerState = {
      focusSeconds: focus * 60,
      breakSeconds: rest * 60,
      startedAt: now,
      pausedAt: null,
      startedBy: userId,
      startedByName: userName,
    };
    this.timers.set(roomName, state);
    return state;
  }

  pause(roomName: string, now = Date.now()): boolean {
    const state = this.timers.get(roomName);
    if (!state || state.pausedAt !== null) return false;
    state.pausedAt = now;
    return true;
  }

  resume(roomName: string, now = Date.now()): boolean {
    const state = this.timers.get(roomName);
    if (!state || state.pausedAt === null) return false;
    state.startedAt += now - state.pausedAt;
    state.pausedAt = null;
    return true;
  }

  stop(roomName: string): boolean {
    this.cancelDrop(roomName);
    return this.timers.delete(roomName);
  }

  /** Oda bosalinca sayac hemen silinmez; sayfayi yenileyen tek kisi kaybetmesin. */
  scheduleDrop(roomName: string, delayMs = EMPTY_ROOM_GRACE_MS) {
    if (!this.timers.has(roomName) || this.dropTimers.has(roomName)) return;
    const timer = setTimeout(() => {
      this.dropTimers.delete(roomName);
      this.timers.delete(roomName);
    }, delayMs);
    timer.unref?.();
    this.dropTimers.set(roomName, timer);
  }

  cancelDrop(roomName: string) {
    const timer = this.dropTimers.get(roomName);
    if (timer) {
      clearTimeout(timer);
      this.dropTimers.delete(roomName);
    }
  }
}

/**
 * Sayacin `now` anindaki asamasi. Web istemcisi ayni hesabi yapar
 * (web/src/lib/roomTimer.ts); ikisi degisirse birlikte guncellenmeli.
 */
export function timerPhase(
  state: RoomTimerState,
  now: number,
): { phase: TimerPhase; remainingSeconds: number; round: number } {
  const at = state.pausedAt ?? now;
  const elapsed = Math.max(0, (at - state.startedAt) / 1000);
  const cycle = state.focusSeconds + state.breakSeconds;
  const round = Math.floor(elapsed / cycle) + 1;
  const inCycle = elapsed % cycle;
  return inCycle < state.focusSeconds
    ? {
        phase: 'focus',
        remainingSeconds: Math.ceil(state.focusSeconds - inCycle),
        round,
      }
    : {
        phase: 'break',
        remainingSeconds: Math.ceil(cycle - inCycle),
        round,
      };
}
