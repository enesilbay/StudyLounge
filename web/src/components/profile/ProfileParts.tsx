import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { m } from 'framer-motion';
import { Crown, GraduationCap, Medal, Sprout, Target } from 'lucide-react';
import { Avatar } from '../ui';
import { CountUp, TileStat } from '../app/Kit';
import type { Tile } from '../app/Kit';
import { badgeIcon } from '../../lib/badges';
import { coverStyle } from '../../lib/cosmetics';
import { RANKS, rankProgress } from '../../lib/ranks';
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
      {coverBackground ? null : <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-mb-lamp opacity-20 blur-3xl" />}
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

/** Sayarak artan, renkli istatistik kutuları. */
export function StatGrid({
  items,
}: {
  items: Array<{ label: string; value: number; suffix?: string; format?: (value: number) => string; icon: LucideIcon; tile: Tile; note?: ReactNode }>;
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item, index) => (
        <TileStat key={item.label} index={index} tile={item.tile} icon={item.icon} label={item.label} note={item.note}>
          <CountUp value={item.value} format={item.format} />
          {item.suffix ? <span className="ml-1 text-base text-mb-ink/70">{item.suffix}</span> : null}
        </TileStat>
      ))}
    </dl>
  );
}

const BADGE_TILES: Tile[] = ['bg-mb-tile-1', 'bg-mb-tile-2', 'bg-mb-tile-3', 'bg-mb-tile-4', 'bg-mb-tile-5', 'bg-mb-tile-6', 'bg-mb-tile-7', 'bg-mb-tile-8'];

/** Rozetin rengi adından hesaplanır; aynı rozet her profilde aynı renktedir. */
function badgeTile(name: string): Tile {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return BADGE_TILES[hash % BADGE_TILES.length];
}

/** Rozet ızgarası: kazanılanlar kendi renginde, kazanılmayanlar kesik çizgili ve soluk. */
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
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={won ? { y: -3 } : undefined}
            transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.04, ease: [0.16, 1, 0.3, 1] }}
            className={`group flex items-start gap-3 rounded-[16px] p-4 ${won ? `${badgeTile(badge.name)} shadow-mb-card` : 'border border-dashed border-mb-line bg-transparent opacity-60'}`}
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] transition-transform ${won ? 'bg-mb-card/85 text-mb-ink shadow-mb-card group-hover:-rotate-6 group-hover:scale-110' : 'bg-mb-surface text-mb-body'}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-mb-ink">{badge.name}</p>
              {badge.description ? <p className={`mt-0.5 text-[13px] leading-snug ${won ? 'text-mb-ink/70' : 'text-mb-body'}`}>{badge.description}</p> : null}
              <span className="sr-only">{won ? 'Kazanıldı' : 'Henüz kazanılmadı'}</span>
            </div>
          </m.li>
        );
      })}
    </ul>
  );
}

const RANK_TILES: Tile[] = ['bg-mb-tile-1', 'bg-mb-tile-2', 'bg-mb-tile-4', 'bg-mb-tile-6', 'bg-mb-tile-5'];
const RANK_ICONS: LucideIcon[] = [Sprout, Target, GraduationCap, Medal, Crown];

/** Rütbe merdiveni: her rütbenin kendi rengi ve ikonu; şu anki rütbe büyür, sıradakine ilerleme çubuğu. */
export function RankLadder({ minutes, self = true }: { minutes: number; self?: boolean }) {
  const progress = rankProgress(minutes);
  const CurrentIcon = RANK_ICONS[progress.index];
  return (
    <div>
      <div className="flex items-center gap-4">
        <m.span
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-[20px] text-mb-ink shadow-mb-card ${RANK_TILES[progress.index]}`}
          initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.2 }}
        >
          <CurrentIcon className="h-7 w-7" aria-hidden="true" />
        </m.span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-mb-body">{self ? 'Rütben' : 'Rütbesi'}</p>
          <p className="font-mb-display text-2xl font-medium tracking-[-0.03em] text-mb-ink">{RANKS[progress.index].title}</p>
          <p className="text-sm text-mb-body">
            {progress.next ? `${progress.next} rütbesine ${progress.remaining} dk kaldı` : 'En yüksek rütbe; tebrikler!'}
          </p>
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-mb-surface" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.percentage)} aria-label="Sıradaki rütbeye ilerleme">
        <m.div
          className="h-full rounded-full bg-gradient-to-r from-mb-action to-mb-action-2"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 1.1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <ol className="mt-5 grid grid-cols-5 gap-1.5" aria-label="Rütbeler">
        {RANKS.map((rank, index) => {
          const reached = index <= progress.index;
          const Icon = RANK_ICONS[index];
          return (
            <li key={rank.title} className="flex flex-col items-center gap-1.5 text-center">
              <m.span
                aria-hidden="true"
                className={`grid h-10 w-10 place-items-center rounded-[12px] ${reached ? `${RANK_TILES[index]} text-mb-ink` : 'border border-dashed border-mb-line text-mb-body/60'} ${
                  index === progress.index ? 'ring-2 ring-mb-ink ring-offset-2 ring-offset-mb-card' : ''
                }`}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 + index * 0.07 }}
              >
                <Icon className="h-4 w-4" />
              </m.span>
              <span className={`text-[12px] leading-tight sm:text-[13px] ${index === progress.index ? 'font-medium text-mb-ink' : 'text-mb-body'}`}>
                {rank.title}
                <span className="sr-only">{index === progress.index ? ' (şu anki rütbe)' : reached ? ' (geçildi)' : ` (${rank.min} dk)`}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
