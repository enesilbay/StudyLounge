import { Armchair } from 'lucide-react';

/*
 * Odak odasının sahnesi ("okuma salonu"): ortadaki ortak masa ve ortak sayaç halkası,
 * çevresine dizilen masalar. docs/brand/yeniden-tasarim-plani.md, adım 2.
 */


/** Kalan sürenin halkası. Odakta lamba renginde, aksi halde yeşil akar. */
export function TimerRing({ seconds, total, lit, size, children }: { seconds: number; total: number; lit: boolean; size: number; children?: React.ReactNode }) {
  const stroke = size > 80 ? 6 : 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 1;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
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
      {children ? <div className="relative text-center">{children}</div> : null}
    </div>
  );
}

/** Boş masa: oturulabilecek yer olduğunu gösterir; ekran okuyucuya okunmaz. */
export function EmptySeat({ videoRoom, className = '' }: { videoRoom: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={`grid place-items-center rounded-[16px] border border-dashed border-mb-line text-mb-body/50 ${videoRoom ? 'aspect-[4/3]' : 'min-h-[10.5rem]'} ${className}`}>
      <span className="flex flex-col items-center gap-2 text-[13px]">
        <Armchair className="h-7 w-7" strokeWidth={1.5} />
        Boş masa
      </span>
    </div>
  );
}
