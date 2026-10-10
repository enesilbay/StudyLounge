/** Premium planları ve ödeme durumu (fiyatlar sunucudan gelir). */
export type PremiumPlanId = 'monthly' | 'yearly';

export interface PremiumPlan {
  id: PremiumPlanId;
  name: string;
  price: number;
  currency: 'TRY';
  months: number;
  regularPrice: number;
  savings: number;
  savingsPercent: number;
}

export interface PaymentRecord {
  id: number;
  planId: PremiumPlanId;
  amount: string;
  currency: string;
  status: 'success' | 'failure';
  premiumUntil: string | null;
  createdAt: string;
}

export interface PremiumStatus {
  isPremium: boolean;
  premiumUntil: string | null;
  payments: PaymentRecord[];
}

/** Ödeme sonrası /app/premium?odeme=... ile dönülen sonuç. */
export type PaymentOutcome = 'basarili' | 'basarisiz' | 'beklemede';

export function parsePaymentOutcome(value: string | null): PaymentOutcome | null {
  return value === 'basarili' || value === 'basarisiz' || value === 'beklemede' ? value : null;
}

const tryFormatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2, minimumFractionDigits: 0 });

export function formatTry(amount: number | string): string {
  return tryFormatter.format(Number(amount));
}

/** Planın aylığa düşen tutarı (ör. yıllık ₺499 → ayda ₺41,58). */
export function monthlyEquivalent(plan: Pick<PremiumPlan, 'price' | 'months'>): number {
  return Math.round((plan.price / plan.months) * 100) / 100;
}
