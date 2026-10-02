import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSocket } from '../socket';
import type { BoardPoint, BoardState, BoardStroke } from './types';

const LIVE_STROKE_TIMEOUT_MS = 8000;
/** Lazer izinde tutulan son nokta sayısı (kuyruklu yıldız gibi kısa bir iz). */
const LASER_TAIL_POINTS = 26;

/** Kaybolan lazer izi. `updatedAt` performance.now() zamanıdır; solma buna göre hesaplanır. */
export interface LaserTrail {
  stroke: BoardStroke;
  updatedAt: number;
}

/**
 * Odadaki ortak tahtanın (PDF ya da boş tahta) durumu. Herkes aynı sayfayı görür; çizgiler
 * çizilirken parça parça (board_live), bitince bütün olarak (board_stroke)
 * gönderilir. Sunucu son durumu tutar, odaya sonradan gelen herkese yollar.
 */
export function useRoomBoard({ roomName, enabled }: { roomName: string | null; enabled: boolean }) {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [live, setLive] = useState<Record<string, BoardStroke>>({});
  const [error, setError] = useState<string | null>(null);
  // Canlı çizginin son parçasının geldiği an; çizen kişi koparsa çizgi bir süre sonra silinir.
  const liveSeenAt = useRef(new Map<string, number>());
  // Lazer izleri React durumu yerine ref'te tutulur; tahta bunları her karede soldurarak çizer.
  const lasers = useRef(new Map<string, LaserTrail>());
  const [laserVersion, setLaserVersion] = useState(0);

  const trackLaser = useCallback((stroke: BoardStroke, newPoints: BoardPoint[]) => {
    const previous = lasers.current.get(stroke.id);
    const points = [...(previous?.stroke.points ?? []), ...newPoints].slice(-LASER_TAIL_POINTS);
    lasers.current.set(stroke.id, { stroke: { ...stroke, points }, updatedAt: performance.now() });
    setLaserVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !roomName) return;
    const socket = getSocket();

    const onState = (payload: { board: BoardState | null }) => {
      setBoard(payload.board);
      setLive({});
    };
    const onPage = (payload: { page: number; pageCount?: number | null }) =>
      setBoard((current) => (current ? { ...current, page: payload.page, pageCount: payload.pageCount ?? current.pageCount } : current));
    const onStroke = (payload: { stroke: BoardStroke }) => {
      setLive((current) => {
        if (!current[payload.stroke.id]) return current;
        const next = { ...current };
        delete next[payload.stroke.id];
        return next;
      });
      setBoard((current) => {
        if (!current || current.strokes.some((stroke) => stroke.id === payload.stroke.id)) return current;
        return { ...current, strokes: [...current.strokes, payload.stroke] };
      });
    };
    // Canlı parça: yalnızca yeni noktalar gelir, önceki parçaların sonuna eklenir.
    const onLive = (payload: { stroke: BoardStroke }) => {
      const part = payload.stroke;
      if (part.tool === 'laser') {
        trackLaser(part, part.points);
        return;
      }
      liveSeenAt.current.set(part.id, Date.now());
      setLive((current) => {
        const previous = current[part.id];
        return { ...current, [part.id]: previous ? { ...previous, points: [...previous.points, ...part.points] } : part };
      });
    };
    const onErased = (payload: { ids: string[] }) => {
      const ids = new Set(payload.ids);
      setBoard((current) => (current ? { ...current, strokes: current.strokes.filter((stroke) => !ids.has(stroke.id)) } : current));
    };
    const onCleared = (payload: { page: number }) => {
      setBoard((current) => (current ? { ...current, strokes: current.strokes.filter((stroke) => stroke.page !== payload.page) } : current));
    };
    const onError = (payload: { message?: string }) => setError(payload.message ?? 'Tahta güncellenemedi.');

    socket.on('board_state', onState);
    socket.on('board_page', onPage);
    socket.on('board_stroke', onStroke);
    socket.on('board_live', onLive);
    socket.on('board_erased', onErased);
    socket.on('board_cleared', onCleared);
    socket.on('board_error', onError);
    socket.emit('board_sync');

    const seenAt = liveSeenAt.current;
    const trails = lasers.current;
    const prune = window.setInterval(() => {
      const stale = [...seenAt].filter(([, at]) => Date.now() - at > LIVE_STROKE_TIMEOUT_MS).map(([id]) => id);
      if (!stale.length) return;
      stale.forEach((id) => seenAt.delete(id));
      setLive((current) => {
        const next = { ...current };
        stale.forEach((id) => delete next[id]);
        return next;
      });
    }, LIVE_STROKE_TIMEOUT_MS / 2);

    return () => {
      socket.off('board_state', onState);
      socket.off('board_page', onPage);
      socket.off('board_stroke', onStroke);
      socket.off('board_live', onLive);
      socket.off('board_erased', onErased);
      socket.off('board_cleared', onCleared);
      socket.off('board_error', onError);
      window.clearInterval(prune);
      seenAt.clear();
      trails.clear();
      setBoard(null);
      setLive({});
    };
  }, [enabled, roomName, trackLaser]);

  const open = useCallback((fileUrl: string, fileName: string) => {
    setError(null);
    getSocket().emit('board_open', { fileUrl, fileName });
  }, []);

  const openBlank = useCallback(() => {
    setError(null);
    getSocket().emit('board_open', { blank: true });
  }, []);

  const close = useCallback(() => getSocket().emit('board_close'), []);

  const setPage = useCallback((page: number) => {
    // Boş tahtada son sayfadan ileri gitmek yeni sayfa açar; sunucu da aynı kuralı uygular.
    setBoard((current) =>
      current ? { ...current, page, pageCount: current.pageCount === null ? null : Math.max(current.pageCount, page) } : current,
    );
    getSocket().emit('board_page', { page });
  }, []);

  /** Kendi lazerini yerelde gösterir ve odaya canlı yollar (kaydedilmez). */
  const sendLaser = useCallback(
    (stroke: BoardStroke, newPoints: BoardPoint[]) => {
      if (!newPoints.length) return;
      trackLaser(stroke, newPoints);
      getSocket().volatile.emit('board_live', { stroke: { ...stroke, points: newPoints } });
    },
    [trackLaser],
  );

  /** Çizim sürerken yeni noktaları gönderir (kaybolabilir; bitişte tam çizgi gelir). */
  const sendLive = useCallback((stroke: BoardStroke, newPoints: BoardPoint[]) => {
    if (!newPoints.length) return;
    getSocket().volatile.emit('board_live', { stroke: { ...stroke, points: newPoints } });
  }, []);

  const commitStroke = useCallback((stroke: BoardStroke) => {
    // İyimser ekleme: sunucunun yankısı aynı kimlikle gelir ve yok sayılır.
    setBoard((current) => (current ? { ...current, strokes: [...current.strokes, stroke] } : current));
    getSocket().emit('board_stroke', { stroke });
  }, []);

  const erase = useCallback((ids: string[]) => {
    if (!ids.length) return;
    const set = new Set(ids);
    setBoard((current) => (current ? { ...current, strokes: current.strokes.filter((stroke) => !set.has(stroke.id)) } : current));
    getSocket().emit('board_erase', { ids });
  }, []);

  const clearPage = useCallback((page: number) => {
    setBoard((current) => (current ? { ...current, strokes: current.strokes.filter((stroke) => stroke.page !== page) } : current));
    getSocket().emit('board_clear', { page });
  }, []);

  const liveStrokes = useMemo(() => Object.values(live), [live]);

  return {
    board,
    liveStrokes,
    lasers,
    laserVersion,
    error,
    clearError: () => setError(null),
    open,
    openBlank,
    close,
    setPage,
    sendLive,
    sendLaser,
    commitStroke,
    erase,
    clearPage,
  };
}

export type RoomBoard = ReturnType<typeof useRoomBoard>;
