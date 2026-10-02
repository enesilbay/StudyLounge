import { BadRequestException, Injectable } from '@nestjs/common';

/** Lazer yalnizca canli iletilir, hic saklanmaz. */
export type BoardTool = 'pen' | 'highlighter' | 'laser';

/**
 * Noktalar sayfa boyutuna gore 0..1 araliginda tutulur; ekran boyutundan
 * bagimsizdir. Ucuncu deger istege bagli kalem basincidir (0..1); yalnizca
 * basinc algilayan kalemlerden gelir.
 */
export type BoardPoint = [number, number] | [number, number, number];

export interface BoardStroke {
  id: string;
  userId: number;
  page: number;
  tool: BoardTool;
  color: string;
  /** Kalem kalinligi, sayfa genisliginin orani olarak (or. 0.004). */
  width: number;
  points: BoardPoint[];
}

export interface BoardState {
  /** 'pdf': yuklenmis PDF uzerine cizim. 'blank': bos beyaz tahta. */
  kind: 'pdf' | 'blank';
  fileUrl: string | null;
  fileName: string;
  /** Bos tahtada acilmis sayfa sayisi; PDF'te sayfa sayisini istemci bilir. */
  pageCount: number | null;
  openedBy: number;
  openedByName: string;
  page: number;
  strokes: BoardStroke[];
}

const MAX_STROKES_PER_ROOM = 4000;
const MAX_POINTS_PER_STROKE = 3000;
const MAX_PAGE = 2000;
const MAX_BLANK_PAGES = 50;
const UPLOADED_PDF = /^\/uploads\/[\w.-]+\.pdf$/i;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const STROKE_ID = /^[\w-]{6,64}$/;
const EMPTY_ROOM_GRACE_MS = 2 * 60 * 1000;

/**
 * Odadaki ortak tahtanin (PDF ya da bos tahta) durumunu tutar.
 * Durum bellekte kalir; odadaki son kisi ciktiktan 2 dakika sonra silinir.
 * PDF dosyasi mesaj yukleme ucu ile /uploads altina kaydedilir,
 * burada yalnizca adresi ve uzerindeki cizimler saklanir.
 */
@Injectable()
export class WhiteboardService {
  private boards = new Map<string, BoardState>();
  private dropTimers = new Map<string, ReturnType<typeof setTimeout>>();

  getState(roomName: string): BoardState | null {
    return this.boards.get(roomName) ?? null;
  }

  open(
    roomName: string,
    userId: number,
    userName: string,
    fileUrl: unknown,
    fileName: unknown,
  ): BoardState {
    if (typeof fileUrl !== 'string' || !UPLOADED_PDF.test(fileUrl)) {
      throw new BadRequestException(
        'Tahtada yalnizca odaya yuklenmis PDF dosyalari acilabilir.',
      );
    }
    const name =
      typeof fileName === 'string' && fileName.trim()
        ? fileName.trim().slice(0, 120)
        : 'Belge.pdf';

    const state: BoardState = {
      kind: 'pdf',
      fileUrl,
      fileName: name,
      pageCount: null,
      openedBy: userId,
      openedByName: userName,
      page: 1,
      strokes: [],
    };
    this.boards.set(roomName, state);
    return state;
  }

  openBlank(roomName: string, userId: number, userName: string): BoardState {
    const state: BoardState = {
      kind: 'blank',
      fileUrl: null,
      fileName: 'Boş tahta',
      pageCount: 1,
      openedBy: userId,
      openedByName: userName,
      page: 1,
      strokes: [],
    };
    this.boards.set(roomName, state);
    return state;
  }

  close(roomName: string): boolean {
    this.cancelDrop(roomName);
    return this.boards.delete(roomName);
  }

  /**
   * Ortak sayfayi degistirir. Bos tahtada son sayfadan bir sonrakine
   * gecmek yeni bir sayfa acar.
   */
  setPage(
    roomName: string,
    page: unknown,
  ): { page: number; pageCount: number | null } | null {
    const board = this.boards.get(roomName);
    const next = Math.trunc(Number(page));
    if (!board || !Number.isFinite(next) || next < 1 || next > MAX_PAGE) {
      return null;
    }
    if (board.kind === 'blank') {
      const count = board.pageCount ?? 1;
      if (next > count + 1 || next > MAX_BLANK_PAGES) return null;
      board.pageCount = Math.max(count, next);
    }
    board.page = next;
    return { page: next, pageCount: board.pageCount };
  }

  /** Istemciden gelen cizgiyi dogrular ve kaydeder. Gecersizse null doner. */
  addStroke(
    roomName: string,
    userId: number,
    raw: unknown,
  ): BoardStroke | null {
    const board = this.boards.get(roomName);
    if (!board || board.strokes.length >= MAX_STROKES_PER_ROOM) {
      return null;
    }
    const stroke = this.sanitizeStroke(userId, raw);
    if (
      !stroke ||
      stroke.tool === 'laser' ||
      board.strokes.some((s) => s.id === stroke.id)
    ) {
      return null;
    }
    board.strokes.push(stroke);
    return stroke;
  }

  /** Canli (henuz bitmemis) cizgiyi saklamadan dogrular. */
  sanitizeLive(userId: number, raw: unknown): BoardStroke | null {
    return this.sanitizeStroke(userId, raw);
  }

  /** Silgi: odadaki herkes her cizgiyi silebilir (ortak calisma tahtasi). */
  removeStrokes(roomName: string, ids: unknown): string[] {
    const board = this.boards.get(roomName);
    if (!board || !Array.isArray(ids)) {
      return [];
    }
    const wanted = new Set(
      ids.filter((id): id is string => typeof id === 'string').slice(0, 500),
    );
    const removed: string[] = [];
    board.strokes = board.strokes.filter((stroke) => {
      if (!wanted.has(stroke.id)) return true;
      removed.push(stroke.id);
      return false;
    });
    return removed;
  }

  clearPage(roomName: string, page: unknown): number | null {
    const board = this.boards.get(roomName);
    const target = Math.trunc(Number(page));
    if (!board || !Number.isFinite(target)) {
      return null;
    }
    board.strokes = board.strokes.filter((stroke) => stroke.page !== target);
    return target;
  }

  /**
   * Oda bosaldiginda tahta hemen silinmez: tek kisinin sayfayi yenilemesi
   * ya da baglantisinin kisa sure kopmasi cizimleri kaybettirmesin.
   */
  scheduleDrop(roomName: string, delayMs = EMPTY_ROOM_GRACE_MS) {
    if (!this.boards.has(roomName) || this.dropTimers.has(roomName)) return;
    const timer = setTimeout(() => {
      this.dropTimers.delete(roomName);
      this.boards.delete(roomName);
    }, delayMs);
    timer.unref?.();
    this.dropTimers.set(roomName, timer);
  }

  /** Odaya biri geri geldi: bekleyen silmeyi iptal et. */
  cancelDrop(roomName: string) {
    const timer = this.dropTimers.get(roomName);
    if (timer) {
      clearTimeout(timer);
      this.dropTimers.delete(roomName);
    }
  }

  dropRoom(roomName: string) {
    this.cancelDrop(roomName);
    this.boards.delete(roomName);
  }

  private sanitizeStroke(userId: number, raw: unknown): BoardStroke | null {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw as Record<string, unknown>;

    const id = typeof data.id === 'string' ? data.id : '';
    const page = Math.trunc(Number(data.page));
    const tool: BoardTool =
      data.tool === 'highlighter' || data.tool === 'laser' ? data.tool : 'pen';
    const color = typeof data.color === 'string' ? data.color : '';
    const width = Number(data.width);

    if (
      !STROKE_ID.test(id) ||
      !Number.isFinite(page) ||
      page < 1 ||
      page > MAX_PAGE ||
      !HEX_COLOR.test(color) ||
      !Number.isFinite(width) ||
      width <= 0 ||
      width > 0.08 ||
      !Array.isArray(data.points)
    ) {
      return null;
    }

    const points: BoardPoint[] = [];
    for (const point of data.points.slice(0, MAX_POINTS_PER_STROKE)) {
      if (!Array.isArray(point)) continue;
      const x = Number(point[0]);
      const y = Number(point[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const pressure = point.length > 2 ? Number(point[2]) : NaN;
      points.push(
        Number.isFinite(pressure)
          ? [round(clamp(x)), round(clamp(y)), round(clamp(pressure))]
          : [round(clamp(x)), round(clamp(y))],
      );
    }
    if (points.length === 0) return null;

    return { id, userId, page, tool, color, width, points };
  }
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}
