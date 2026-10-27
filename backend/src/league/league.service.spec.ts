import { DataSource, Repository } from 'typeorm';
import { DailyAnalytics } from '../users/daily-analytics.entity';
import { UsersService } from '../users/users.service';
import { LeagueService, WEEKLY_REWARDS } from './league.service';
import { WeeklyResult } from './weekly-result.entity';

// @nestjs/schedule ESM olarak yayimlaniyor; Jest dogrudan okuyamadigi icin dekorator taklit edilir.
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
}));

describe('LeagueService', () => {
  let results: { exists: jest.Mock };
  let usersService: { awardBadge: jest.Mock };
  let manager: {
    createQueryBuilder: jest.Mock;
    increment: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock; query: jest.Mock };
  let service: LeagueService;
  let insertedRaw: unknown[][];

  const podium = [1, 2, 3].map((id) => ({
    rank: id,
    minutes: 100 - id,
    user: { id },
  }));

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    results = { exists: jest.fn().mockResolvedValue(false) };
    usersService = { awardBadge: jest.fn().mockResolvedValue(true) };
    insertedRaw = [[{ id: 1 }], [{ id: 2 }], [{ id: 3 }]];
    const qb = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn(() => Promise.resolve({ raw: insertedRaw.shift() ?? [] })),
    };
    manager = {
      createQueryBuilder: jest.fn(() => qb),
      increment: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => Promise<void>) => cb(manager)),
      query: jest.fn(),
    };
    service = new LeagueService(
      {} as Repository<DailyAnalytics>,
      results as unknown as Repository<WeeklyResult>,
      usersService as unknown as UsersService,
      dataSource as unknown as DataSource,
    );
    jest
      .spyOn(service as unknown as { weekTotals: () => Promise<unknown> }, 'weekTotals')
      .mockResolvedValue(podium);
  });

  afterEach(() => jest.restoreAllMocks());

  it('biten haftanin ilk ucunu tek transaction icinde kaydeder ve oduller', async () => {
    const saved = await service.closeWeek('2026-10-12');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(saved).toHaveLength(3);
    expect(manager.increment).toHaveBeenCalledTimes(3);
    expect(manager.increment).toHaveBeenNthCalledWith(1, expect.anything(), { id: 1 }, 'coins', WEEKLY_REWARDS[0]);
    expect(usersService.awardBadge).toHaveBeenCalledWith(1, 'Haftanın Şampiyonu');
  });

  it('kapatilmis haftayi ikinci kez odullendirmez (acilis telafisi guvenli)', async () => {
    results.exists.mockResolvedValue(true);

    await expect(service.closeWeek('2026-10-12')).resolves.toEqual([]);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('cakisan satir icin (baska bir kapatici yazdi) puan verilmez', async () => {
    insertedRaw = [[{ id: 1 }], [], []];

    const saved = await service.closeWeek('2026-10-12');

    expect(saved).toHaveLength(1);
    expect(manager.increment).toHaveBeenCalledTimes(1);
  });

  it('transaction hata verirse rozet verilmez ve hata yayilir', async () => {
    manager.increment.mockRejectedValueOnce(new Error('db'));

    await expect(service.closeWeek('2026-10-12')).rejects.toThrow('db');
    expect(usersService.awardBadge).not.toHaveBeenCalled();
  });

  it('acilista biten haftayi kapatmayi dener, hata acilisi dusurmez', async () => {
    const spy = jest.spyOn(service, 'closeLastWeek').mockRejectedValue(new Error('db'));
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
  });

  it('ilk 20 disindaki kullanicinin sirasi COUNT(*) ile hesaplanir', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ minutes: '40' }])
      .mockResolvedValueOnce([{ count: '24' }]);

    const entry = await (
      service as unknown as { myGlobalRank: (w: string, u: number) => Promise<{ rank: number; minutes: number } | null> }
    ).myGlobalRank('2026-10-26', 9);

    expect(entry).toMatchObject({ rank: 25, minutes: 40 });
    expect(dataSource.query).toHaveBeenCalledTimes(2);
    expect(String((dataSource.query.mock.calls[1] as unknown[])[0])).toContain('COUNT(*)');
  });

  it('bu hafta hic calismamis kullanicinin sirasi yoktur', async () => {
    dataSource.query.mockResolvedValueOnce([{ minutes: null }]);

    const entry = await (
      service as unknown as { myGlobalRank: (w: string, u: number) => Promise<unknown> }
    ).myGlobalRank('2026-10-26', 9);

    expect(entry).toBeNull();
    expect(dataSource.query).toHaveBeenCalledTimes(1);
  });
});
