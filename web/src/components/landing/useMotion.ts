import { useRef } from 'react';
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

/** Kaydırma ilerlemesini bir değer aralığına çevirir. */
export function useRange(progress: MotionValue<number>, from: number, to: number) {
  return useTransform(progress, [0, 1], [from, to]);
}
