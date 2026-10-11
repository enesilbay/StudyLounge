/*
 * Açılış sayfasının neobrütalist sınıf kalıpları. Renkler, gölgeler ve yazı
 * ölçeği index.css'teki "Açılış sayfası" @theme bloğundan (lp-*) gelir;
 * burada yalnızca tekrar eden birleşimler toplanır.
 */

/** Klavye odak halkası: siyah kenarlıklı öğelerde de görünsün diye dışarı kaydırılmış kalın çizgi. */
export const lpFocus =
  'focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-lp-ink focus-visible:outline-dashed';

/** Sayfa zemini: çok hafif kâğıt ızgarası, yalnızca CSS. */
export const lpPaper =
  'bg-lp-paper bg-[linear-gradient(var(--color-lp-grid)_1px,transparent_1px),linear-gradient(90deg,var(--color-lp-grid)_1px,transparent_1px)] bg-[size:24px_24px]';

/** 2px siyah kenarlık, sivri köşe. */
export const lpBox = 'border-2 border-lp-ink rounded-none';

/** Başlık kalıbı: Epilogue 900, büyük harf, sıkı harf aralığı. */
export const lpHeading = 'font-lp-sans font-black uppercase tracking-lp';

export const lpH1 = `${lpHeading} text-lp-h1-sm md:text-lp-h1`;
export const lpH2 = `${lpHeading} text-lp-h2-sm md:text-lp-h2`;
export const lpH3 = `${lpHeading} text-lp-h3-sm md:text-lp-h3`;
export const lpH4 = `${lpHeading} text-lp-h4`;

/** Hardal eylem düğmesi: üzerine gelince gölge 4px → 2px, düğme basılmış gibi kayar. */
export const lpButton = `${lpBox} ${lpFocus} inline-flex min-h-12 items-center justify-center gap-2 bg-lp-mustard px-6 font-lp-sans text-lp-base font-bold tracking-lp text-lp-ink shadow-lp-sm transition-[box-shadow,translate] duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-lp-xs active:translate-x-1 active:translate-y-1 active:shadow-none`;

/** Menüdeki daha küçük düğme. */
export const lpButtonSm = `${lpBox} ${lpFocus} items-center justify-center bg-lp-mustard px-4 font-lp-sans text-lp-sm font-bold tracking-lp text-lp-ink shadow-lp-sm transition-[box-shadow,translate] duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-lp-xs`;

/** Metin bağlantısı (ikincil eylem). */
export const lpTextLink = `${lpFocus} inline-flex min-h-11 items-center gap-2 font-lp-sans text-lp-base font-bold tracking-lp text-lp-ink underline-offset-4 hover:underline`;
