import { buildDays } from './admin-overview.service';

describe('buildDays', () => {
  it('bugunden geriye eskiden yeniye sirali gun listesi verir', () => {
    const days = buildDays(3, new Date('2026-03-10T12:00:00Z'));
    expect(days).toEqual(['2026-03-08', '2026-03-09', '2026-03-10']);
  });

  it('gunu Turkiye saatine gore hesaplar', () => {
    // 21:30 UTC = ertesi gun 00:30 (UTC+3)
    const days = buildDays(1, new Date('2026-03-10T21:30:00Z'));
    expect(days).toEqual(['2026-03-11']);
  });

  it('istenen sayida gun uretir', () => {
    expect(buildDays(30)).toHaveLength(30);
  });
});
