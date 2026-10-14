import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, m, useMotionValue, useTransform } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, MoreHorizontal, RotateCcw } from 'lucide-react';
import { Avatar } from '../ui';
import { tileColorFor } from '../../lib/room/tileColors';
import { useClickOutside } from '../../lib/useClickOutside';

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
  return <Tag className={`rounded-[16px] border border-mb-line/70 bg-mb-card shadow-mb-card ${className}`}>{children}</Tag>;
}

/**
 * Sola yaslı bölüm başlığı: kart kullanmadan bölümleri ayırır (üstte ince ayraç).
 * Bilgi bölümlerinde kart yerine bunu tercih et (docs/brand/yeniden-tasarim-plani.md).
 */
export function SectionHeader({ title, description, aside, id }: { title: string; description?: string; aside?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-t border-mb-line pt-5">
      <div className="min-w-0">
        <h2 id={id} className="font-mb-display text-xl font-normal tracking-[-0.03em] text-mb-ink">{title}</h2>
        {description ? <p className="mt-1 max-w-xl text-sm text-mb-body">{description}</p> : null}
      </div>
      {aside ? <div className="text-sm text-mb-body">{aside}</div> : null}
    </div>
  );
}

/** Etiket solda, değer sağda satır; listeler `divide-y divide-mb-line` içinde kullanılır. */
export function DataRow({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-mb-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-[13px] text-mb-body">{hint}</p> : null}
      </div>
      <div className="min-w-0 shrink-0 sm:max-w-[60%]">{children}</div>
    </div>
  );
}

/** İnce ilerleme cetveli; açılışta dolarak gelir. `value` 0–1 arası. */
export function Ruler({ value, label, delay = 0.2 }: { value: number; label: string; delay?: number }) {
  const ratio = Math.max(0, Math.min(1, value));
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} className="h-1.5 overflow-hidden rounded-full bg-mb-surface">
      <m.div className="h-full rounded-full bg-mb-meter" initial={{ width: 0 }} animate={{ width: `${ratio * 100}%` }} transition={{ duration: 0.9, delay, ease: EASE_OUT }} />
    </div>
  );
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


/** Boş durum: ikon (yuvarlak yüzeyde), kısa başlık ve isteğe bağlı eylem. */
export function EmptyState({ icon: Icon, title, text, action, className = '' }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center px-6 py-10 text-center ${className}`}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-mb-surface text-mb-body">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-4 font-mb-display text-lg font-medium tracking-[-0.02em] text-mb-ink">{title}</p>
      {text ? <p className="mt-1 max-w-xs text-sm text-mb-body">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Hata durumu: ikon, başlık, açıklama ve "Yeniden dene" düğmesi (`role="alert"` değil `status`: sayfada tek uyarı kuralı). */
export function ErrorState({ title, text, onRetry, className = '' }: { title: string; text?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="status" className={`flex flex-col items-center px-6 py-10 text-center ${className}`}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-mb-live-soft text-mb-live-ink">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-4 font-mb-display text-lg font-medium tracking-[-0.02em] text-mb-ink">{title}</p>
      {text ? <p className="mt-1 max-w-xs text-sm text-mb-body">{text}</p> : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className={`${outlineButton} mt-5`}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Yeniden dene
        </button>
      ) : null}
    </div>
  );
}

/** Yüklenen içeriğin yerinde duran soluk blok; boyutu `className` ile verilir. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-[8px] bg-mb-surface ring-1 ring-mb-line/50 motion-safe:animate-pulse ${className}`} />;
}

/** Liste yüklenirken avatar + iki çizgilik satırlar; ekran okuyucuya tek "Yükleniyor" duyurur. */
export function SkeletonRows({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={`space-y-4 ${className}`}>
      <span className="sr-only">Yükleniyor</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3" aria-hidden="true">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Kırmızı "CANLI" rozeti (ekran paylaşımı gibi canlı yayınlar); konumu `className` ile verilir. */
export function LiveBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-[6px] bg-mb-live-solid px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-mb-on-live ${className}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-mb-on-live motion-safe:animate-pulse" />
      CANLI
    </span>
  );
}

/** Kırmızı sayı rozeti (okunmamış mesaj vb.); 0 ise çizilmez, `max`'ı aşınca "9+" gibi görünür. */
export function CountBadge({ count, max = 9, className = '' }: { count: number; max?: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={`grid h-5 min-w-5 place-items-center rounded-full bg-mb-live-solid px-1 text-[11px] font-semibold leading-none tabular-nums text-mb-on-live ${className}`}>
      {count > max ? `${max}+` : count}
    </span>
  );
}

const STACK_MORE = {
  xs: 'h-9 w-9 text-xs',
  sm: 'h-11 w-11 text-sm',
  md: 'h-[52px] w-[52px] text-sm',
} as const;

/** Üst üste binen avatarlar; her biri kişiye özgü renkli bir halkayla ayrışır, kalanlar "+N" olur. */
export function AvatarStack({
  people,
  max = 4,
  size = 'xs',
}: {
  people: Array<{ id: number; name: string; avatarUrl?: string | null }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((person) => (
        <span key={person.id} title={person.name} className={`-ml-2 rounded-full p-0.5 ring-2 ring-mb-card first:ml-0 ${tileColorFor(person.id)}`}>
          <Avatar name={person.name} image={person.avatarUrl} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span
          role="img"
          aria-label={`ve ${rest} kişi daha`}
          className={`-ml-2 grid place-items-center rounded-full bg-mb-surface font-medium tabular-nums text-mb-body ring-2 ring-mb-card ${STACK_MORE[size]}`}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

export interface OverflowMenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  /** Açık/seçili durum: sağda yeşil nokta. */
  active?: boolean;
  /** Yıkıcı eylem: kırmızı metin. */
  danger?: boolean;
}

/** Açılır "Diğer" menüsü: simge düğmesi + menü (kontrol çubuğunda yukarı, sayfalarda aşağı açılabilir). */
export function OverflowMenu({
  items,
  label = 'Diğer kontroller',
  icon: Icon = MoreHorizontal,
  align = 'center',
  placement = 'up',
  className = '',
}: {
  items: OverflowMenuItem[];
  label?: string;
  icon?: LucideIcon;
  align?: 'center' | 'end';
  placement?: 'up' | 'down';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const side = placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2';
  const horizontal = align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        title={label}
        className={`grid h-10 w-10 place-items-center rounded-[12px] transition ${open ? 'bg-mb-surface text-mb-ink' : 'text-mb-ink hover:bg-mb-surface'}`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </button>
      {open ? (
        <div role="menu" aria-label={label} className={`absolute z-50 w-64 rounded-[16px] border border-mb-line bg-mb-card p-1.5 shadow-mb-raised ${side} ${horizontal}`}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-medium transition hover:bg-mb-surface disabled:opacity-45 ${item.danger ? 'text-mb-live-ink' : 'text-mb-ink'}`}
            >
              <item.icon className={`h-[18px] w-[18px] shrink-0 ${item.danger ? 'text-mb-live-ink' : 'text-mb-body'}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.active ? <span aria-hidden="true" className="h-2 w-2 rounded-full bg-mb-action" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
