import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { m } from 'framer-motion';
import { Avatar } from '../ui';
import { CountUp } from '../app/Kit';
import { badgeIcon } from '../../lib/badges';
import { coverStyle } from '../../lib/cosmetics';
import type { BadgeDefinition, FrameId } from '../../lib/types';

/*
 * Profil ve herkese açık profil sayfalarının ortak parçaları: lamba ışıklı üst bant,
 * sayarak artan istatistikler ve rozet ızgarası.
 */

/** Üst bant: koyu zemin, lamba ışığı, büyük profil fotoğrafı, ad ve küçük rozetler. */
export function ProfileHero({
  name,
  username,
  avatarUrl,
  frame,
  premium,
  cover,
  chips,
  avatarSlot,
  children,
}: {
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  frame?: FrameId;
  premium?: boolean;
  /** Mağazadan alınan profil kapağı (yoksa sade koyu zemin). */
  cover?: string | null;
  chips?: ReactNode;
  /** Profil fotoğrafının üstüne konan düğme (ör. fotoğraf değiştir). */
  avatarSlot?: ReactNode;
  children?: ReactNode;
}) {
  const coverBackground = coverStyle(cover);
  return (
    <section
      data-cover={coverBackground ? cover : undefined}
      className="relative overflow-hidden rounded-[24px] bg-mb-solid text-mb-on-solid shadow-mb-raised"
      // Kapak kullanıcının satın aldığı görsel; veri olduğu için satır içi verilir.
      style={coverBackground ? { background: coverBackground, color: '#fff' } : undefined}
    >
      <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center md:p-8">
        <m.div className="relative w-fit shrink-0" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <div className="rounded-full ring-4 ring-mb-on-solid/10">
            <Avatar name={name} image={avatarUrl} frame={frame} size="xl" premium={premium} />
          </div>
          {avatarSlot}
        </m.div>
        <div className="min-w-0 flex-1">
          <h1 className="font-mb-display text-[2rem] font-light leading-tight tracking-[-0.04em] md:text-[2.5rem]">
            {name}
          </h1>
          {username ? <p className="mt-1 text-[15px] text-mb-on-solid/70">@{username}</p> : null}
          {chips ? <div className="mt-3 flex flex-wrap gap-2">{chips}</div> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

/** Üst banttaki küçük hap. */
export function HeroChip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-mb-on-solid/10 px-3 py-1 text-[13px] font-medium text-mb-on-solid">{children}</span>;
}

/** Sayarak artan istatistik kutuları. */
export function StatGrid({ items }: { items: Array<{ label: string; value: number; suffix?: string; format?: (value: number) => string; icon?: LucideIcon }> }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item, index) => (
        <m.div
          key={item.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[16px] border border-mb-line/70 bg-mb-card p-4 shadow-mb-card"
        >
          <dt className="flex items-center gap-2 text-[13px] text-mb-body">
            {item.icon ? <item.icon className="h-4 w-4 text-mb-action" aria-hidden="true" /> : null}
            {item.label}
          </dt>
          <dd className="mt-2 font-mb-display text-[1.75rem] font-light leading-none tracking-[-0.03em] tabular-nums text-mb-ink">
            <CountUp value={item.value} format={item.format} />
            {item.suffix ? <span className="ml-1 text-base text-mb-body">{item.suffix}</span> : null}
          </dd>
        </m.div>
      ))}
    </dl>
  );
}

/** Rozet ızgarası: kazanılanlar yeşil tonlu, kazanılmayanlar soluk. */
export function BadgeGrid({ catalog, earned }: { catalog: BadgeDefinition[]; earned: string[] }) {
  const has = new Set(earned);
  // Katalogda olmayan eski rozetler de gösterilir.
  const list = [...catalog, ...earned.filter((name) => !catalog.some((badge) => badge.name === name)).map((name) => ({ name, description: '', icon: '' }))];
  const sorted = [...list].sort((a, b) => Number(has.has(b.name)) - Number(has.has(a.name)));
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((badge, index) => {
        const won = has.has(badge.name);
        const Icon = badgeIcon(badge.icon);
        return (
          <m.li
            key={badge.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={won ? { y: -3 } : undefined}
            transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.04, ease: [0.16, 1, 0.3, 1] }}
            className={`flex items-start gap-3 rounded-[16px] border p-4 ${won ? 'border-mb-line/70 bg-mb-card shadow-mb-card' : 'border-dashed border-mb-line bg-transparent opacity-55'}`}
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${won ? 'bg-mb-tint text-mb-action' : 'bg-mb-surface text-mb-body'}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-mb-ink">{badge.name}</p>
              {badge.description ? <p className="mt-0.5 text-[13px] leading-snug text-mb-body">{badge.description}</p> : null}
              <span className="sr-only">{won ? 'Kazanıldı' : 'Henüz kazanılmadı'}</span>
            </div>
          </m.li>
        );
      })}
    </ul>
  );
}
