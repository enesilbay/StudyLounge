import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, m, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { mbFocus } from './styles';

/*
 * Mobilo denemesinin hareketleri. Hepsi transform/opacity ile çalışır;
 * "hareketi azalt" açıkken döngüler durur, içerik baştan yerinde görünür.
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Sayfanın en üstünde kaydırma ilerlemesi. */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  if (reduce) return null;
  return <m.div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-mb-action" style={{ scaleX }} />;
}

/** Fareyi izleyen yumuşak ışık (yalnızca fareli cihazlarda; dokunmatikte sabit kalır). */
export function Spotlight({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(50);
  const y = useMotionValue(35);
  const sx = useSpring(x, { stiffness: 60, damping: 20 });
  const sy = useSpring(y, { stiffness: 60, damping: 20 });
  const background = useTransform(
    [sx, sy],
    ([px, py]: number[]) => `radial-gradient(600px circle at ${px}% ${py}%, color-mix(in srgb, var(--color-mb-action-2) 18%, transparent), transparent 70%)`,
  );
  return (
    <div
      className={`relative ${className}`}
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(((event.clientX - rect.left) / rect.width) * 100);
        y.set(((event.clientY - rect.top) / rect.height) * 100);
      }}
    >
      <m.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background }} />
      {children}
    </div>
  );
}

/** Sonsuz kayan şerit; içerik iki kez çizilir, ekran okuyucu yalnızca birini okur. */
export function Marquee({ items, duration = 38 }: { items: string[]; duration?: number }) {
  const reduce = useReducedMotion();
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-3 pr-3">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 whitespace-nowrap rounded-full border border-mb-line bg-mb-bg px-5 py-2.5 font-mb-body text-[0.9375rem] text-mb-ink shadow-mb-card">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-mb-action" />
          {item}
        </li>
      ))}
    </ul>
  );
  if (reduce) return <div className="flex flex-wrap justify-center gap-3">{row(false)}</div>;
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <m.div className="flex w-max" animate={{ x: ['0%', '-50%'] }} transition={{ duration, ease: 'linear', repeat: Infinity }}>
        {row(false)}
        {row(true)}
      </m.div>
    </div>
  );
}

/** Yerinde, yavaşça süzülen öğe. */
export function Float({ children, className, amplitude = 10, duration = 6, delay = 0 }: { children: ReactNode; className?: string; amplitude?: number; duration?: number; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <m.div className={className} animate={{ y: [0, -amplitude, 0] }} transition={{ duration, delay, ease: 'easeInOut', repeat: Infinity }}>
      {children}
    </m.div>
  );
}

/** Kaydırırken öğeyi kendi hızında hareket ettirir (paralaks). */
export function Parallax({ children, className, distance = 40 }: { children: ReactNode; className?: string; distance?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  return (
    <m.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </m.div>
  );
}

/** Kaydırdıkça yukarıdan aşağı dolan dikey çizgi (adımlar arası). */
export function ProgressLine({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.7', 'end 0.6'] });
  return (
    <div ref={ref} aria-hidden="true" className={`absolute w-px bg-mb-line ${className}`}>
      <m.div className="h-full w-full origin-top bg-mb-action" style={reduce ? undefined : { scaleY: scrollYProgress }} />
    </div>
  );
}

/** Dev yazı: görünüme girince harf harf yükselir. */
export function RiseLetters({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <m.span className={className} initial="hidden" whileInView="shown" viewport={{ once: true }}>
      {[...text].map((letter, index) => (
        <m.span
          key={index}
          className="inline-block"
          variants={{ hidden: { y: '60%', opacity: 0 }, shown: { y: '0%', opacity: 1 } }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: index * 0.045 }}
        >
          {letter}
        </m.span>
      ))}
    </m.span>
  );
}

/** Değer değişince eskisi yukarı kayıp çıkar, yenisi alttan gelir (fiyat gibi). */
export function SwapText({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{value}</span>;
  return (
    <span className={`relative inline-flex overflow-hidden ${className ?? ''}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span key={value} className="inline-block" initial={{ y: '100%', opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={{ y: '-100%', opacity: 0 }} transition={{ duration: 0.45, ease: EASE_OUT }}>
          {value}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

/** Yumuşak açılıp kapanan soru-cevap. */
export function Accordion({ question, answer }: { question: string; answer: string }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[16px] border border-mb-line bg-mb-bg shadow-mb-card">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={`${mbFocus} flex min-h-16 w-full items-center justify-between gap-4 rounded-[16px] px-6 py-4 text-left`}
        >
          <span className="font-mb-display text-lg tracking-[-0.02em]">{question}</span>
          <ChevronDown className={`h-5 w-5 shrink-0 text-mb-body transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open ? (
          <m.div
            key="cevap"
            className="overflow-hidden"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            <p className="px-6 pb-5 leading-[1.8] text-mb-body">{answer}</p>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Üzerine gelince hafifçe kalkan kart; içindeki `group-hover` sınıfları (görsel yakınlaşması) da bununla çalışır. */
export function Lift({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <m.div className={`group h-full ${className}`} whileHover={reduce ? undefined : { y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
      {children}
    </m.div>
  );
}
