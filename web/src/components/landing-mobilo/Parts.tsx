import type { ReactNode } from 'react';
import { Reveal } from '../landing/Motion';
import { mbDisplay } from './styles';

/** İçerik kabı: 1320px, yanlarda 20px (geniş ekranda 32px). */
export function MbContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-mb px-5 md:px-8 ${className}`}>{children}</div>;
}

/** Küçük lamba işaretli etiket hapı (bölüm başlıklarının üstünde). */
export function MbPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-mb-line bg-mb-bg px-3 py-1 font-mb-body text-sm text-mb-ink shadow-mb-raised">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-mb-action shadow-[0_0_8px_2px] shadow-mb-action/50" />
      {children}
    </span>
  );
}

/** Ortalanmış bölüm başlığı: hap, ince büyük başlık, gövde metni. */
export function MbSectionTitle({ id, pill, title, intro }: { id?: string; pill: string; title: string; intro?: string }) {
  return (
    <Reveal className="mx-auto max-w-[46rem] text-center">
      <MbPill>{pill}</MbPill>
      <h2 id={id} className={`${mbDisplay} mt-5 text-balance text-[2.25rem] leading-[1.15] md:text-[3.25rem]`}>
        {title}
      </h2>
      {intro ? <p className="mx-auto mt-4 max-w-[38rem] font-mb-body text-base leading-[1.8] text-mb-body md:text-lg">{intro}</p> : null}
    </Reveal>
  );
}

/** Gerçek uygulama ekranından bir kesit: beyaz iç kart, ince kenarlık, yumuşak gölge. */
export function MbShot({ src, alt, width, height, className = '' }: { src: string; alt: string; width: number; height: number; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[16px] border border-mb-line bg-mb-bg shadow-mb-card ${className}`}>
      <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className="block h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
    </div>
  );
}
