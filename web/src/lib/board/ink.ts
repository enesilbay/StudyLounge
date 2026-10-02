import { getStroke, type StrokeOptions } from 'perfect-freehand';
import { LASER_COLOR, type BoardPoint, type BoardStroke, type BoardTool } from './types';

/*
 * Tahtadaki mürekkep: çizgiler düz bir polyline yerine `perfect-freehand` ile
 * kalem gibi çizilir. Hıza (fare/parmak) ya da gerçek basınca (tablet kalemi)
 * göre kalınlaşıp incelir, köşeler yumuşar. Sonuç bir dış hat çokgenidir ve
 * Path2D olarak doldurulur.
 */

export const ERASER_RADIUS_PX = 12;
/** Lazer izi bu süre tam görünür, sonra solar. */
const LASER_HOLD_MS = 450;
const LASER_FADE_MS = 650;

const DEFAULT_PRESSURE = 0.5;

function optionsFor(stroke: BoardStroke, sizePx: number, complete: boolean): StrokeOptions {
  const realPressure = stroke.points.some((point) => point.length > 2);
  if (stroke.tool === 'highlighter') {
    // Fosforlu kalem: sabit kalınlık, yumuşak ama keskin olmayan kenar.
    return { size: sizePx, thinning: 0, smoothing: 0.7, streamline: 0.6, simulatePressure: false, last: complete };
  }
  if (stroke.tool === 'laser') {
    // Lazer: kuyruğu incelen parlak iz.
    return { size: sizePx, thinning: 0.6, smoothing: 0.5, streamline: 0.35, simulatePressure: false, last: false, start: { taper: true } };
  }
  return {
    size: sizePx,
    // Gerçek kalemde basınç belirgin hissedilsin; fare/parmakta basınç hızdan
    // tahmin edildiği için incelme daha hafif tutulur, yoksa çizgi kılcal kalır.
    thinning: realPressure ? 0.65 : 0.35,
    smoothing: 0.6,
    streamline: 0.45,
    simulatePressure: !realPressure,
    last: complete,
  };
}

function toSvgPath(outline: number[][]): string {
  if (outline.length < 4) return '';
  const avg = (a: number, b: number) => (a + b) / 2;
  const [a, b, c] = outline;
  let path = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${avg(b[0], c[0]).toFixed(2)},${avg(b[1], c[1]).toFixed(2)} T`;
  for (let i = 2; i < outline.length - 1; i += 1) {
    const [x1, y1] = outline[i];
    const [x2, y2] = outline[i + 1];
    path += `${avg(x1, x2).toFixed(2)},${avg(y1, y2).toFixed(2)} `;
  }
  return `${path}Z`;
}

// Bitmiş çizgilerin dış hattı her karede yeniden hesaplanmasın.
const pathCache = new WeakMap<BoardStroke, { key: string; path: Path2D }>();

function strokePath(stroke: BoardStroke, w: number, h: number, complete: boolean): Path2D {
  const key = `${w}x${h}:${stroke.points.length}:${complete ? 1 : 0}`;
  const cached = pathCache.get(stroke);
  if (cached && cached.key === key) return cached.path;

  const sizePx = Math.max(1.2, stroke.width * w);
  const input = stroke.points.map(([x, y, pressure]) => [x * w, y * h, pressure ?? DEFAULT_PRESSURE]);
  const path = new Path2D(toSvgPath(getStroke(input, optionsFor(stroke, sizePx, complete))));
  pathCache.set(stroke, { key, path });
  return path;
}

/** Kalem ya da fosforlu kalem çizgisini çizer. `complete` false ise çizgi hâlâ çiziliyordur. */
export function drawInk(ctx: CanvasRenderingContext2D, stroke: BoardStroke, w: number, h: number, complete: boolean) {
  if (!stroke.points.length) return;
  ctx.save();
  ctx.globalAlpha = stroke.tool === 'highlighter' ? 0.45 : 1;
  ctx.fillStyle = stroke.color;
  ctx.fill(strokePath(stroke, w, h, complete));
  ctx.restore();
}

/**
 * Lazer izini solarak çizer. Tamamen solmuşsa false döner (çağıran izi silebilir).
 */
export function drawLaser(ctx: CanvasRenderingContext2D, stroke: BoardStroke, w: number, h: number, updatedAt: number, now: number): boolean {
  const age = now - updatedAt;
  const alpha = age <= LASER_HOLD_MS ? 1 : 1 - (age - LASER_HOLD_MS) / LASER_FADE_MS;
  if (alpha <= 0 || !stroke.points.length) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = stroke.color;
  ctx.shadowColor = stroke.color;
  ctx.shadowBlur = 12;
  // Lazer her karede değiştiği için önbelleğe alınmaz.
  const sizePx = Math.max(2, stroke.width * w);
  const input = stroke.points.map(([x, y]) => [x * w, y * h, DEFAULT_PRESSURE]);
  ctx.fill(new Path2D(toSvgPath(getStroke(input, optionsFor(stroke, sizePx, false)))));
  ctx.restore();
  return true;
}

/** Nokta, çizginin herhangi bir parçasına silgi yarıçapı kadar yakın mı? (piksel cinsinden) */
export function strokeHit(stroke: BoardStroke, point: BoardPoint, w: number, h: number) {
  const px = point[0] * w;
  const py = point[1] * h;
  const reach = ERASER_RADIUS_PX + (stroke.width * w) / 2;
  const pts = stroke.points;
  if (pts.length === 1) return Math.hypot(pts[0][0] * w - px, pts[0][1] * h - py) <= reach;
  for (let i = 1; i < pts.length; i += 1) {
    if (segmentDistance(px, py, pts[i - 1][0] * w, pts[i - 1][1] * h, pts[i][0] * w, pts[i][1] * h) <= reach) return true;
  }
  return false;
}

function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/*
 * İmleçler: fare imleci yerine seçili renkte kalem ucu, fosforlu kalem ucu,
 * lazer noktası ya da silgi halkası görünür. SVG data URI içinde CSS
 * değişkeni kullanılamadığı için çizgi rengi doğrudan, kontur siyah/beyaz.
 */
function svgCursor(svg: string, hotX: number, hotY: number, fallback: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotX} ${hotY}, ${fallback}`;
}

export function cursorFor(tool: BoardTool | 'eraser', color: string): string {
  const svgOpen = '<svg xmlns="http://www.w3.org/2000/svg"';
  switch (tool) {
    case 'pen':
      return svgCursor(
        `${svgOpen} width="26" height="26" viewBox="0 0 26 26"><path d="M3 23l1.4-5.2L17.9 4.3a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8L8.2 21.6z" fill="${color}" stroke="white" stroke-width="2.4" stroke-linejoin="round"/><path d="M3 23l1.4-5.2L17.9 4.3a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8L8.2 21.6z" fill="${color}" stroke="black" stroke-opacity=".55" stroke-width="1" stroke-linejoin="round"/><path d="M3 23l1.4-5.2 3.8 3.8z" fill="black" fill-opacity=".75"/></svg>`,
        3,
        23,
        'crosshair',
      );
    case 'highlighter':
      return svgCursor(
        `${svgOpen} width="28" height="28" viewBox="0 0 28 28"><g transform="rotate(35 14 14)"><rect x="9" y="3" width="10" height="17" rx="2.5" fill="${color}" stroke="black" stroke-opacity=".5"/><path d="M9.5 20h9l-1.5 5h-6z" fill="${color}" stroke="black" stroke-opacity=".6"/></g></svg>`,
        8,
        25,
        'crosshair',
      );
    case 'laser':
      return svgCursor(
        `${svgOpen} width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" fill="${LASER_COLOR}" fill-opacity=".25"/><circle cx="11" cy="11" r="4.5" fill="${LASER_COLOR}" stroke="white" stroke-width="1.5"/></svg>`,
        11,
        11,
        'crosshair',
      );
    default: {
      const size = ERASER_RADIUS_PX * 2 + 4;
      const c = size / 2;
      return svgCursor(
        `${svgOpen} width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${ERASER_RADIUS_PX}" fill="white" fill-opacity=".35" stroke="black" stroke-opacity=".65" stroke-width="1.5"/></svg>`,
        c,
        c,
        'cell',
      );
    }
  }
}
