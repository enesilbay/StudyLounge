import { m, useReducedMotion } from 'framer-motion';
import { lpBox } from './styles';
import { useMediaQuery, useRange, useShotProgress } from './useMotion';

/*
 * Girişteki gerçek oda ekran görüntüsü (yerelde demo hesaplarla alındı):
 * altı kişilik "Demo: Sessiz Kütüphane", dördünün lambası yanık, ortak sayaç
 * akıyor, altta tahta/ekran/ses kontrolleri, sohbette mesajlar var.
 */

/** Görüntüdeki yanık masaların yeri (yüzde, 1200×750 / 2400×1500 çekime göre). */
const litDesks = [
  { left: 24, top: 14.3, width: 21.7, height: 34.7 },
  { left: 46.7, top: 14.3, width: 21.7, height: 34.7 },
  { left: 1.3, top: 50.5, width: 21.7, height: 34.7 },
  { left: 24, top: 50.5, width: 21.7, height: 34.7 },
];

/** Açıklama notları: odak odasındaki özellikleri öne çıkaran etiketler. */
const notes = [
  { text: 'Ortak sayaç: herkes aynı anda odaklanır', side: 'left' as const, top: '2%', tilt: -2, delay: 1.1 },
  { text: 'Lambası yanan şu an odakta', side: 'left' as const, top: '34%', tilt: 2, delay: 1.5 },
  { text: 'Ortak tahta, ekran paylaşımı ve sesler', side: 'left' as const, top: '84%', tilt: -1.5, delay: 1.9 },
  { text: 'Oda sohbeti ve görev paneli', side: 'right' as const, top: '46%', tilt: 2, delay: 1.7 },
];

/** `brutal`: Didasko sürümü (kalın kenarlık, sert gölge). `soft`: Mobilo sürümü (yuvarlak, yumuşak gölge). */
export function ProductShot({ variant = 'brutal' }: { variant?: 'brutal' | 'soft' }) {
  const soft = variant === 'soft';
  const reduce = useReducedMotion();
  // Didasko'dan ölçülen değerler: 25° yatık ve %90 boyuttan, doğrusal olarak düz ve %100'e;
  // perspektif 1200px, dönme merkezi görselin ortası. Didasko gibi telefonda (810px altı) kapalı.
  const wide = useMediaQuery('(min-width: 810px)');
  const tilt = !reduce && wide;
  const { ref, progress } = useShotProgress<HTMLDivElement>();
  const rotateX = useRange(progress, 25, 0);
  const scale = useRange(progress, 0.9, 1);

  return (
    <figure className="m-0">
      <div ref={ref} className="relative">
        <m.div
          style={tilt ? { rotateX, scale, transformPerspective: 1200 } : undefined}
          className={soft ? 'relative overflow-hidden rounded-[24px] border-4 border-mb-bg bg-mb-bg shadow-mb-shot' : `${lpBox} relative overflow-hidden bg-lp-card shadow-lp-lg md:shadow-lp-xl`}
        >
          {/* Tarayıcı çubuğu */}
          {soft ? (
            <div className="flex items-center gap-2 border-b border-mb-line bg-mb-surface px-4 py-2.5">
              <span aria-hidden="true" className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-mb-line" />
                <span className="h-2.5 w-2.5 rounded-full bg-mb-line" />
                <span className="h-2.5 w-2.5 rounded-full bg-mb-line" />
              </span>
              <span className="ml-2 min-w-0 flex-1 truncate rounded-full bg-mb-bg px-3 py-1 text-left font-mb-body text-xs text-mb-body md:max-w-sm">StudyLounge · Sessiz Kütüphane</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 border-b-2 border-lp-ink bg-lp-paper px-3 py-2 md:px-4">
              <span aria-hidden="true" className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-lp-ink bg-lp-tint-cool" />
                <span className="h-3 w-3 rounded-full border-2 border-lp-ink bg-lp-tint-warm" />
                <span className="h-3 w-3 rounded-full border-2 border-lp-ink bg-lp-tint-green" />
              </span>
              <span className="ml-2 min-w-0 flex-1 truncate border-2 border-lp-ink bg-lp-card px-2 py-0.5 text-left font-lp-sans text-lp-label font-bold tracking-lp text-lp-ink md:max-w-sm">
                StudyLounge · Demo: Sessiz Kütüphane
              </span>
            </div>
          )}

          <div className="relative">
            <img
              src="/landing/oda-masaustu-2400.webp"
              srcSet="/landing/oda-masaustu-1200.webp 1200w, /landing/oda-masaustu-2400.webp 2400w"
              sizes="(min-width: 1300px) 1200px, 100vw"
              width={2400}
              height={1500}
              fetchPriority="high"
              decoding="async"
              alt="StudyLounge odak odası: altı kişilik Sessiz Kütüphane odasında Ali, Zeynep, Mert ve Selin odakta; Elif ve Deniz molada. Üstte ortak sayaç 24:50 gösteriyor; altta tahta, ekran ve ses kontrol çubuğu; sağda oda sohbeti açık."
              className="block h-auto w-full"
            />
            {reduce
              ? null
              : litDesks.map((desk, index) => (
                  <m.span
                    key={index}
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-[1.2%] mix-blend-multiply"
                    style={{
                      left: `${desk.left}%`,
                      top: `${desk.top}%`,
                      width: `${desk.width}%`,
                      height: `${desk.height}%`,
                      background: soft
                        ? 'radial-gradient(closest-side, color-mix(in srgb, var(--color-mb-action-2) 40%, transparent), transparent)'
                        : 'radial-gradient(closest-side, color-mix(in srgb, var(--color-lp-action) 55%, transparent), transparent)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.9, 0.45, 0.9] }}
                    transition={{ delay: 0.8 + index * 0.35, duration: 3.2, times: [0, 0.25, 0.6, 1], repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                  />
                ))}
          </div>
        </m.div>

        {/* Açıklama notları: geniş ekranda görüntünün iki yanında */}
        {notes.map((note) => (
          <m.p
            key={note.text}
            className={`absolute z-10 hidden w-48 lg:block ${note.side === 'right' ? '-right-6' : '-left-6'}`}
            style={{ top: note.top }}
            initial={reduce ? false : { opacity: 0, y: 12, rotate: 0, scale: soft ? 0.8 : 1 }}
            animate={{ opacity: 1, y: 0, rotate: note.tilt, scale: 1 }}
            // Mobilo sürümünde notlar yaylanarak oturur.
            transition={soft ? { delay: note.delay, type: 'spring', stiffness: 260, damping: 14 } : { delay: note.delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className={
                soft
                  ? 'inline-block rounded-[14px] border border-mb-line bg-mb-bg px-3.5 py-2.5 font-mb-body text-sm font-medium leading-snug text-mb-ink shadow-mb-raised'
                  : `${lpBox} inline-block bg-lp-tint-warm px-3 py-2 font-lp-sans text-lp-sm font-bold leading-snug tracking-lp text-lp-ink shadow-lp-sm`
              }
            >
              {note.text}
            </span>
          </m.p>
        ))}
      </div>

      {/* Dar ekranda notlar görüntünün altında liste olarak */}
      <figcaption className="mt-6 lg:hidden">
        <ul className="mx-auto flex max-w-[40rem] flex-wrap justify-center gap-2">
          {notes.map((note) => (
            <li
              key={note.text}
              className={soft ? 'rounded-full border border-mb-line bg-mb-bg px-3.5 py-1.5 font-mb-body text-sm text-mb-ink' : `${lpBox} bg-lp-tint-warm px-3 py-1.5 font-lp-sans text-lp-sm font-bold tracking-lp text-lp-ink`}
            >
              {note.text}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
