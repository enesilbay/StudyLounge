import { motion, useReducedMotion } from 'framer-motion';
import { lpBox } from './styles';
import { useEnterProgress, useRange } from './useMotion';

/*
 * Girişteki gerçek oda ekran görüntüsü (yerelde demo hesaplarla alındı):
 * dört kişilik "Demo: Sessiz Kütüphane", üçünün lambası yanık, ortak sayaç
 * akıyor, sohbette iki mesaj var. Görüntü taklit edilmez; yalnızca üstünde
 * lamba ışıması ve kenarlarında açıklama notları hareket eder.
 */

/** Görüntüdeki yanık masaların yeri (yüzde, 1440×900 çekime göre). */
const litDesks = [
  { left: 19, top: 21.3, width: 16.9, height: 16.3 },
  { left: 36.7, top: 21.3, width: 16.9, height: 16.3 },
  { left: 54.5, top: 21.3, width: 16.9, height: 16.3 },
];

/** Açıklama notları: görüntünün dışında, oku ilgili yere uzanır. */
const notes = [
  { text: 'Ortak sayaç: odadaki herkes için aynı', side: 'right' as const, top: '4%', tilt: 2, delay: 1.1 },
  { text: 'Lambası yanan şu an odakta', side: 'left' as const, top: '38%', tilt: -2, delay: 1.5 },
  { text: 'Oda sohbeti: mola gelince konuşulur', side: 'right' as const, top: '52%', tilt: -1.5, delay: 1.9 },
];

export function ProductShot() {
  const reduce = useReducedMotion();
  const { ref, progress } = useEnterProgress<HTMLDivElement>();
  const rotateX = useRange(progress, 14, 0);
  const scale = useRange(progress, 0.92, 1);

  return (
    <figure className="m-0">
      <div ref={ref} className="relative [perspective:1600px]">
        <motion.div style={reduce ? undefined : { rotateX, scale, transformOrigin: '50% 0%' }} className={`${lpBox} relative overflow-hidden bg-lp-card shadow-lp-lg md:shadow-lp-xl`}>
          {/* Tarayıcı çubuğu */}
          <div className="flex items-center gap-2 border-b-2 border-lp-ink bg-lp-paper px-3 py-2 md:px-4">
            <span aria-hidden="true" className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-lp-ink bg-lp-peach" />
              <span className="h-3 w-3 rounded-full border-2 border-lp-ink bg-lp-lemon" />
              <span className="h-3 w-3 rounded-full border-2 border-lp-ink bg-lp-mint" />
            </span>
            <span className="ml-2 min-w-0 flex-1 truncate border-2 border-lp-ink bg-lp-card px-2 py-0.5 text-left font-lp-sans text-lp-label font-bold tracking-lp text-lp-ink md:max-w-sm">
              StudyLounge · Demo: Sessiz Kütüphane
            </span>
          </div>

          <div className="relative">
            <img
              src="/landing/oda-masaustu-2400.webp"
              srcSet="/landing/oda-masaustu-1200.webp 1200w, /landing/oda-masaustu-2400.webp 2400w"
              sizes="(min-width: 1100px) 1000px, 100vw"
              width={2400}
              height={1500}
              fetchPriority="high"
              decoding="async"
              alt="StudyLounge çalışma odası: dört kişilik Demo: Sessiz Kütüphane odasında Elif, Ali ve Zeynep odakta, Deniz molada. Sağ üstte Elif'in başlattığı ortak sayaç 24:51 gösteriyor; sağda oda sohbetinde iki mesaj var."
              className="block h-auto w-full"
            />
            {reduce
              ? null
              : litDesks.map((desk, index) => (
                  <motion.span
                    key={index}
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-[1.2%] mix-blend-multiply"
                    style={{
                      left: `${desk.left}%`,
                      top: `${desk.top}%`,
                      width: `${desk.width}%`,
                      height: `${desk.height}%`,
                      background: 'radial-gradient(closest-side, color-mix(in srgb, var(--color-lp-mustard) 55%, transparent), transparent)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.9, 0.45, 0.9] }}
                    transition={{ delay: 0.8 + index * 0.35, duration: 3.2, times: [0, 0.25, 0.6, 1], repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                  />
                ))}
          </div>
        </motion.div>

        {/* Açıklama notları: geniş ekranda görüntünün iki yanında */}
        {notes.map((note) => (
          <motion.p
            key={note.text}
            className={`absolute z-10 hidden w-48 lg:block ${note.side === 'right' ? '-right-6' : '-left-6'}`}
            style={{ top: note.top }}
            initial={reduce ? false : { opacity: 0, y: 12, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: note.tilt }}
            transition={{ delay: note.delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={`${lpBox} inline-block bg-lp-lemon px-3 py-2 font-lp-sans text-lp-sm font-bold leading-snug tracking-lp text-lp-ink shadow-lp-sm`}>{note.text}</span>
          </motion.p>
        ))}
      </div>

      {/* Dar ekranda notlar görüntünün altında liste olarak */}
      <figcaption className="mt-6 lg:hidden">
        <ul className="mx-auto flex max-w-[40rem] flex-wrap justify-center gap-2">
          {notes.map((note) => (
            <li key={note.text} className={`${lpBox} bg-lp-lemon px-3 py-1.5 font-lp-sans text-lp-sm font-bold tracking-lp text-lp-ink`}>
              {note.text}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
