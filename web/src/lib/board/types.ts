/** Ortak tahta (PDF ya da boş tahta). Backend karşılığı: backend/src/whiteboard/whiteboard.service.ts */

/** Lazer yalnızca canlı iletilir, kaydedilmez. */
export type BoardTool = 'pen' | 'highlighter' | 'laser';

/**
 * Sayfa boyutuna göre 0..1 aralığında [x, y]. Üçüncü değer isteğe bağlı kalem
 * basıncıdır (0..1); yalnızca basınç algılayan kalemlerden (tablet, iPad) gelir.
 */
export type BoardPoint = [number, number] | [number, number, number];

export interface BoardStroke {
  id: string;
  userId?: number;
  page: number;
  tool: BoardTool;
  color: string;
  /** Sayfa genişliğinin oranı olarak kalınlık. */
  width: number;
  points: BoardPoint[];
}

export interface BoardState {
  /** 'pdf': yüklenmiş PDF üstüne çizim. 'blank': boş beyaz tahta. */
  kind: 'pdf' | 'blank';
  fileUrl: string | null;
  fileName: string;
  /** Boş tahtada açılmış sayfa sayısı; PDF'te null (sayfa sayısını PDF verir). */
  pageCount: number | null;
  openedBy: number;
  openedByName: string;
  page: number;
  strokes: BoardStroke[];
}

/*
 * Kalem renkleri arayüz rengi değil, belge üstüne çizilen içeriktir; tema
 * değişse de aynı kalmaları gerekir (herkes aynı çizimi aynı renkte görür).
 * Fosforlu kalemin ilk rengi, temadaki lamba pembesiyle aynıdır.
 */
export const PEN_COLORS = [
  { name: 'Turkuaz', value: '#0b7a76' },
  { name: 'Mürekkep', value: '#12302f' },
  { name: 'Gül', value: '#c2306a' },
  { name: 'Kırmızı', value: '#d23b2a' },
];

export const HIGHLIGHTER_COLORS = [
  { name: 'Pembe', value: '#f2a7bc' },
  { name: 'Deniz', value: '#7fe0d8' },
  { name: 'Limon', value: '#f5e56b' },
];

/** Lazer izi; beyaz sayfada da görünsün diye pembenin koyu tonu. */
export const LASER_COLOR = '#e0457b';

export type StrokeSize = 'thin' | 'medium' | 'thick';

export const STROKE_SIZES: Array<{ key: StrokeSize; label: string }> = [
  { key: 'thin', label: 'İnce' },
  { key: 'medium', label: 'Orta' },
  { key: 'thick', label: 'Kalın' },
];

/** Kalınlıklar sayfa genişliğinin oranıdır; her ekran boyutunda aynı görünür. */
export const PEN_WIDTHS: Record<StrokeSize, number> = { thin: 0.0028, medium: 0.0045, thick: 0.008 };
export const HIGHLIGHTER_WIDTHS: Record<StrokeSize, number> = { thin: 0.016, medium: 0.024, thick: 0.036 };
export const LASER_WIDTH = 0.007;

/** Boş tahta sayfasının en/boy oranı (yatay, sunum tahtası gibi). */
export const BLANK_PAGE_ASPECT = 16 / 10;
export const MAX_BLANK_PAGES = 50;

export const MAX_POINTS_PER_STROKE = 3000;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

export function isPdfUrl(url?: string | null) {
  return Boolean(url && /\.pdf$/i.test(url));
}
