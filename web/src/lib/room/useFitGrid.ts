import { useLayoutEffect, useState } from 'react';

export interface FitGrid {
  columns: number;
  width: number;
  height: number;
}

/**
 * Kutuları kaydırma olmadan alana sığdıran en iyi ızgara (Google Meet ve Discord'daki gibi).
 * Her sütun sayısı denenir; kutu en/boy oranı kare ile `maxAspect` arasında esner ve
 * kutu alanını en büyük yapan düzen seçilir (eşitlikte daha çok sütun).
 */
export function fitGrid(count: number, areaWidth: number, areaHeight: number, gap: number, maxAspect = 16 / 9, minAspect = 1): FitGrid {
  if (count <= 0 || areaWidth <= 0 || areaHeight <= 0) return { columns: 1, width: 0, height: 0 };
  let best: FitGrid = { columns: 1, width: 0, height: 0 };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    let width = (areaWidth - gap * (columns - 1)) / columns;
    let height = (areaHeight - gap * (rows - 1)) / rows;
    if (width <= 0 || height <= 0) continue;
    if (width / height > maxAspect) width = height * maxAspect;
    if (width / height < minAspect) height = width / minAspect;
    const candidate = { columns, width: Math.floor(width), height: Math.floor(height) };
    if (candidate.width * candidate.height >= best.width * best.height) best = candidate;
  }
  return best;
}

/**
 * Kabın boyutunu izler ve `fitGrid` sonucunu döndürür. Kap, dönen ref ile bağlanır
 * (kap yeniden oluşursa ölçüm yeni öğeye geçer).
 */
export function useFitGrid(count: number, gap = 12): [(element: HTMLElement | null) => void, FitGrid] {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, fitGrid(count, size.width, size.height, gap)];
}
