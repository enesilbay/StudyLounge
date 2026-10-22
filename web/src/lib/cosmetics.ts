/*
 * Mağaza ürünlerinin görünümü: çerçeve halkaları, profil kapakları, lamba ışıkları ve mesaj balonları.
 * Bunlar arayüz rengi değil, kullanıcının satın aldığı ürünün kendisidir (veri); bu yüzden mb-* token'ı
 * yerine burada tek yerde tutulur. Ürün kimlikleri ve fiyatlar backend'deki shop-catalog.ts ile aynıdır.
 */

export interface FrameStyle {
  /** Halkanın zemini (CSS background). */
  ring: string;
  /** Halka yavaşça döner (degrade çerçeveler). */
  spin?: boolean;
}

export const FRAME_STYLES: Record<string, FrameStyle> = {
  gold: { ring: 'linear-gradient(135deg, #f8dc8c, #c48a2c 40%, #fbe9b3 60%, #a8701b)' },
  emerald: { ring: 'linear-gradient(135deg, #7ee0b2, #1a7a52 45%, #b4f0d2 65%, #0d5a3c)' },
  ruby: { ring: 'linear-gradient(135deg, #ff9a8a, #b8323a 45%, #ffc0b0 65%, #8a1c28)' },
  ocean: { ring: 'linear-gradient(135deg, #8fdcff, #0a6aa8 45%, #b2f4ff 65%, #1e3a8a)' },
  sunset: { ring: 'linear-gradient(135deg, #fde047, #fb923c 35%, #f43f5e 70%, #a855f7)' },
  sakura: { ring: 'linear-gradient(135deg, #fde2f0, #f472b6 40%, #fff0f7 60%, #d6337a)' },
  cosmic: { ring: 'linear-gradient(135deg, #b9a3ff, #4c1d95 45%, #d4c8ff 65%, #1e1b4b)' },
  aurora: { ring: 'conic-gradient(from 200deg, #34d399, #22d3ee, #818cf8, #c084fc, #34d399)', spin: true },
  prism: { ring: 'conic-gradient(#f43f5e, #f59e0b, #eab308, #22c55e, #06b6d4, #6366f1, #d946ef, #f43f5e)', spin: true },
};

/** Profil üst bandının zemini; hepsi koyu tonlu, üstündeki beyaz yazı okunur kalır. */
export const COVER_STYLES: Record<string, string> = {
  library:
    'radial-gradient(circle at 82% 18%, rgba(255, 200, 100, 0.5), transparent 42%), linear-gradient(135deg, #1c1917, #292524 55%, #452f1c)',
  forest:
    'radial-gradient(circle at 12% 88%, rgba(134, 239, 172, 0.38), transparent 45%), linear-gradient(135deg, #04221f, #065f46 55%, #14532d)',
  sunrise:
    'radial-gradient(circle at 78% 85%, rgba(253, 224, 71, 0.55), transparent 40%), linear-gradient(135deg, #5b1a0e, #c2410c 50%, #be185d)',
  ocean:
    'radial-gradient(circle at 20% 15%, rgba(103, 232, 249, 0.4), transparent 40%), linear-gradient(135deg, #082f49, #1e3a8a 55%, #312e81)',
  galaxy:
    'radial-gradient(circle at 18% 30%, rgba(196, 181, 253, 0.55), transparent 28%), radial-gradient(circle at 78% 72%, rgba(244, 114, 182, 0.45), transparent 32%), radial-gradient(circle at 55% 12%, rgba(255, 255, 255, 0.3), transparent 6%), linear-gradient(135deg, #0b0725, #1e1b4b 50%, #3b1d6e)',
};

/** Odada odaklanınca kutunun etrafındaki lamba ışığı. */
export const LAMP_COLORS: Record<string, string> = {
  classic: 'var(--color-mb-lamp)',
  mint: '#5eead4',
  sky: '#7dd3fc',
  rose: '#fda4af',
  violet: '#c4b5fd',
  flame: '#fb923c',
};

/** Mobilin varsayılan balon rengi; web'de bu renk "satın alınmamış" sayılır ve marka rengi kullanılır. */
export const DEFAULT_BUBBLE_COLOR = '#4F46E5';

export function frameStyle(frame?: string | null): FrameStyle | null {
  return frame ? FRAME_STYLES[frame] ?? null : null;
}

export function coverStyle(cover?: string | null): string | null {
  return cover ? COVER_STYLES[cover] ?? null : null;
}

export function lampColor(lamp?: string | null): string {
  return (lamp && LAMP_COLORS[lamp]) || LAMP_COLORS.classic;
}

/** Satın alınmış balon rengi; varsayılan ya da tanınmayan renkte null döner. */
export function purchasedBubbleColor(color?: string | null): string | null {
  if (!color || color.toUpperCase() === DEFAULT_BUBBLE_COLOR) return null;
  return /^#[0-9a-f]{6}$/i.test(color) ? color : null;
}
