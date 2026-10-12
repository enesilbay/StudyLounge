/* Odak odası sahnesinin yerleşim sabitleri (RoomScene.tsx ile birlikte kullanılır). */

/**
 * Ortak masanın çevresindeki 8 yer (geniş ekranda 3×3 ızgara, orta hücre ortak masa).
 * Sıra: önce yanlar, sonra üst ve alt köşeler, en son tam üst ve alt. Az kişiyle sahne
 * iki sıraya sığar, kontrol çubuğunun altında kalan masa olmaz.
 */
export const SEAT_POSITIONS = [
  'md:col-start-1 md:row-start-2',
  'md:col-start-3 md:row-start-2',
  'md:col-start-1 md:row-start-1',
  'md:col-start-3 md:row-start-1',
  'md:col-start-1 md:row-start-3',
  'md:col-start-3 md:row-start-3',
  'md:col-start-2 md:row-start-1',
  'md:col-start-2 md:row-start-3',
];

/** Sahnede en az bu kadar yer görünür; kalabalık odada kişi sayısı kadar (en fazla 8). */
export const MIN_SEATS = 4;

export const TABLE_POSITION = 'md:col-start-2 md:row-start-2';

/** Ortak masaya düşen lamba ışığı (yalnızca odakta biri varken). */
export const LAMP_LIGHT = { backgroundImage: 'radial-gradient(90% 70% at 50% 0%, color-mix(in srgb, var(--color-mb-lamp) 30%, transparent), transparent 70%)' };
