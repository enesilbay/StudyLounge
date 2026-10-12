import { useEffect, type ReactNode } from 'react';
import { animate, m, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

/*
 * Yeni kimliğe taşınan uygulama sayfalarının ortak parçaları (docs/brand/marka-rehberi.md).
 * Renkler mb-* token'larından gelir; .sl-yeni kapsamında açık ve koyu temada çalışır.
 * Animasyonlar AppLayout'taki LazyMotion/MotionConfig ile yüklenir; "hareketi azalt" açıkken durur.
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const solidButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-mb-solid px-4 text-[15px] font-medium text-mb-on-solid shadow-mb-raised transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50';
export const actionButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-mb-action px-4 text-[15px] font-medium text-mb-on-action shadow-mb-press transition hover:bg-mb-action-2 disabled:opacity-50';
export const outlineButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border border-mb-line bg-mb-card px-4 text-[15px] font-medium text-mb-ink transition hover:bg-mb-surface disabled:opacity-50';
export const ghostButton =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-medium text-mb-body transition hover:bg-mb-surface hover:text-mb-ink disabled:opacity-50';
export const inputClass =
  'min-h-11 w-full rounded-[12px] border border-mb-line bg-mb-surface px-4 text-[15px] text-mb-ink outline-none transition placeholder:text-mb-body/70 focus:border-mb-action focus:bg-mb-card';

/** Sayfa başlığı: ince büyük başlık, isteğe bağlı kısa açıklama ve sağda eylemler. */
export function AppPage({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <Rise as="header" className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mb-display text-[2rem] font-light leading-tight tracking-[-0.04em] text-mb-ink md:text-[2.25rem]">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-[15px] text-mb-body">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </Rise>
      <div className="mt-6">{children}</div>
    </div>
  );
}

/** Beyaz (koyu temada kömür) kart. */
export function Card({ children, className = '', as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'li' }) {
  return <Tag className={`rounded-[20px] border border-mb-line/70 bg-mb-card shadow-mb-card ${className}`}>{children}</Tag>;
}

/** Kart içi başlık. */
export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-mb-display text-lg font-medium tracking-[-0.02em] text-mb-ink">{children}</h2>
      {aside ? <div className="text-sm text-mb-body">{aside}</div> : null}
    </div>
  );
}

/** Görünür olunca aşağıdan yumuşakça belirir. */
export function Rise({
  children,
  className,
  delay = 0,
  as = 'div',
  y = 14,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'li' | 'section' | 'header' | 'article';
  y?: number;
}) {
  const Tag = m[as];
  return (
    <Tag className={className} initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay, ease: EASE_OUT }}>
      {children}
    </Tag>
  );
}

/** Eşit genişlikli sekmeler; seçili olanın altında kayan bir gösterge vardır. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string; badge?: number }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <div role="tablist" aria-label={label} className="relative grid rounded-[14px] bg-mb-surface p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <m.span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-[11px] bg-mb-card shadow-mb-card"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})` }}
        initial={false}
        animate={{ x: `${index * 100}%` }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
          className={`relative flex min-h-10 items-center justify-center gap-2 rounded-[11px] px-3 text-sm font-medium transition-colors ${option.value === value ? 'text-mb-ink' : 'text-mb-body hover:text-mb-ink'}`}
        >
          {option.label}
          {option.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-mb-action px-1 text-[11px] font-semibold text-mb-on-action">{option.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Açılışta sıfırdan sayarak yükselen sayı. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('tr-TR') }: { value: number; format?: (value: number) => string }) {
  const count = useMotionValue(0);
  const shown = useTransform(count, format);
  useEffect(() => {
    const controls = animate(count, value, { duration: 1.1, ease: EASE_OUT });
    return () => controls.stop();
  }, [count, value]);
  return <m.span>{shown}</m.span>;
}

/** Boş durum: süzülen 3B nesne, kısa başlık ve isteğe bağlı eylem. */
export function EmptyState({ image, title, text, action, className = '' }: { image: string; title: string; text?: string; action?: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={`flex flex-col items-center px-6 py-10 text-center ${className}`}>
      <m.img
        src={`/landing/3b/${image}.webp`}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-28 w-auto select-none"
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <p className="mt-4 font-mb-display text-lg font-medium tracking-[-0.02em] text-mb-ink">{title}</p>
      {text ? <p className="mt-1 max-w-xs text-sm text-mb-body">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
