import { createHmac } from 'crypto';
import { signIyzicoRequest } from './iyzico.client';
import { extendPremiumUntil, publicPlans } from './plans';

describe('Premium planlari', () => {
  it('fiyatlar sunucuda; yillik planin tasarrufu hesaplanir', () => {
    const [monthly, yearly] = publicPlans();
    expect(monthly).toMatchObject({
      id: 'monthly',
      price: 49,
      months: 1,
      savings: 0,
    });
    expect(yearly).toMatchObject({
      id: 'yearly',
      price: 499,
      months: 12,
      regularPrice: 588,
      savings: 89,
      savingsPercent: 15,
    });
  });

  it('suresi devam eden Premium sonuna eklenir, biten Premium bugunden baslar', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    expect(extendPremiumUntil(null, 1, now).toISOString()).toBe(
      '2026-11-10T12:00:00.000Z',
    );
    expect(
      extendPremiumUntil(
        new Date('2026-12-01T00:00:00Z'),
        12,
        now,
      ).toISOString(),
    ).toBe('2027-12-01T00:00:00.000Z');
    expect(
      extendPremiumUntil(
        new Date('2026-01-01T00:00:00Z'),
        1,
        now,
      ).toISOString(),
    ).toBe('2026-11-10T12:00:00.000Z');
  });

  it('ay sonunda tasma olmaz (31 Ocak + 1 ay = 28 Subat)', () => {
    const now = new Date('2027-01-31T10:00:00Z');
    expect(extendPremiumUntil(null, 1, now).toISOString()).toBe(
      '2027-02-28T10:00:00.000Z',
    );
  });
});

describe('iyzico imzasi', () => {
  it('IYZWSv2 basligini belgedeki formulle uretir', () => {
    const headers = signIyzicoRequest(
      'api',
      'secret',
      '/yol',
      '{"a":1}',
      'rnd123',
    );
    expect(headers['x-iyzi-rnd']).toBe('rnd123');
    expect(headers.Authorization.startsWith('IYZWSv2 ')).toBe(true);
    const decoded = Buffer.from(
      headers.Authorization.slice(8),
      'base64',
    ).toString();
    // HMACSHA256('rnd123' + '/yol' + '{"a":1}', 'secret')
    expect(decoded).toBe(
      'apiKey:api&randomKey:rnd123&signature:' +
        createHmac('sha256', 'secret')
          .update('rnd123/yol{"a":1}')
          .digest('hex'),
    );
  });
});
