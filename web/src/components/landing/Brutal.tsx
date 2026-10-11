import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Reveal } from './Motion';
import { lpBox, lpH2 } from './styles';

/*
 * Açılış sayfasının küçük yapı taşları: logo, etiket, bölüm başlığı, kap ve
 * el çizimi ok. Yalnızca LandingPage ve components/landing kullanır.
 */

/** Masa lambası işareti (biçim uygulamadaki LampMark ile aynı); açılış sayfası paletinde. */
export function LandingMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <ellipse cx="16" cy="18" rx="12" ry="5.5" fill="var(--color-lp-mustard)" />
      <path d="M5 14.5C5 10.4 10 7.5 16 7.5s11 2.9 11 7H5Z" fill="var(--color-lp-ink)" />
      <path d="M7 14.5h18l-1.8 2.6H8.8L7 14.5Z" fill="var(--color-lp-mustard)" stroke="var(--color-lp-ink)" strokeWidth="1" strokeLinejoin="round" />
      <rect x="15" y="17" width="2" height="7.5" fill="var(--color-lp-ink)" />
      <rect x="10" y="24" width="12" height="2.4" rx="1.2" fill="var(--color-lp-ink)" />
    </svg>
  );
}

/** Logo + ad. */
export function LandingLockup({ size = 'md' }: { size?: 'md' | 'sm' }) {
  return (
    <span className="flex items-center gap-2">
      <LandingMark className={size === 'md' ? 'h-9 w-9' : 'h-7 w-7'} />
      <span className={`font-lp-sans font-black tracking-lp text-lp-ink ${size === 'md' ? 'text-[1.375rem]' : 'text-lp-h4'}`}>StudyLounge</span>
    </span>
  );
}

/** Küçük bölüm etiketi (Lexend Mega). Bilinçli olarak az yerde kullanılır. */
export function Tag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`${lpBox} inline-block bg-lp-peach px-3 py-1.5 font-lp-label text-lp-label font-black uppercase tracking-lp text-lp-ink shadow-lp-sm ${className}`}>
      {children}
    </span>
  );
}

/** İçerik kabı: 1200px içerik, yanlarda 40px (telefonda 20px). */
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-lp px-5 md:px-10 ${className}`}>{children}</div>;
}

/** Ortalanmış bölüm başlığı: büyük harf başlık + soluk açıklama. */
export function SectionHeading({ id, title, intro, tone = 'muted' }: { id?: string; title: ReactNode; intro?: ReactNode; tone?: 'muted' | 'ink' }) {
  return (
    <Reveal className="mx-auto max-w-[46rem] text-center">
      <h2 id={id} className={`${lpH2} text-balance text-lp-ink`}>
        {title}
      </h2>
      {intro ? <p className={`mx-auto mt-4 max-w-[36rem] font-lp-sans text-lp-lg font-medium tracking-lp ${tone === 'ink' ? 'text-lp-ink' : 'text-lp-muted'}`}>{intro}</p> : null}
    </Reveal>
  );
}

/** El çizimi kıvrımlı ok: adımlar arasında, görünür alana girince çizilir. `flip` iken soldan sağa iner. */
export function HandArrow({ flip = false, className = '' }: { flip?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const draw = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { pathLength: 0 },
          whileInView: { pathLength: 1 },
          viewport: { once: true, margin: '0px 0px -20% 0px' },
          transition: { duration: 0.9, delay, ease: [0.65, 0, 0.35, 1] as const },
        };
  return (
    <svg viewBox="0 0 120 110" className={`${className} ${flip ? '-scale-x-100' : ''}`} fill="none" aria-hidden="true">
      <motion.path
        d="M104 6c4 22-6 44-26 52-12 5-26 0-26-10 0-9 12-12 18-4 8 11 0 30-14 42-10 9-24 14-38 15"
        stroke="var(--color-lp-ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(0)}
      />
      <motion.path d="M30 88 16 101l19 4" stroke="var(--color-lp-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...draw(0.85)} />
    </svg>
  );
}
