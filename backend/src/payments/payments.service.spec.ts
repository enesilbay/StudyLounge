import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { IyzicoClient } from './iyzico.client';
import { Payment } from './payment.entity';
import { PaymentsService } from './payments.service';

// @nestjs/schedule ESM olarak yayimlaniyor; Jest dogrudan okuyamadigi icin dekorator taklit edilir.
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_HOUR: '0 * * * *' },
}));

describe('PaymentsService', () => {
  const env: Record<string, string> = {
    RENDER_EXTERNAL_URL: 'https://api.ornek.app',
    CORS_ORIGIN: 'https://site.ornek.app',
  };
  let payments: {
    findOne: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    find: jest.Mock;
  };
  let users: {
    findOne: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let manager: { update: jest.Mock; getRepository: jest.Mock };
  let iyzico: { post: jest.Mock; isConfigured: boolean };
  let service: PaymentsService;

  const pending = (): Payment =>
    ({
      id: 7,
      planId: 'monthly',
      amount: '49.00',
      currency: 'TRY',
      status: 'pending',
      conversationId: 'conv-1',
      token: 'tok-1',
      user: { id: 3 },
    }) as unknown as Payment;

  const okDetail = {
    status: 'success',
    paymentStatus: 'SUCCESS',
    conversationId: 'conv-1',
    basketId: '7',
    paidPrice: 49,
    currency: 'TRY',
    fraudStatus: 1,
    paymentId: 'pay-9',
  };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    payments = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn((value: object) => Promise.resolve({ id: 7, ...value })),
      create: jest.fn((value: object) => value),
      find: jest.fn(),
    };
    const lockedUser = { id: 3, premiumUntil: null };
    const qb = {
      addSelect: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(lockedUser),
    };
    manager = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      getRepository: jest.fn(() => ({ createQueryBuilder: () => qb })),
    };
    users = {
      findOne: jest.fn().mockResolvedValue({
        id: 3,
        fullName: 'Ada Lovelace',
        username: 'ada',
        email: 'ada@ornek.app',
      }),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => qb),
    };
    iyzico = { post: jest.fn(), isConfigured: true };
    service = new PaymentsService(
      payments as unknown as Repository<Payment>,
      users as unknown as Repository<User>,
      {
        transaction: (cb: (m: typeof manager) => unknown) => cb(manager),
      } as unknown as DataSource,
      iyzico as unknown as IyzicoClient,
      { get: (key: string) => env[key] } as unknown as ConfigService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('odeme formunu sunucudaki fiyatla baslatir', async () => {
    iyzico.post.mockResolvedValue({
      status: 'success',
      token: 'tok-1',
      paymentPageUrl: 'https://sandbox-cpp.iyzipay.com?token=tok-1',
    });

    const result = await service.createCheckout(3, 'yearly', '1.2.3.4');

    expect(result).toEqual({
      paymentPageUrl: 'https://sandbox-cpp.iyzipay.com?token=tok-1',
    });
    const [path, body] = iyzico.post.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(path).toBe('/payment/iyzipos/checkoutform/initialize/auth/ecom');
    expect(body).toMatchObject({
      price: '499.00',
      paidPrice: '499.00',
      basketId: '7',
      callbackUrl: 'https://api.ornek.app/payments/iyzico/callback',
      buyer: expect.objectContaining({
        name: 'Ada',
        surname: 'Lovelace',
        ip: '1.2.3.4',
      }) as unknown,
    });
    expect(payments.update).toHaveBeenCalledWith(7, { token: 'tok-1' });
  });

  it('dogrulanan odemede Premium bir ay uzatilir', async () => {
    payments.findOne.mockResolvedValue(pending());
    iyzico.post.mockResolvedValue(okDetail);

    await expect(service.completeCheckout('tok-1')).resolves.toBe('success');

    expect(manager.update).toHaveBeenCalledWith(
      Payment,
      { id: 7, status: 'pending' },
      expect.objectContaining({
        status: 'success',
        providerPaymentId: 'pay-9',
      }),
    );
    const userUpdate = (manager.update.mock.calls as unknown[][]).find(
      (call) => call[0] === User,
    ) as
      | [unknown, number, { isPremium: boolean; premiumUntil: Date }]
      | undefined;
    expect(userUpdate?.[2].isPremium).toBe(true);
    const days =
      (userUpdate![2].premiumUntil.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(27);
    expect(days).toBeLessThan(32);
  });

  it('tutar tutmazsa Premium verilmez', async () => {
    payments.findOne.mockResolvedValue(pending());
    iyzico.post.mockResolvedValue({ ...okDetail, paidPrice: 1 });

    await expect(service.completeCheckout('tok-1')).resolves.toBe('failure');
    expect(manager.update).not.toHaveBeenCalled();
    expect(payments.update).toHaveBeenCalledWith(
      { id: 7, status: 'pending' },
      expect.objectContaining({
        status: 'failure',
        failureReason: 'Tutar tutmuyor',
      }),
    );
  });

  it('baska bir sepetin sonucu kabul edilmez', async () => {
    payments.findOne.mockResolvedValue(pending());
    iyzico.post.mockResolvedValue({ ...okDetail, basketId: '8' });

    await expect(service.completeCheckout('tok-1')).resolves.toBe('failure');
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('islenmis odeme ikinci kez islenmez', async () => {
    payments.findOne.mockResolvedValue({ ...pending(), status: 'success' });

    await expect(service.completeCheckout('tok-1')).resolves.toBe('success');
    expect(iyzico.post).not.toHaveBeenCalled();
  });

  it('ayni anda gelen ikinci istek Premium suresini iki kez uzatmaz', async () => {
    payments.findOne.mockResolvedValue(pending());
    iyzico.post.mockResolvedValue(okDetail);
    manager.update.mockResolvedValueOnce({ affected: 0 });

    await expect(service.completeCheckout('tok-1')).resolves.toBe('success');
    expect(manager.update).toHaveBeenCalledTimes(1);
  });

  it('bilinmeyen token reddedilir', async () => {
    payments.findOne.mockResolvedValue(null);
    await expect(service.completeCheckout('yok')).resolves.toBe('failure');
    await expect(service.completeCheckout(undefined)).resolves.toBe('failure');
  });

  it('odemeden sonra kullanici web sitesine doner', () => {
    expect(service.webAppUrl()).toBe('https://site.ornek.app');
  });
});
