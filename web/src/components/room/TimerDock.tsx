import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/*
 * Odanın sayacı: üst çubuğun ortasında duran hap (Focusmate ve Meet'teki gibi).
 * Hapta kalan süre, aşama ve tek ana eylem vardır; ok düğmesi süre seçimi, ortak sayaç
 * ve ders seçimini içeren açılır paneli açar.
 */

/** Odakta biri varken sayaca düşen lamba ışığı. */
const LAMP_LIGHT = { backgroundImage: 'radial-gradient(120% 140% at 50% 0%, color-mix(in srgb, var(--color-mb-lamp) 28%, transparent), transparent 70%)' };

/** Kalan sürenin halkası. Odakta lamba renginde, aksi halde yeşil akar. */
export function TimerRing({ seconds, total, lit, size }: { seconds: number; total: number; lit: boolean; size: number }) {
  const stroke = size > 40 ? 4 : 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-mb-line" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        className={`transition-[stroke-dashoffset,stroke] duration-1000 ease-linear ${lit ? 'stroke-mb-lamp' : 'stroke-mb-action'}`}
      />
    </svg>
  );
}

export function TimerPill({
  time,
  seconds,
  total,
  lit,
  title,
  phase,
  action,
  children,
}: {
  time: string;
  seconds: number;
  total: number;
  lit: boolean;
  title: string;
  phase: string;
  action: ReactNode;
  /** Açılır paneldeki ayrıntılı kontroller. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full md:w-auto">
      <div
        role="timer"
        aria-label={`${title}: ${time}, ${phase}`}
        className={`flex items-center gap-2.5 rounded-[14px] border bg-mb-card py-1.5 pl-2 pr-1.5 shadow-mb-card transition-[border-color] duration-700 ${lit ? 'border-mb-lamp' : 'border-mb-line'}`}
        style={lit ? LAMP_LIGHT : undefined}
      >
        <TimerRing seconds={seconds} total={total} lit={lit} size={30} />
        <span className="font-mb-display text-[1.375rem] font-light leading-none tabular-nums tracking-[-0.03em] text-mb-ink" aria-hidden="true">
          {time}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-mb-body md:max-w-40" aria-hidden="true">
          {phase}
        </span>
        {action}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Sayaç ayarları"
          title="Süre, ortak sayaç ve ders"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-mb-body transition hover:bg-mb-surface hover:text-mb-ink"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open ? (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-[16px] border border-mb-line bg-mb-card p-4 shadow-mb-raised">
          <p className="text-[13px] font-medium text-mb-ink">{title}</p>
          {children}
        </div>
      ) : null}
    </div>
  );
}
