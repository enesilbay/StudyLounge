import { useCallback, useEffect, useState } from 'react';
import { getSocket } from './socket';

/** Odanın ortak Pomodoro sayacı. Backend karşılığı: backend/src/room-timer/room-timer.service.ts */
export interface RoomTimerSnapshot {
  focusSeconds: number;
  breakSeconds: number;
  startedAt: number;
  pausedAt: number | null;
  startedBy: number;
  startedByName: string;
  serverNow: number;
}

export type TimerPhase = 'focus' | 'break';

export interface TimerView {
  phase: TimerPhase;
  remainingSeconds: number;
  round: number;
  paused: boolean;
}

/** Sunucudaki `timerPhase` ile aynı hesap; biri değişirse diğeri de güncellenmeli. */
export function timerPhase(state: RoomTimerSnapshot, now: number): Omit<TimerView, 'paused'> {
  const at = state.pausedAt ?? now;
  const elapsed = Math.max(0, (at - state.startedAt) / 1000);
  const cycle = state.focusSeconds + state.breakSeconds;
  const round = Math.floor(elapsed / cycle) + 1;
  const inCycle = elapsed % cycle;
  return inCycle < state.focusSeconds
    ? { phase: 'focus', remainingSeconds: Math.ceil(state.focusSeconds - inCycle), round }
    : { phase: 'break', remainingSeconds: Math.ceil(cycle - inCycle), round };
}

/** Uzun odakta uzun mola, kısa odakta kısa mola. */
export function breakMinutesFor(focusMinutes: number) {
  return focusMinutes >= 45 ? 10 : 5;
}

interface TimerEvent {
  timer: RoomTimerSnapshot | null;
  action: 'sync' | 'start' | 'pause' | 'resume' | 'stop';
  byName?: string | null;
}

/**
 * Ortak sayacın durumu ve eylemleri. Sunucu yalnızca başlangıç zamanını
 * gönderir; aşama ve kalan süre her yarım saniyede yerelde hesaplanır.
 * Bilgisayar saatleri farklı olabileceği için sunucu saatiyle fark düzeltilir.
 */
export function useRoomTimer({ roomName, enabled }: { roomName: string | null; enabled: boolean }) {
  const [timer, setTimer] = useState<RoomTimerSnapshot | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [lastEvent, setLastEvent] = useState<{ action: TimerEvent['action']; byName: string | null; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !roomName) return;
    const socket = getSocket();
    const onTimer = (payload: TimerEvent) => {
      setTimer(payload.timer);
      if (payload.timer) setClockOffset(payload.timer.serverNow - Date.now());
      setLastEvent({ action: payload.action, byName: payload.byName ?? null, at: Date.now() });
    };
    const onError = (payload: { message?: string }) => setError(payload.message ?? 'Ortak sayaç güncellenemedi.');
    socket.on('room_timer', onTimer);
    socket.on('room_timer_error', onError);
    socket.emit('room_timer_sync');
    return () => {
      socket.off('room_timer', onTimer);
      socket.off('room_timer_error', onError);
      setTimer(null);
      setLastEvent(null);
    };
  }, [enabled, roomName]);

  useEffect(() => {
    if (!timer) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [timer]);

  const view: TimerView | null = timer ? { ...timerPhase(timer, now + clockOffset), paused: timer.pausedAt !== null } : null;

  const start = useCallback((focusMinutes: number) => {
    setError(null);
    getSocket().emit('room_timer_start', { focusMinutes, breakMinutes: breakMinutesFor(focusMinutes) });
  }, []);
  const pause = useCallback(() => getSocket().emit('room_timer_pause'), []);
  const resume = useCallback(() => getSocket().emit('room_timer_resume'), []);
  const stop = useCallback(() => getSocket().emit('room_timer_stop'), []);

  return { timer, view, lastEvent, error, clearError: () => setError(null), start, pause, resume, stop };
}

let chimeContext: AudioContext | null = null;

/** Aşama değişince çalan kısa, yumuşak iki notalı zil (ses dosyası gerektirmez). */
export function playChime(kind: TimerPhase) {
  try {
    chimeContext ??= new AudioContext();
    const ctx = chimeContext;
    void ctx.resume();
    const notes = kind === 'break' ? [659.25, 523.25] : [523.25, 783.99];
    notes.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + index * 0.22;
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
  } catch {
    /* ses kapalıysa sessizce geç */
  }
}
