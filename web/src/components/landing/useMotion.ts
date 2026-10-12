import { useRef, useSyncExternalStore } from 'react';
import { useScroll, useTransform, type MotionValue } from 'framer-motion';

/**
 * Kaydırma ilerlemesi: öğe ekranın altından girip üst kısmına gelene kadar 0 → 1.
 * Ürün görselinin eğikten düze geçişi gibi kaydırmaya bağlı hareketler için.
 */
export function useEnterProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.25'] });
  return { ref, progress: scrollYProgress };
}

/**
 * Didasko'daki ürün görseli hareketinin kaydırma aralığı: görselin üst kenarı
 * ekranın altına girince 0, alt kenarı ekranın altına gelince 1.
 */
export function useShotProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  return { ref, progress: scrollYProgress };
}

/** Medya sorgusunu izler (ör. hareketi yalnızca geniş ekranda açmak için). */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Kaydırma ilerlemesini bir değer aralığına çevirir. */
export function useRange(progress: MotionValue<number>, from: number, to: number) {
  return useTransform(progress, [0, 1], [from, to]);
}
