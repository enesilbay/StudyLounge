import { describe, expect, it } from 'vitest';
import { fitGrid } from './useFitGrid';

describe('fitGrid', () => {
  it('tek kişi alanın tamamını oranı koruyarak kaplar', () => {
    expect(fitGrid(1, 1600, 900, 12)).toEqual({ columns: 1, width: 1600, height: 900 });
  });

  it('geniş alanda iki kişi yan yana durur ve yüksekliği aşmaz', () => {
    const grid = fitGrid(2, 1200, 500, 12);
    expect(grid.columns).toBe(2);
    expect(grid.height).toBeLessThanOrEqual(500);
  });

  it('dar alanda kutular alt alta dizilir ve hepsi sığar', () => {
    const grid = fitGrid(4, 360, 900, 8);
    const rows = Math.ceil(4 / grid.columns);
    expect(grid.columns).toBe(1);
    expect(rows * grid.height + (rows - 1) * 8).toBeLessThanOrEqual(900);
  });

  it('iki kişi geniş ekranda alt alta değil yan yana durur', () => {
    expect(fitGrid(2, 1136, 750, 12).columns).toBe(2);
  });

  it('boş alan ya da kimse yoksa sıfır döner', () => {
    expect(fitGrid(0, 800, 600, 12).width).toBe(0);
    expect(fitGrid(3, 0, 0, 12).width).toBe(0);
  });
});
