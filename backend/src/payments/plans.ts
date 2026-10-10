/**
 * Premium planlari. Fiyat yalnizca burada belirlenir; istemci sadece plan kimligini gonderir.
 * Donemlik satin alma: otomatik yenileme yoktur, sure bitince Premium kapanir.
 */
export const PREMIUM_PLANS = {
  monthly: { id: 'monthly', name: 'Aylık Premium', price: 49, months: 1 },
  yearly: { id: 'yearly', name: 'Yıllık Premium', price: 499, months: 12 },
} as const;

export type PremiumPlanId = keyof typeof PREMIUM_PLANS;
export const PREMIUM_PLAN_IDS = Object.keys(PREMIUM_PLANS) as PremiumPlanId[];

/** Istemciye gosterilen plan listesi; yillik planin aylik plana gore tasarrufu hesaplanir. */
export function publicPlans() {
  const monthly = PREMIUM_PLANS.monthly;
  return PREMIUM_PLAN_IDS.map((id) => {
    const plan = PREMIUM_PLANS[id];
    const regular = monthly.price * plan.months;
    const savings = regular - plan.price;
    return {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      currency: 'TRY',
      months: plan.months,
      /** Ayni sureyi aylik planla almanin tutari ve aradaki fark. */
      regularPrice: regular,
      savings,
      savingsPercent: regular > 0 ? Math.round((savings / regular) * 100) : 0,
    };
  });
}

/** Premium bitis tarihini uzatir: suresi devam ediyorsa sonuna, bittiyse bugunden itibaren eklenir. */
export function extendPremiumUntil(
  current: Date | null | undefined,
  months: number,
  now = new Date(),
): Date {
  const base = current && current > now ? new Date(current) : new Date(now);
  const target = new Date(base);
  target.setUTCMonth(target.getUTCMonth() + months);
  // 31 Ocak + 1 ay gibi durumlarda ay tasmasin: hedef ayin son gunune sabitle.
  if (target.getUTCDate() !== base.getUTCDate()) target.setUTCDate(0);
  return target;
}
