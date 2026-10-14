/**
 * Odadaki kişi kutularının rengi. Her kişi kimliğine göre sabit bir renk alır;
 * aynı kişi her odada aynı renkte görünür. Renkler index.css'teki mb-tile-* token'larıdır
 * (açık ve koyu temada ayrı tonlar). Sınıf adları Tailwind'in görebilmesi için tam yazılır.
 */
const TILE_CLASSES = [
  'bg-mb-tile-1',
  'bg-mb-tile-2',
  'bg-mb-tile-3',
  'bg-mb-tile-4',
  'bg-mb-tile-5',
  'bg-mb-tile-6',
  'bg-mb-tile-7',
  'bg-mb-tile-8',
] as const;

export function tileColorFor(userId: number): string {
  return TILE_CLASSES[Math.abs(userId) % TILE_CLASSES.length];
}
