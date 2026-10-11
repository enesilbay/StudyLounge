import { useId } from 'react';

/*
 * StudyLounge logosu: açık kitabın üstünde yanan lamba. Kaynak dosyalar
 * docs/brand/logo/ altında; kurallar docs/brand/marka-rehberi.md'de.
 * Lamba ve kitap `currentColor` ile boyanır (yeşil zeminde beyaz, açık zeminde
 * orman yeşili); ışık her zaman lamba rengindedir (`mb-lamp`).
 */
export function LogoMark({ className, beam = true }: { className?: string; beam?: boolean }) {
  const gradientId = `isik-${useId()}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {beam ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--color-mb-lamp)" stopOpacity="0.95" />
              <stop offset="1" stopColor="var(--color-mb-lamp)" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <path d="M21.5 24h21l9.5 15H12Z" fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <path d="M20 21c0-6.6 5.4-11 12-11s12 4.4 12 11Z" fill="currentColor" />
      <rect x="18" y="19.5" width="28" height="4.5" rx="2.25" fill="currentColor" />
      <path d="M31 52c-6-4-14-5.5-23-5V36.5c9-.5 17 1 23 5Z" fill="currentColor" />
      <path d="M33 52c6-4 14-5.5 23-5V36.5c-9-.5-17 1-23 5Z" fill="currentColor" />
    </svg>
  );
}
