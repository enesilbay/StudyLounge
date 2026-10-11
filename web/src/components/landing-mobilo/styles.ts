/*
 * Mobilo denemesinin sınıf kalıpları. Renkler, gölgeler ve fontlar index.css'teki
 * mb-* token'larından gelir.
 */

export const mbFocus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mb-action';

/** Ana eylem: orman yeşili, içe kabartmalı gölge, 14px köşe. */
export const mbButton = `${mbFocus} inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-mb-action px-6 font-mb-body text-base font-medium text-mb-on-action shadow-mb-press transition duration-200 hover:-translate-y-0.5 hover:bg-mb-action-2 active:translate-y-0`;

/** İkincil eylem: mürekkep zemin, beyaz yazı. */
export const mbButtonDark = `${mbFocus} inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-mb-ink px-6 font-mb-body text-base font-medium text-mb-bg shadow-mb-raised transition duration-200 hover:-translate-y-0.5 active:translate-y-0`;

/** Büyük, ince başlık: Geist 300, sıkı harf aralığı. */
export const mbDisplay = 'font-mb-display font-light tracking-[-0.045em] text-mb-ink';
