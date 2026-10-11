import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { lpBox } from './styles';

type Desk = { name: string; subject: string; focusing: boolean } | null;

/** Örnek oda. Gerçek kullanıcı değil; sayfada "Örnek oda" olarak etiketlenir. */
const desks: Array<{ x: number; y: number; desk: Desk }> = [
  { x: 3, y: 7, desk: { name: 'Zeynep', subject: 'Biyokimya', focusing: true } },
  { x: 27, y: 7, desk: { name: 'Mert', subject: 'Diferansiyel denklemler', focusing: true } },
  { x: 51, y: 7, desk: { name: 'Elif', subject: 'Ceza hukuku', focusing: false } },
  { x: 3, y: 59, desk: { name: 'Can', subject: 'YDS kelime', focusing: true } },
  { x: 27, y: 59, desk: { name: 'Deniz', subject: 'Algoritma analizi', focusing: true } },
  { x: 51, y: 59, desk: null },
];

const LAMP_STEP_MS = 320;
const START_SECONDS = 18 * 60 + 42;
const FOCUSING = desks.filter(({ desk }) => desk?.focusing).length;

/**
 * Girişteki örnek çalışma odası, yukarıdan bakılan bir kat planı olarak.
 * Ürünün üç fikrini tek bakışta gösterir: odaklananın lambası yanar, ortak
 * sayaç herkes için aynıdır, duvardaki tahtada birlikte not alınır.
 */
export function RoomPlan() {
  const reduceMotion = useReducedMotion();
  const [litCount, setLitCount] = useState(0);
  const [seconds, setSeconds] = useState(START_SECONDS);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setLitCount((count) => {
        if (count >= desks.length) window.clearInterval(timer);
        return count + 1;
      });
    }, LAMP_STEP_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => setSeconds((value) => (value <= 0 ? 25 * 60 : value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const visibleLit = reduceMotion ? desks.length : litCount;
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <figure className="m-0">
      <div className={`${lpBox} overflow-hidden bg-lp-card shadow-lp-lg md:shadow-lp-xl`}>
        {/* Oda başlığı: uygulamadaki oda üst çubuğunun sadeleştirilmiş hâli */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-lp-ink px-3 py-2.5 md:px-5 md:py-3">
          <span className="flex min-w-0 items-center gap-2 font-lp-sans text-lp-sm font-bold tracking-lp text-lp-ink md:text-lp-base">
            <span className="truncate">Sessiz kütüphane</span>
            <span className="shrink-0 border-2 border-lp-ink bg-lp-mint px-1.5 py-0.5 text-[0.6875rem] font-bold leading-none">Örnek oda</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 font-lp-sans text-lp-sm font-medium tracking-lp text-lp-ink">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-lp-ink bg-lp-mustard" />
            {FOCUSING} kişi odakta
          </span>
        </div>

        <div
          role="img"
          aria-label="Örnek bir çalışma odasının kat planı. Altı masadan dördünde lamba yanıyor, yani o kişiler odaklanıyor; bir kişi molada, bir masa boş. Ortada odadaki herkes için aynı işleyen ortak sayaç, duvarda birlikte not alınan bir PDF tahtası var."
          className="@container relative aspect-[4/3] w-full overflow-hidden bg-lp-paper bg-[linear-gradient(var(--color-lp-grid)_1px,transparent_1px),linear-gradient(90deg,var(--color-lp-grid)_1px,transparent_1px)] bg-[size:6.25%_8.333%] md:aspect-[16/9]"
        >
          {desks.map(({ x, y, desk }, index) => (
            <DeskSpot key={index} x={x} y={y} desk={desk} lit={Boolean(desk?.focusing) && index < visibleLit} />
          ))}

          {/* Ortak sayaç: iki masa sırası arasındaki koridorda */}
          <div className="absolute left-[3%] top-[44.5%] flex w-[70%] items-center gap-[3cqw] border-2 border-lp-ink bg-lp-mint px-[2.4cqw] py-[1.1cqw] shadow-lp-xs">
            <span className="font-lp-sans text-[max(18px,5.4cqw)] font-black leading-none tabular-nums tracking-lp text-lp-ink">{clock}</span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-lp-sans text-[max(11px,2.2cqw)] font-bold tracking-lp text-lp-ink">Odak, 2. tur</span>
              <span className="truncate font-lp-sans text-[max(10px,1.9cqw)] font-medium tracking-lp text-lp-ink">Ortak sayaç, herkes için aynı</span>
            </span>
          </div>

          {/* Duvardaki ortak tahta */}
          <div className="absolute right-[3%] top-[7%] flex h-[86%] w-[20%] flex-col">
            <span className="mb-[0.8cqw] font-lp-sans text-[max(10px,1.9cqw)] font-bold tracking-lp text-lp-ink">Ortak tahta</span>
            <div className="relative flex-1 overflow-hidden border-2 border-lp-ink bg-lp-card p-[1.6cqw] shadow-lp-xs">
              <p className="font-lp-sans text-[max(9px,1.8cqw)] font-bold leading-tight tracking-lp text-lp-ink">Fizik 101, 3. hafta</p>
              <div className="mt-[1.4cqw] space-y-[1.1cqw]" aria-hidden="true">
                {[92, 78, 88, 64, 84, 70, 90, 58, 86, 74, 92, 66, 80, 60].map((width, line) => (
                  <div key={line} className="h-[0.5cqw] min-h-[2px] bg-lp-line" style={{ width: `${width}%` }} />
                ))}
              </div>
              <svg viewBox="0 0 100 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                <path d="M10 46 L86 46" stroke="var(--color-lp-mustard)" strokeWidth="9" strokeLinecap="square" fill="none" className="lp-stroke" style={{ ['--len' as string]: 80, animationDelay: '2.1s' }} />
                <path
                  d="M22 104 C 34 96, 74 96, 84 104 C 90 110, 70 114, 50 113 C 30 112, 16 110, 22 104"
                  stroke="var(--color-lp-ink)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                  className="lp-stroke"
                  style={{ ['--len' as string]: 150, animationDelay: '2.7s' }}
                />
              </svg>
              <span className="absolute bottom-[3cqw] left-[1.6cqw] bg-lp-ink px-[1cqw] py-[0.3cqw] font-lp-sans text-[max(9px,1.6cqw)] font-bold tracking-lp text-lp-card">Deniz</span>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-5 text-center font-lp-sans text-lp-sm font-medium tracking-lp text-lp-muted md:text-lp-base">
        Örnek oda. Lambası yanan kişi şu an odaklanıyor; sayaç da tahta da odadaki herkes için aynı.
      </figcaption>
    </figure>
  );
}

function DeskSpot({ x, y, desk, lit }: { x: number; y: number; desk: Desk; lit: boolean }) {
  return (
    <div className="absolute h-[34%] w-[22%]" style={{ left: `${x}%`, top: `${y}%` }}>
      {lit ? (
        <div
          aria-hidden="true"
          className="lp-pool pointer-events-none absolute -inset-[22%] rounded-full"
          style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--color-lp-mustard) 70%, transparent), transparent 80%)' }}
        />
      ) : null}

      {desk ? (
        <>
          {/* Masa yüzeyi */}
          <div className={`relative h-[62%] border-2 border-lp-ink transition-colors duration-700 ${lit ? 'bg-lp-lemon shadow-lp-xs' : 'bg-lp-card'}`}>
            <span
              aria-hidden="true"
              className={`absolute right-[7%] top-[12%] aspect-square w-[12%] rounded-full border-2 border-lp-ink transition-colors duration-700 ${lit ? 'bg-lp-mustard' : 'bg-lp-card'}`}
            />
            <span aria-hidden="true" className="absolute left-[8%] top-[14%] h-[28%] w-[34%] border-2 border-lp-ink bg-lp-card" />
            <span className="absolute bottom-[8%] left-[8%] right-[8%] truncate font-lp-sans text-[max(9px,1.8cqw)] font-medium leading-tight tracking-lp text-lp-ink">{desk.subject}</span>
          </div>
          {/* Sandalyedeki kişi ve durumu */}
          <div className="relative mt-[4%] flex items-center gap-[1.2cqw]">
            <span
              aria-hidden="true"
              className="grid aspect-square w-[24%] shrink-0 place-items-center rounded-full border-2 border-lp-ink bg-lp-card font-lp-sans text-[max(10px,2.2cqw)] font-black text-lp-ink"
            >
              {desk.name.charAt(0)}
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-lp-sans text-[max(10px,2.2cqw)] font-bold tracking-lp text-lp-ink">{desk.name}</span>
              <span className={`font-lp-sans text-[max(9px,1.9cqw)] tracking-lp ${lit ? 'font-black text-lp-ink' : 'font-medium text-lp-muted'}`}>{lit ? 'Odakta' : 'Molada'}</span>
            </span>
          </div>
        </>
      ) : (
        <div className="grid h-[62%] place-items-center border-2 border-dashed border-lp-ink/40 text-center font-lp-sans text-[max(10px,1.9cqw)] font-medium leading-tight tracking-lp text-lp-muted">
          Boş masa
        </div>
      )}
    </div>
  );
}
