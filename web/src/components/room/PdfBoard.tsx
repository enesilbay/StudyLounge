import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronLeft, ChevronRight, Eraser, Hand, Highlighter, Loader2, PenLine, Plus, Trash2, Undo2, WandSparkles, X } from 'lucide-react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type PDFPageProxy, type RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { assetUrl } from '../../lib/api';
import type { RoomBoard } from '../../lib/board/useRoomBoard';
import { cursorFor, drawInk, drawLaser, strokeHit } from '../../lib/board/ink';
import {
  BLANK_PAGE_ASPECT,
  HIGHLIGHTER_COLORS,
  HIGHLIGHTER_WIDTHS,
  LASER_COLOR,
  LASER_WIDTH,
  MAX_BLANK_PAGES,
  MAX_POINTS_PER_STROKE,
  PEN_COLORS,
  PEN_WIDTHS,
  STROKE_SIZES,
  type BoardPoint,
  type BoardState,
  type BoardStroke,
  type StrokeSize,
} from '../../lib/board/types';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Tool = 'pen' | 'highlighter' | 'laser' | 'eraser';

const LIVE_SEND_INTERVAL_MS = 50;
const LASER_SEND_INTERVAL_MS = 30;
const MIN_POINT_DISTANCE = 0.0012;
/** Boş tahtanın sanal boyutu; yalnızca en/boy oranı ve nokta ızgarası için. */
const BLANK_BASE = { width: 1600, height: Math.round(1600 / BLANK_PAGE_ASPECT) };

interface Size {
  w: number;
  h: number;
}

/**
 * Ortak tahta: PDF sayfası (ya da boş tahtada noktalı kâğıt) alttaki tuvale,
 * mürekkep üstteki saydam tuvale çizilir. Koordinatlar sayfaya göre 0..1
 * tutulduğu için farklı ekranlardaki herkes çizgiyi aynı yerde görür.
 * Başka bir belge açılınca bileşen `key` ile yeniden kurulur.
 */
export function PdfBoard({ board, actions, selfId }: { board: BoardState; actions: RoomBoard; selfId: number }) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isBlank = board.kind === 'blank';
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [area, setArea] = useState<Size>({ w: 0, h: 0 });
  const [tool, setTool] = useState<Tool>('pen');
  const [penColor, setPenColor] = useState(PEN_COLORS[0].value);
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHTER_COLORS[0].value);
  const [strokeSize, setStrokeSize] = useState<StrokeSize>('medium');
  const [confirmClear, setConfirmClear] = useState(false);
  // Avuç içi koruması: kalem algılanınca parmak/avuç dokunuşları çizmez.
  const [penSeen, setPenSeen] = useState(false);
  const [penOnly, setPenOnly] = useState(false);

  const drawingRef = useRef<{ stroke: BoardStroke; sent: number; lastSentAt: number } | null>(null);
  const frameRef = useRef<number | null>(null);

  const pageNumber = board.page;
  const pageCount = isBlank ? board.pageCount ?? 1 : doc?.numPages ?? 0;

  /* ── PDF yükleme (boş tahtada yok) ── */
  useEffect(() => {
    const url = assetUrl(board.fileUrl);
    if (isBlank || !url) return;
    const task = getDocument({ url });
    let cancelled = false;
    task.promise
      .then((loaded) => !cancelled && setDoc(loaded))
      .catch(() => !cancelled && setLoadError('PDF açılamadı. Dosya silinmiş ya da bozuk olabilir.'));
    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [board.fileUrl, isBlank]);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    const target = Math.min(Math.max(pageNumber, 1), doc.numPages);
    doc
      .getPage(target)
      .then((loaded) => !cancelled && setPage(loaded))
      .catch(() => !cancelled && setLoadError('Sayfa yüklenemedi.'));
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber]);

  /* ── Alanı ölç, sayfayı sığdır ── */
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setArea({ w: Math.floor(width), h: Math.floor(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const base = isBlank ? BLANK_BASE : page ? page.getViewport({ scale: 1 }) : null;
  const size: Size | null = (() => {
    if (!base || area.w < 40 || area.h < 40) return null;
    const scale = Math.min(area.w / base.width, area.h / base.height);
    return { w: Math.floor(base.width * scale), h: Math.floor(base.height * scale) };
  })();
  const sizeW = size?.w ?? 0;
  const sizeH = size?.h ?? 0;

  /* ── Alt katman: PDF sayfası ya da noktalı boş kâğıt ── */
  useEffect(() => {
    const canvas = pdfCanvasRef.current;
    if (!canvas || !sizeW) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(sizeW * dpr);
    canvas.height = Math.floor(sizeH * dpr);

    if (isBlank) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, sizeW, sizeH);
      // Noktalı ızgara: çizim kâğıdı hissi, yazıyı bastırmayacak kadar soluk.
      const gap = sizeW / 40;
      ctx.fillStyle = 'rgb(18 48 47 / 0.16)';
      for (let x = gap; x < sizeW; x += gap) {
        for (let y = gap; y < sizeH; y += gap) {
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.8, sizeW / 1100), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }

    if (!page) return;
    const viewport = page.getViewport({ scale: sizeW / page.getViewport({ scale: 1 }).width });
    let task: RenderTask | null = page.render({
      canvas,
      viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
    });
    task.promise.catch(() => undefined).finally(() => (task = null));
    return () => task?.cancel();
  }, [isBlank, page, sizeW, sizeH]);

  /* ── Mürekkep katmanı ── */
  const pageStrokes = useMemo(
    () => [
      ...board.strokes.filter((stroke) => stroke.page === pageNumber),
      ...actions.liveStrokes.filter((stroke) => stroke.page === pageNumber),
    ],
    [board.strokes, actions.liveStrokes, pageNumber],
  );
  // Çizim sırasında her harekette React render'ı beklemeden boyamak için ref'te tutulur.
  const strokesRef = useRef<BoardStroke[]>([]);
  const laserTrails = actions.lasers;

  /** Mürekkebi çizer; solmakta olan lazer izi varsa true döner (bir kare daha gerekir). */
  const paint = useCallback((): boolean => {
    const canvas = inkCanvasRef.current;
    if (!canvas || !sizeW) return false;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(sizeW * dpr) || canvas.height !== Math.floor(sizeH * dpr)) {
      canvas.width = Math.floor(sizeW * dpr);
      canvas.height = Math.floor(sizeH * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, sizeW, sizeH);

    strokesRef.current.forEach((stroke) => drawInk(ctx, stroke, sizeW, sizeH, true));
    const drawing = drawingRef.current?.stroke;
    if (drawing && drawing.tool !== 'laser') drawInk(ctx, drawing, sizeW, sizeH, false);

    // Lazer izleri solarak kaybolur.
    const now = performance.now();
    let fading = false;
    for (const [id, trail] of laserTrails.current) {
      if (trail.stroke.page !== pageNumber) continue;
      if (drawLaser(ctx, trail.stroke, sizeW, sizeH, trail.updatedAt, now)) fading = true;
      else laserTrails.current.delete(id);
    }
    return fading;
  }, [sizeW, sizeH, laserTrails, pageNumber]);

  // Bekleyen kare iptal edilip yenisi istenir; böylece her zaman güncel boyut ve sayfayla çizilir.
  const schedulePaint = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    const tick = () => {
      frameRef.current = null;
      if (paint()) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [paint]);

  useLayoutEffect(() => {
    strokesRef.current = pageStrokes;
    schedulePaint();
  }, [pageStrokes, actions.laserVersion, sizeW, sizeH, schedulePaint]);

  useEffect(
    () => () => {
      // Sıfırlanmazsa yeniden kurulan bileşen "kare zaten bekliyor" sanıp hiç boyamaz.
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    },
    [],
  );

  /* ── Kalem / fosforlu / lazer / silgi ── */
  const toPoint = (sample: { clientX: number; clientY: number; pressure?: number }, pointerType: string): BoardPoint | null => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (sample.clientX - rect.left) / rect.width;
    const y = (sample.clientY - rect.top) / rect.height;
    // Yalnızca gerçek kalem basınç bildirir; fare 0.5 sabit verir, kaydetmeye değmez.
    if (pointerType === 'pen' && sample.pressure && sample.pressure > 0) return [x, y, Math.round(sample.pressure * 1000) / 1000];
    return [x, y];
  };

  const eraseAt = (point: BoardPoint) => {
    if (!sizeW) return;
    const hits = strokesRef.current
      .filter((stroke) => board.strokes.some((saved) => saved.id === stroke.id))
      .filter((stroke) => strokeHit(stroke, point, sizeW, sizeH))
      .map((stroke) => stroke.id);
    actions.erase(hits);
  };

  const finishStroke = () => {
    const current = drawingRef.current;
    drawingRef.current = null;
    if (!current) return;
    if (current.stroke.tool === 'laser') {
      actions.sendLaser(current.stroke, current.stroke.points.slice(current.sent));
    } else {
      actions.commitStroke(current.stroke);
    }
    schedulePaint();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || !size) return;
    if (event.pointerType === 'pen' && !penSeen) {
      setPenSeen(true);
      setPenOnly(true);
    }
    // Avuç içi koruması açıkken parmak dokunuşu çizmez.
    if (penOnly && event.pointerType === 'touch') return;

    const point = toPoint(event, event.pointerType);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === 'eraser') {
      eraseAt(point);
      return;
    }

    const stroke: BoardStroke =
      tool === 'laser'
        ? { id: newStrokeId(), userId: selfId, page: pageNumber, tool: 'laser', color: LASER_COLOR, width: LASER_WIDTH, points: [point] }
        : {
            id: newStrokeId(),
            userId: selfId,
            page: pageNumber,
            tool,
            color: tool === 'highlighter' ? highlightColor : penColor,
            width: tool === 'highlighter' ? HIGHLIGHTER_WIDTHS[strokeSize] : PEN_WIDTHS[strokeSize],
            points: [point],
          };
    drawingRef.current = { stroke, sent: 0, lastSentAt: 0 };
    if (tool === 'laser') {
      actions.sendLaser(stroke, [point]);
      drawingRef.current.sent = 1;
    }
    schedulePaint();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    // Birleştirilmiş örnekler kalemin tüm ara noktalarını verir; boş dönerse olayın kendisi kullanılır.
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const samples = coalesced.length ? coalesced : [event.nativeEvent];

    if (tool === 'eraser') {
      const point = toPoint(event, event.pointerType);
      if (point) eraseAt(point);
      return;
    }

    const current = drawingRef.current;
    if (!current) return;
    const { points } = current.stroke;
    for (const sample of samples) {
      const point = toPoint(sample, event.pointerType);
      const last = points[points.length - 1];
      if (!point || (last && Math.hypot(point[0] - last[0], point[1] - last[1]) < MIN_POINT_DISTANCE)) continue;
      points.push(point);
    }

    const now = performance.now();
    const laser = current.stroke.tool === 'laser';
    if (now - current.lastSentAt > (laser ? LASER_SEND_INTERVAL_MS : LIVE_SEND_INTERVAL_MS)) {
      const fresh = points.slice(current.sent);
      if (laser) actions.sendLaser(current.stroke, fresh);
      else actions.sendLive(current.stroke, fresh);
      current.sent = points.length;
      current.lastSentAt = now;
    }
    if (points.length >= MAX_POINTS_PER_STROKE) finishStroke();
    schedulePaint();
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    finishStroke();
  };

  const undo = () => {
    const mine = board.strokes.filter((stroke) => stroke.page === pageNumber && stroke.userId === selfId);
    const last = mine[mine.length - 1];
    if (last) actions.erase([last.id]);
  };

  useEffect(() => {
    if (!confirmClear) return;
    const timer = window.setTimeout(() => setConfirmClear(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmClear]);

  // Boş tahtada son sayfadan ileri gitmek yeni sayfa açar.
  const lastAllowedPage = isBlank ? Math.min(pageCount + 1, MAX_BLANK_PAGES) : pageCount;
  const goTo = (target: number) => {
    if (!pageCount || target < 1 || target > lastAllowedPage || target === pageNumber) return;
    finishStroke();
    actions.setPage(target);
  };
  const nextIsNewPage = isBlank && pageNumber >= pageCount && pageNumber < MAX_BLANK_PAGES;

  const inkTool = tool === 'pen' || tool === 'highlighter';
  const colors = tool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS;
  const activeColor = tool === 'highlighter' ? highlightColor : penColor;
  const setActiveColor = tool === 'highlighter' ? setHighlightColor : setPenColor;
  const sizeIndex = STROKE_SIZES.findIndex((item) => item.key === strokeSize);
  const sizeLabel = STROKE_SIZES[sizeIndex].label;
  const hasMyStrokes = board.strokes.some((stroke) => stroke.page === pageNumber && stroke.userId === selfId);
  const pageHasStrokes = board.strokes.some((stroke) => stroke.page === pageNumber);
  const cursor = cursorFor(tool, tool === 'highlighter' ? highlightColor : penColor);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Araç çubuğu: telefonda iki sabit satır, geniş ekranda tek satır; araç değişince yükseklik değişmez */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 whitespace-nowrap border-b border-border bg-surface px-3 py-2 scrollbar-hide sm:flex-nowrap sm:overflow-x-auto">
        <div className="flex items-center gap-1" role="group" aria-label="Çizim aracı">
          <ToolButton active={tool === 'pen'} label="Kalem" onClick={() => setTool('pen')} icon={PenLine} />
          <ToolButton active={tool === 'highlighter'} label="Fosforlu kalem" onClick={() => setTool('highlighter')} icon={Highlighter} />
          <ToolButton active={tool === 'laser'} label="Lazer işaretçi: iz birkaç saniyede kaybolur, kaydedilmez" onClick={() => setTool('laser')} icon={WandSparkles} />
          <ToolButton active={tool === 'eraser'} label="Silgi: silmek istediğin çizginin üstünden geç" onClick={() => setTool('eraser')} icon={Eraser} />
        </div>

        {inkTool ? (
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Renk">
            {colors.map((color) => (
              <button
                key={color.value}
                type="button"
                role="radio"
                aria-checked={activeColor === color.value}
                aria-label={color.name}
                title={color.name}
                onClick={() => setActiveColor(color.value)}
                className={`h-6 w-6 rounded-full border-2 transition sm:h-7 sm:w-7 ${activeColor === color.value ? 'scale-110 border-textDark' : 'border-surface'}`}
                style={{ background: color.value }}
              />
            ))}
          </div>
        ) : (
          <p className="hidden text-sm text-textMuted 2xl:block">
            {tool === 'laser' ? 'Göstermek istediğin yerin üstünden geç.' : 'Çizginin üstünden geç.'}
          </p>
        )}

        {/* Telefonda kendi satırında durur */}
        <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:ml-auto sm:w-auto">
          <div className="mr-auto flex items-center gap-1 sm:mr-3">
            <button
              type="button"
              onClick={() => setStrokeSize(STROKE_SIZES[(sizeIndex + 1) % STROKE_SIZES.length].key)}
              disabled={!inkTool}
              aria-label={`Kalınlık: ${sizeLabel}. Değiştirmek için tıkla.`}
              title={`Kalınlık: ${sizeLabel}`}
              className="grid h-9 w-9 place-items-center rounded-lg text-textDark transition hover:bg-sunken disabled:opacity-40"
            >
              <span aria-hidden="true" className="rounded-full bg-current" style={{ width: [4, 7, 11][sizeIndex], height: [4, 7, 11][sizeIndex] }} />
            </button>
            {penSeen ? (
              <ToolButton
                active={penOnly}
                label={penOnly ? 'Avuç içi koruması açık: yalnızca kalem çizer' : 'Avuç içi koruması kapalı: parmak da çizer'}
                onClick={() => setPenOnly((on) => !on)}
                icon={Hand}
              />
            ) : null}
            <ToolButton label="Son çizgimi geri al" onClick={undo} icon={Undo2} disabled={!hasMyStrokes} />
            <button
              type="button"
              onClick={() => {
                if (!confirmClear) return setConfirmClear(true);
                actions.clearPage(pageNumber);
                setConfirmClear(false);
              }}
              disabled={!pageHasStrokes}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition disabled:opacity-40 ${
                confirmClear ? 'bg-danger text-background' : 'text-textMuted hover:bg-sunken hover:text-textDark'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              {confirmClear ? 'Herkes için sil' : <span className="sr-only 2xl:not-sr-only">Sayfayı temizle</span>}
            </button>
          </div>
          <ToolButton label="Önceki sayfa" onClick={() => goTo(pageNumber - 1)} icon={ChevronLeft} disabled={pageNumber <= 1} />
          <span className="min-w-16 text-center font-mono text-sm tabular-nums text-textDark" aria-live="polite">
            {pageCount ? `${pageNumber} / ${pageCount}` : '…'}
          </span>
          <ToolButton
            label={nextIsNewPage ? 'Yeni sayfa ekle' : 'Sonraki sayfa'}
            onClick={() => goTo(pageNumber + 1)}
            icon={nextIsNewPage ? Plus : ChevronRight}
            disabled={!pageCount || pageNumber >= lastAllowedPage}
          />
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <ToolButton label="Tahtayı herkes için kapat" onClick={actions.close} icon={X} />
        </div>
      </div>

      {/* Sayfa */}
      <div ref={areaRef} className="relative grid min-h-0 flex-1 place-items-center overflow-hidden p-3">
        {loadError ? (
          <p className="max-w-sm text-center text-[15px] text-white/80">{loadError}</p>
        ) : !size ? (
          <Loader2 className="h-6 w-6 animate-spin text-white/70" aria-label="Tahta yükleniyor" />
        ) : null}
        <div className={`relative overflow-hidden rounded-sm shadow-2xl ${size && !loadError ? '' : 'invisible absolute'}`} style={{ width: sizeW, height: sizeH }}>
          <canvas
            ref={pdfCanvasRef}
            className="absolute inset-0 h-full w-full bg-white"
            aria-label={isBlank ? `Boş tahta, sayfa ${pageNumber}` : `${board.fileName}, sayfa ${pageNumber}`}
          />
          <canvas
            ref={inkCanvasRef}
            className="absolute inset-0 h-full w-full touch-none"
            style={{ cursor }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  icon: Icon,
  onClick,
  active = false,
  disabled = false,
}: {
  label: string;
  icon: typeof PenLine;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={`grid h-9 w-9 place-items-center rounded-lg transition disabled:opacity-40 ${
        active ? 'bg-primary text-onPrimary' : 'text-textMuted hover:bg-sunken hover:text-textDark'
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

function newStrokeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
