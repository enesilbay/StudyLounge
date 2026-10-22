import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { m, useReducedMotion } from 'framer-motion';
import { Crown, Medal, Trophy } from 'lucide-react';
import { api } from '../lib/api';
import { unwrapData } from '../lib/apiResponses';
import { formatMinutes } from '../lib/study';
import type { User, WeeklyChampions, WeeklyLeague } from '../lib/types';
import { Avatar } from '../components/ui';
import { AppPage, Card, CountUp, EmptyState, IconHeading, Rise, SegmentedTabs, actionButton } from '../components/app/Kit';
import UserSearch from '../components/social/UserSearch';
import { useAuthStore } from '../store/authStore';

type Period = 'week' | 'all';
type Scope = 'global' | 'friends';

interface Row {
  rank: number;
  minutes: number;
  user: Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'equippedProfileFrame' | 'isPremium'>;
}

interface Chase {
  rank: number;
  minutes: number;
  /** Bir üstteki kişiye yetişmek için gereken dakika; üstteki listede yoksa null. */
  gap: number | null;
}

const shortDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Madalya renkleri: altın, gümüş, bronz (pastel kutu token'larından). */
const MEDAL: Record<number, { tile: string; label: string }> = {
  1: { tile: 'bg-mb-tile-5', label: 'Altın' },
  2: { tile: 'bg-mb-tile-8', label: 'Gümüş' },
  3: { tile: 'bg-mb-tile-3', label: 'Bronz' },
};

/** Haftalık lig ve tüm zamanların sıralaması. İlk üç altın, gümüş ve bronz kürsüde gösterilir. */
export default function LeaderboardPage() {
  const me = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState<Period>('week');
  const [scope, setScope] = useState<Scope>('global');
  // Sonuç, hangi dönem/kapsam için yüklendiğiyle saklanır; seçim değişince eskisi gösterilmez.
  const [loaded, setLoaded] = useState<{ key: string; rows: Row[] } | null>(null);
  const key = `${period}:${scope}`;
  const rows = loaded?.key === key ? loaded.rows : null;
  const [league, setLeague] = useState<WeeklyLeague | null>(null);
  const [champions, setChampions] = useState<WeeklyChampions[]>([]);

  useEffect(() => {
    let ignore = false;
    const requestKey = `${period}:${scope}`;
    const setRows = (next: Row[]) => setLoaded({ key: requestKey, rows: next });
    const load = async () => {
      try {
        if (period === 'week') {
          const response = await api.get<WeeklyLeague>('/league/weekly', { params: { scope } });
          if (ignore) return;
          setLeague(response.data);
          setRows(response.data.entries);
        } else {
          const response = await api.get<User[]>(scope === 'global' ? '/users/leaderboard' : '/users/friends-leaderboard');
          if (ignore) return;
          setRows(unwrapData<User[]>(response.data).map((user, index) => ({ rank: index + 1, minutes: user.totalFocusMinutes ?? 0, user })));
        }
      } catch {
        if (!ignore) setRows([]);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [period, scope]);

  useEffect(() => {
    api
      .get<WeeklyChampions[]>('/league/champions')
      .then((response) => setChampions(response.data))
      .catch(() => setChampions([]));
  }, []);

  const podium = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  const leaderMinutes = Math.max(1, rows?.[0]?.minutes ?? 1);
  const myRow = rows?.find((row) => row.user.id === me?.id);
  const myWeeklyRank = period === 'week' && !myRow && league?.me ? league.me : null;
  // Senin sıran ve bir üstteki kişiye yetişmek için gereken süre.
  const mine = myRow ?? (period === 'week' && league?.me ? league.me : null);
  const above = mine && mine.rank > 1 ? rows?.find((row) => row.rank === mine.rank - 1) : null;
  const chase: Chase | null = mine ? { rank: mine.rank, minutes: mine.minutes, gap: above ? Math.max(1, above.minutes - mine.minutes + 1) : null } : null;

  return (
    <AppPage title="Sıralama">
      <div className="space-y-4">
        {/* Bu haftanın ligi: kalan süre, ödüller ve senin durumun */}
        {period === 'week' && league ? <LeagueBanner league={league} chase={chase} /> : null}

        <Rise delay={0.05} className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="w-full sm:w-72">
            <SegmentedTabs
              label="Dönem"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'week', label: 'Bu hafta' },
                { value: 'all', label: 'Tüm zamanlar' },
              ]}
            />
          </div>
          <div className="w-full sm:w-64">
            <SegmentedTabs
              label="Kimler"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'global', label: 'Herkes' },
                { value: 'friends', label: 'Arkadaşlar' },
              ]}
            />
          </div>
          <div className="lg:ml-auto lg:w-72">
            <UserSearch placeholder="Birini bul" />
          </div>
        </Rise>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {rows === null ? <p className="py-16 text-center text-mb-body">Sıralama yükleniyor…</p> : null}
            {rows?.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Trophy}
                  title={period === 'week' ? 'Bu hafta henüz kimse odaklanmadı' : 'Gösterilecek kimse yok'}
                  text={period === 'week' ? 'İlk lambayı sen yak; haftanın ilk dakikaları burada görünür.' : scope === 'friends' ? 'Arkadaş ekledikçe burada sıralanırsınız.' : undefined}
                  action={
                    <Link to="/app/lobbies" className={actionButton}>
                      Bir odaya gir
                    </Link>
                  }
                />
              </Card>
            ) : null}

            {podium.length ? <Podium key={key} rows={podium} rewards={period === 'week' ? league?.rewards : undefined} meId={me?.id} /> : null}

            {rest.length ? (
              <Card className="mt-4 overflow-hidden">
                <ol className="divide-y divide-mb-line" start={4}>
                  {rest.map((row, index) => (
                    <RankRow key={`${key}-${row.user.id}`} row={row} leaderMinutes={leaderMinutes} isMe={row.user.id === me?.id} index={index} />
                  ))}
                </ol>
              </Card>
            ) : null}

            {myWeeklyRank && me ? (
              <Card className="mt-4 overflow-hidden">
                <ol start={myWeeklyRank.rank}>
                  <RankRow row={{ rank: myWeeklyRank.rank, minutes: myWeeklyRank.minutes, user: me }} leaderMinutes={leaderMinutes} isMe index={0} />
                </ol>
              </Card>
            ) : null}
            {period === 'week' && league && !league.me && rows?.length ? (
              <p className="mt-4 text-[15px] text-mb-body">Bu hafta henüz odaklanmadın. Bir odada masaya geçtiğinde sıralamaya girersin.</p>
            ) : null}
          </div>

          <Rise delay={0.2} as="section">
            <Card className="p-5">
              <IconHeading icon={Crown} tile="bg-mb-tile-5" title="Şampiyonlar" text="Geçen haftaların birincileri" />
              {champions.length === 0 ? (
                <p className="mt-3 text-sm text-mb-body">İlk hafta bitince birinci burada yazacak. Her pazartesi ilk üç ödül puanı alır.</p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {champions.map((week, index) => {
                    const winner = week.podium.find((entry) => entry.rank === 1);
                    if (!winner) return null;
                    return (
                      <m.li key={week.weekStart} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.3 + index * 0.05, ease: EASE_OUT }}>
                        <Link to={`/app/u/${winner.user.id}`} className="flex items-center gap-3 rounded-[12px] p-2 transition hover:bg-mb-surface">
                          <span className="relative">
                            <Avatar name={winner.user.fullName} image={winner.user.avatarUrl} frame={winner.user.equippedProfileFrame} size="sm" />
                            <span aria-hidden="true" className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-mb-tile-5 text-mb-ink ring-2 ring-mb-card">
                              <Crown className="h-3 w-3" />
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-medium text-mb-ink">{winner.user.fullName}</span>
                            <span className="block text-[13px] text-mb-body">
                              {shortDate.format(new Date(`${week.weekStart}T12:00:00`))} haftası · {formatMinutes(winner.minutes)}
                            </span>
                          </span>
                        </Link>
                      </m.li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </Rise>
        </div>
      </div>
    </AppPage>
  );
}

/** Koyu lig kartı: canlı geri sayım, ilk üçün ödülleri ve senin durumun. */
function LeagueBanner({ league, chase }: { league: WeeklyLeague; chase: Chase | null }) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  // Hafta pazar günü biter; pazartesi 00:00 Türkiye saati = pazar 21:00 UTC.
  const resetAt = new Date(`${league.weekEnd}T21:00:00Z`).getTime();
  const remaining = Math.max(0, resetAt - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const start = new Date(`${league.weekStart}T12:00:00`);
  const end = new Date(`${league.weekEnd}T12:00:00`);
  const countdown: [number, string][] = [
    [days, 'gün'],
    [hours, 'saat'],
    [minutes, 'dk'],
  ];

  return (
    <Rise as="section" className="relative overflow-hidden rounded-[24px] bg-mb-solid text-mb-on-solid shadow-mb-raised">
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full bg-mb-lamp opacity-25 blur-3xl" />
      <div className="relative grid gap-6 px-5 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:px-8">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[13px] text-mb-on-solid/70">
            <Trophy className="h-4 w-4 text-mb-lamp" aria-hidden="true" />
            Haftalık lig · {start.getDate()} – {shortDate.format(end)}
          </p>
          <p className="mt-3 text-[13px] text-mb-on-solid/70">Pazartesi 00:00'da sıfırlanıyor</p>
          <div className="mt-2 flex gap-2" role="timer" aria-label={`${days} gün ${hours} saat ${minutes} dakika kaldı`}>
            {countdown.map(([value, unit]) => (
              <span key={unit} className="min-w-16 rounded-[14px] bg-mb-on-solid/10 px-3 py-2 text-center" aria-hidden="true">
                <span className="block font-mb-display text-[1.75rem] font-light leading-none tabular-nums">{String(value).padStart(2, '0')}</span>
                <span className="mt-1 block text-[11px] text-mb-on-solid/60">{unit}</span>
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Ödüller">
            {league.rewards.slice(0, 3).map((reward, index) => (
              <span key={index} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium text-mb-ink ${MEDAL[index + 1].tile}`}>
                <Medal className="h-3.5 w-3.5" aria-hidden="true" />
                {index + 1}. · +{reward} puan
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-4 md:flex-col md:items-end md:justify-between">
          <m.img
            src="/landing/3b/kupa.webp"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none hidden w-20 shrink-0 select-none drop-shadow-[0_18px_30px_rgb(0_0_0/0.35)] sm:block md:w-24"
            animate={reduce ? undefined : { y: [0, -8, 0], rotate: [-4, 2, -4] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="w-full rounded-[16px] bg-mb-on-solid/10 px-4 py-3 md:w-64">
            <p className="text-xs text-mb-on-solid/70">Senin sıran</p>
            {chase ? (
              <>
                <p className="mt-0.5 flex items-baseline gap-2">
                  <span className="font-mb-display text-[1.75rem] font-light leading-none tabular-nums">#{chase.rank}</span>
                  <span className="text-sm text-mb-on-solid/80">{formatMinutes(chase.minutes)}</span>
                </p>
                <p className="mt-1.5 text-[13px] text-mb-on-solid/80">
                  {chase.rank === 1 ? 'Zirvedesin; yerini koru!' : chase.gap ? `${chase.rank - 1}. sıraya ${formatMinutes(chase.gap)} kaldı` : 'Odaklandıkça yükselirsin.'}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[13px] text-mb-on-solid/80">Bu hafta henüz odaklanmadın. Bir odada lambanı yak, sıralamaya gir.</p>
            )}
          </div>
        </div>
      </div>
    </Rise>
  );
}

/** İlk üç: 2-1-3 dizilişinde altın, gümüş, bronz kürsü; sırayla yükselir. */
function Podium({ rows, rewards, meId }: { rows: Row[]; rewards?: number[]; meId?: number }) {
  const order = [rows[1], rows[0], rows[2]].filter(Boolean) as Row[];
  const pedestal: Record<number, string> = { 1: 'h-32 sm:h-40', 2: 'h-24 sm:h-28', 3: 'h-16 sm:h-20' };
  const delay: Record<number, number> = { 1: 0.35, 2: 0.15, 3: 0.25 };
  return (
    <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="İlk üç">
      {order.map((row) => (
        <m.li
          key={row.user.id}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 18, delay: delay[row.rank] }}
          className="flex flex-col items-center"
        >
          <Link to={`/app/u/${row.user.id}`} className="group flex w-full flex-col items-center px-1 text-center">
            {row.rank === 1 ? (
              <m.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.75 }} className="mb-1">
                <Crown className="h-7 w-7 fill-mb-lamp text-mb-ink" aria-hidden="true" />
              </m.span>
            ) : null}
            <span className={`relative rounded-full transition group-hover:scale-105 ${row.user.id === meId ? 'ring-2 ring-mb-action ring-offset-2 ring-offset-mb-bg' : ''}`}>
              <Avatar name={row.user.fullName} image={row.user.avatarUrl} frame={row.user.equippedProfileFrame} premium={row.user.isPremium} size={row.rank === 1 ? 'lg' : 'md'} />
              <span className={`absolute -bottom-1 -left-1 grid h-6 w-6 place-items-center rounded-full text-xs font-semibold text-mb-ink ring-2 ring-mb-bg ${MEDAL[row.rank].tile}`} aria-hidden="true">
                {row.rank}
              </span>
            </span>
            <span className="mt-2 w-full truncate text-[15px] font-medium text-mb-ink">
              {row.user.fullName}
              {row.user.id === meId ? <span className="font-normal text-mb-action-ink"> (sen)</span> : null}
            </span>
            <span className="font-mb-display text-xl font-light tracking-[-0.02em] tabular-nums text-mb-ink sm:text-2xl">
              <CountUp value={row.minutes} format={(value) => formatMinutes(Math.round(value))} />
            </span>
          </Link>
          {/* Kürsü basamağı */}
          <div
            className={`relative mt-3 flex w-full items-start justify-center overflow-hidden rounded-t-[18px] pt-3 text-mb-ink ${pedestal[row.rank]} ${MEDAL[row.rank].tile}`}
            style={row.rank === 1 ? { boxShadow: '0 -18px 50px -16px var(--color-mb-lamp)' } : undefined}
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-mb-card/40 to-transparent" />
            <span className="relative text-center">
              <span className="block font-mb-display text-3xl font-light leading-none">{row.rank}</span>
              <span className="mt-1 block text-xs text-mb-ink/70">
                {MEDAL[row.rank].label}
                {rewards ? ` · +${rewards[row.rank - 1]}` : ''}
              </span>
            </span>
          </div>
        </m.li>
      ))}
    </ol>
  );
}

function RankRow({ row, leaderMinutes, isMe, index }: { row: Row; leaderMinutes: number; isMe: boolean; index: number }) {
  const share = Math.max(2, Math.round((row.minutes / leaderMinutes) * 100));
  return (
    <m.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.4 + Math.min(index, 12) * 0.04, ease: EASE_OUT }}
      className={isMe ? 'bg-mb-tile-1' : ''}
    >
      <Link to={`/app/u/${row.user.id}`} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-mb-surface/70">
        <span className={`grid h-8 min-w-8 place-items-center rounded-full px-1.5 text-sm font-medium tabular-nums ${isMe ? 'bg-mb-ink text-mb-bg' : 'bg-mb-surface text-mb-ink'}`}>{row.rank}</span>
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={row.user.fullName} image={row.user.avatarUrl} frame={row.user.equippedProfileFrame} premium={row.user.isPremium} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5 text-[15px] font-medium text-mb-ink">
              <span className="truncate">{row.user.fullName}</span>
              {isMe ? <span className="shrink-0 rounded-full bg-mb-ink px-2 py-0.5 text-[11px] font-medium text-mb-bg">Sen</span> : null}
            </span>
            <span className="mt-1.5 block h-2 max-w-64 overflow-hidden rounded-full bg-mb-surface" aria-hidden="true">
              <m.span
                className="block h-2 rounded-full bg-gradient-to-r from-mb-action to-mb-action-2"
                initial={{ width: 0 }}
                animate={{ width: `${share}%` }}
                transition={{ duration: 0.8, delay: 0.5 + Math.min(index, 12) * 0.04, ease: EASE_OUT }}
              />
            </span>
          </span>
        </span>
        <span className="text-[15px] font-medium tabular-nums text-mb-ink">{formatMinutes(row.minutes)}</span>
      </Link>
    </m.li>
  );
}
