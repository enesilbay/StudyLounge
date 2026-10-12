import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';

/*
 * Açılış sayfasının ortak hareketleri. Hepsi yalnızca transform ve opacity
 * kullanır; "hareketi azalt" açıkken hiçbiri oynamaz, içerik baştan görünür.
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type Direction = 'up' | 'left' | 'right' | 'none';

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  left: { x: -32, y: 0 },
  right: { x: 32, y: 0 },
  none: { x: 0, y: 0 },
};

/** Görünür alana girince bir kez belirir. */
export function Reveal({
  children,
  className,
  from = 'up',
  delay = 0,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  from?: Direction;
  delay?: number;
  as?: 'div' | 'li' | 'article';
}) {
  const reduce = useReducedMotion();
  const Tag = m[as];
  if (reduce) return <Tag className={className}>{children}</Tag>;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, ...offsets[from] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </Tag>
  );
}

/** Başlığı kelime kelime gösterir; ekran okuyucu tam cümleyi okur. */
export function WordReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <m.span
            key={`${word}-${index}`}
            className="inline-block"
            initial={{ opacity: 0, y: '0.5em' }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: delay + index * 0.07 }}
          >
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </m.span>
        ))}
      </span>
    </span>
  );
}

/** Sayfa yüklenince bir kez, sırayla belirir (giriş bölümü için). */
export function FadeIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <m.div className={className} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT, delay }}>
      {children}
    </m.div>
  );
}
