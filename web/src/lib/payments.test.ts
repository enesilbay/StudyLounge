import { describe, expect, it } from 'vitest';
import { formatTry, monthlyEquivalent, parsePaymentOutcome } from './payments';

describe('payments', () => {
  it('reads only known payment outcomes from the URL', () => {
    expect(parsePaymentOutcome('basarili')).toBe('basarili');
    expect(parsePaymentOutcome('beklemede')).toBe('beklemede');
    expect(parsePaymentOutcome('hack')).toBeNull();
    expect(parsePaymentOutcome(null)).toBeNull();
  });

  it('shows the yearly plan per month and formats lira', () => {
    expect(monthlyEquivalent({ price: 499, months: 12 })).toBe(41.58);
    expect(formatTry(49).replace(/\s/g, ' ')).toBe('₺49');
    expect(formatTry('499.00').replace(/\s/g, ' ')).toBe('₺499');
  });
});
