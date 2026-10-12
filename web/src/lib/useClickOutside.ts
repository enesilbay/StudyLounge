import { useEffect, useRef, type RefObject } from 'react';

/** Kutunun dışına basılınca (pointerdown) ya da Escape'e basılınca `onOutside` çağrılır; `enabled` kapalıyken dinlemez. */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, enabled = true) {
  const handler = useRef(onOutside);
  useEffect(() => {
    handler.current = onOutside;
  });
  useEffect(() => {
    if (!enabled) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) handler.current();
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && handler.current();
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, enabled]);
}
