import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

type Desk = { name: string; subject: string; focusing: boolean } | null;

/** Örnek oda. Gerçek kullanıcı değil; sayfada "Örnek oda" olarak etiketlenir. */
const desks: Array<{ x: number; y: number; desk: Desk }> = [
  { x: 3, y: 8, desk: { name: 'Zeynep', subject: 'Biyokimya', focusing: true } },
  { x: 27, y: 8, desk: { name: 'Mert', subject: 'Diferansiyel denklemler', focusing: true } },
  { x: 51, y: 8, desk: { name: 'Elif', subject: 'Ceza hukuku', focusing: false } },
  { x: 3, y: 58, desk: { name: 'Can', subject: 'YDS kelime', focusing: true } },
  { x: 27, y: 58, desk: { name: 'Deniz', subject: 'Algoritma analizi', focusing: true } },
  { x: 51, y: 58, desk: null },
];

const LAMP_STEP_MS = 320;
const START_SECONDS = 18 * 60 + 42;

/**
 * Hero'daki örnek çalışma odası, yukarıdan bakılan bir kat planı olarak.
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
      <div
        role="img"
        aria-label="Örnek bir çalışma odasının kat planı. Altı masadan dördünde lamba yanıyor, yani o kişiler odaklanıyor; bir kişi molada, bir masa boş. Ortada odadaki herkes için aynı işleyen ortak sayaç, duvarda birlikte not alınan bir PDF tahtası var."
        className="@container relative aspect-[4/3] w-full overflow-hidden rounded-[22px] bg-lp-night-2 ring-1 ring-lp-sea/20"
        style={{
          backgroundImage:
            'linear-gradient(rgb(232 241 239 / 0.035) 1px, transparent 1px), linear-gradient(90deg, rgb(232 241 239 / 0.035) 1px, transparent 1px)',
          backgroundSize: '6.25% 8.333%',
        }}
      >
        {desks.map(({ x, y, desk }, index) => (
          <DeskSpot key={index} x={x} y={y} desk={desk} lit={Boolean(desk?.focusing) && index < visibleLit} />
        ))}

        {/* Ortak sayaç: iki masa sırası arasındaki koridorda */}
        <div className="absolute left-[3%] top-[44%] flex w-[72%] items-center gap-[3cqw] rounded-[2cqw] bg-lp-night/80 px-[3cqw] py-[1.6cqw] ring-1 ring-lp-sea/25 backdrop-blur-sm">
          <span className="font-lp-display text-[max(18px,6.2cqw)] font-semibold leading-none tabular-nums tracking-tight text-lp-on-night">{clock}</span>
          <span className="flex flex-col leading-tight">
            <span className="text-[max(11px,2.3cqw)] font-semibold text-lp-lamp">Odak, 2. tur</span>
            <span className="text-[max(10px,2.1cqw)] text-lp-on-night-muted">Ortak sayaç, herkes için aynı</span>
          </span>
        </div>

        {/* Duvardaki ortak tahta */}
        <div className="absolute right-[3%] top-[8%] flex h-[84%] w-[19%] flex-col">
          <span className="mb-[1cqw] text-[max(10px,2.1cqw)] font-semibold text-lp-on-night-muted">Ortak tahta</span>
          <div className="relative flex-1 overflow-hidden rounded-[1.2cqw] bg-lp-paper p-[1.6cqw] shadow-[0_1.5cqw_4cqw_rgb(0_0_0/0.35)]">
            <p className="text-[max(9px,1.9cqw)] font-semibold leading-tight text-lp-ink">Fizik 101, 3. hafta</p>
            <div className="mt-[1.4cqw] space-y-[1.1cqw]" aria-hidden="true">
              {[92, 78, 88, 64, 84, 70, 90, 58, 86, 74, 92, 66, 80, 60].map((width, line) => (
                <div key={line} className="h-[0.55cqw] min-h-[2px] rounded-full bg-lp-line" style={{ width: `${width}%` }} />
              ))}
            </div>
            <svg viewBox="0 0 100 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              <path d="M10 46 L86 46" stroke="var(--color-lp-lamp)" strokeOpacity="0.55" strokeWidth="9" strokeLinecap="round" fill="none" className="lp-stroke" style={{ ['--len' as string]: 80, animationDelay: '2.1s' }} />
              <path
                d="M22 104 C 34 96, 74 96, 84 104 C 90 110, 70 114, 50 113 C 30 112, 16 110, 22 104"
                stroke="var(--color-lp-night)"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
                className="lp-stroke"
                style={{ ['--len' as string]: 150, animationDelay: '2.7s' }}
              />
            </svg>
            <span className="absolute bottom-[3cqw] left-[2cqw] flex items-center gap-[0.6cqw] rounded-full bg-lp-night px-[1cqw] py-[0.3cqw] text-[max(9px,1.7cqw)] font-semibold text-lp-on-night">
              <span className="size-[0.9cqw] min-h-1 min-w-1 rounded-full bg-lp-sea" />
              Deniz
            </span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-[15px] leading-6 text-lp-on-night-muted">
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
          className="lp-pool pointer-events-none absolute -inset-[30%] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgb(255 157 187 / 0.32), rgb(255 157 187 / 0.1) 58%, transparent 78%)' }}
        />
      ) : null}

      {desk ? (
        <>
          {/* Masa yüzeyi */}
          <div className={`relative h-[62%] rounded-[1.4cqw] ring-1 transition-colors duration-700 ${lit ? 'bg-lp-desk ring-lp-lamp/30' : 'bg-lp-desk/70 ring-white/5'}`}>
            <span
              aria-hidden="true"
              className={`absolute right-[7%] top-[12%] aspect-square w-[11%] rounded-full transition-all duration-700 ${lit ? 'bg-lp-lamp shadow-[0_0_2.4cqw_0.6cqw_rgb(255_157_187/0.7)]' : 'bg-lp-on-night-muted/30'}`}
            />
            <span aria-hidden="true" className="absolute left-[8%] top-[14%] h-[28%] w-[34%] rounded-[0.4cqw] bg-lp-on-night/85" />
            <span className="absolute bottom-[10%] left-[8%] right-[8%] truncate text-[max(9px,1.9cqw)] leading-tight text-lp-on-night-muted">{desk.subject}</span>
          </div>
          {/* Sandalyedeki kişi ve durumu */}
          <div className="mt-[4%] flex items-center gap-[1.2cqw]">
            <span
              aria-hidden="true"
              className={`grid aspect-square w-[24%] shrink-0 place-items-center rounded-full font-lp-display text-[max(10px,2.3cqw)] font-semibold transition-colors duration-700 ${lit ? 'bg-lp-on-night text-lp-night' : 'bg-lp-on-night-muted/25 text-lp-on-night-muted'}`}
            >
              {desk.name.charAt(0)}
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[max(10px,2.35cqw)] font-semibold text-lp-on-night">{desk.name}</span>
              <span className={`text-[max(9px,2cqw)] font-semibold ${lit ? 'text-lp-lamp' : 'text-lp-on-night-muted'}`}>{lit ? 'Odakta' : 'Molada'}</span>
            </span>
          </div>
        </>
      ) : (
        <div className="grid h-[62%] place-items-center rounded-[1.4cqw] border border-dashed border-lp-on-night-muted/40 text-center text-[max(10px,2.1cqw)] leading-tight text-lp-on-night-muted">
          Boş masa
        </div>
      )}
    </div>
  );
}
