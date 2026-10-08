import { describe, expect, it } from 'vitest';
import { ERASER_RADIUS_PX, strokeHit } from './ink';
import type { BoardStroke } from './types';

const stroke = (points: BoardStroke['points'], width = 0.004): BoardStroke => ({ id: 's1', page: 1, tool: 'pen', color: '#000', width, points });

describe('strokeHit (silgi)', () => {
  // 1000x600 piksellik bir sayfada yatay bir çizgi: (100,300) → (500,300)
  const line = stroke([
    [0.1, 0.5],
    [0.5, 0.5],
  ]);

  it('hits when the eraser is on the line', () => {
    expect(strokeHit(line, [0.3, 0.5], 1000, 600)).toBe(true);
  });

  it('hits within the eraser radius next to the line', () => {
    const offsetPx = ERASER_RADIUS_PX; // çizginin hemen üstü
    expect(strokeHit(line, [0.3, (300 - offsetPx) / 600], 1000, 600)).toBe(true);
  });

  it('misses when the eraser is far from the line', () => {
    expect(strokeHit(line, [0.3, 0.6], 1000, 600)).toBe(false);
    expect(strokeHit(line, [0.8, 0.5], 1000, 600)).toBe(false);
  });

  it('handles a single dot', () => {
    const dot = stroke([[0.5, 0.5]]);
    expect(strokeHit(dot, [0.505, 0.5], 1000, 600)).toBe(true);
    expect(strokeHit(dot, [0.6, 0.5], 1000, 600)).toBe(false);
  });
});
