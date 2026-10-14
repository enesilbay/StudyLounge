import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { m, useReducedMotion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { api } from '../lib/api';
import { unwrapData } from '../lib/apiResponses';
import { formatMinutes } from '../lib/study';
import type { User, WeeklyChampions, WeeklyLeague } from '../lib/types';
import { Avatar } from '../components/ui';
import { AppPage, Card, CardTitle, CountUp, EmptyState, Rise, SegmentedTabs, actionButton } from '../components/app/Kit';
import UserSearch from '../components/social/UserSearch';
import { useAuthStore } from '../store/authStore';

type Period = 'week' | 'all';
type Scope = 'global' | 'friends';

interface Row {
  rank: number;
  minutes: number;
  user: Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'equippedProfileFrame' | 'isPremium'>;
}

const shortDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Haftalık lig ve tüm zamanların sıralaması. İlk üç, yükselen bir kürsüde gösterilir. */
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

  return (
    <AppPage title="Sıralama">
      <div className="space-y-4">
        {/* Bu haftanın ligi: kalan süre ve ödüller */}
        {period === 'week' && league ? <LeagueBanner league={league} /> : null}

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

            {myWeeklyRank ? (
              <p className="mt-4 rounded-[14px] bg-mb-tint px-4 py-3 text-[15px] text-mb-ink">
                Sen {myWeeklyRank.rank}. sıradasın; bu hafta {formatMinutes(myWeeklyRank.minutes)} odaklandın.
              </p>
            ) : null}
            {period === 'week' && league && !league.me && rows?.length ? (
              <p className="mt-4 text-[15px] text-mb-body">Bu hafta henüz odaklanmadın. Bir odada masaya geçtiğinde sıralamaya girersin.</p>
            ) : null}
          </div>

          <Rise delay={0.2} as="section">
            <Card className="p-5">
              <CardTitle>Geçen haftaların birincileri</CardTitle>
              {champions.length === 0 ? (
                <p className="mt-2 text-sm text-mb-body">İlk hafta bitince birinci burada yazacak. Her pazartesi ilk üç ödül puanı alır.</p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {champions.map((week) => {
                    const winner = week.podium.find((entry) => entry.rank === 1);
                    if (!winner) return null;
                    return (
                      <li key={week.weekStart}>
                        <Link to={`/app/u/${winner.user.id}`} className="flex items-center gap-3 rounded-[12px] p-2 transition hover:bg-mb-surface">
                          <Avatar name={winner.user.fullName} image={winner.user.avatarUrl} frame={winner.user.equippedProfileFrame} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-medium text-mb-ink">{winner.user.fullName}</span>
                            <span className="block text-[13px] text-mb-body">
                              {shortDate.format(new Date(`${week.weekStart}T12:00:00`))} haftası, {formatMinutes(winner.minutes)}
                            </span>
                          </span>
                        </Link>
                      </li>
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

/** Koyu lig kartı: hafta cümlesi, kalan süre ve ilk üçün ödülleri. */
function LeagueBanner({ league }: { league: WeeklyLeague }) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  // Hafta pazar günü biter; pazartesi 00:00 Türkiye saati = pazar 21:00 UTC.
  const resetAt = new Date(`${league.weekEnd}T21:00:00Z`).getTime();
  const remaining = Math.max(0, resetAt - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const left = days ? `${days} gün ${hours} saat` : hours ? `${hours} saat` : 'bir saatten az';
  const start = new Date(`${league.weekStart}T12:00:00`);
  const end = new Date(`${league.weekEnd}T12:00:00`);
  const [a, b, c] = league.rewards;

  return (
    <Rise as="section" className="relative overflow-hidden rounded-[24px] bg-mb-solid text-mb-on-solid shadow-mb-raised">
      <div className="relative flex items-center gap-4 px-5 py-5 md:px-8">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-mb-on-solid/70">
            {start.getDate()} – {shortDate.format(end)} haftası. Lig pazartesi 00:00'da sıfırlanıyor, {left} kaldı. İlk üç {a}, {b} ve {c} Odak Puanı alır.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-[13px] text-mb-on-solid/70">Kalan süre</p>
              <p className="font-mb-display text-[2rem] font-light leading-none tracking-[-0.03em] tabular-nums">
                {days}
                <span className="mx-1 text-base text-mb-on-solid/60">gün</span>
                {hours}
                <span className="ml-1 text-base text-mb-on-solid/60">saat</span>
              </p>
            </div>
            <div className="flex gap-2" aria-label="Ödüller">
              {[a, b, c].map((reward, index) => (
                <span key={index} className="rounded-[12px] bg-mb-on-solid/10 px-3 py-1.5 text-center">
                  <span className="block text-[11px] text-mb-on-solid/60">{index + 1}.</span>
                  <span className="block text-sm font-medium tabular-nums">+{reward}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <m.img
          src="/landing/3b/kupa.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none hidden w-24 shrink-0 select-none drop-shadow-[0_18px_30px_rgb(0_0_0/0.35)] sm:block md:w-28"
          animate={reduce ? undefined : { y: [0, -8, 0], rotate: [-4, 2, -4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </Rise>
  );
}

/** İlk üç: 2-1-3 dizilişinde, sırayla yükselen kürsü. */
function Podium({ rows, rewards, meId }: { rows: Row[]; rewards?: number[]; meId?: number }) {
  const order = [rows[1], rows[0], rows[2]].filter(Boolean) as Row[];
  const pedestal: Record<number, string> = { 1: 'h-28 sm:h-36', 2: 'h-20 sm:h-24', 3: 'h-14 sm:h-16' };
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
              <m.img
                src="/landing/3b/kupa.webp"
                alt=""
                aria-hidden="true"
                draggable={false}
                className="mb-1 h-12 w-auto select-none sm:h-14"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.7 }}
              />
            ) : null}
            <span className={`rounded-full transition group-hover:scale-105 ${row.user.id === meId ? 'ring-2 ring-mb-action ring-offset-2 ring-offset-mb-bg' : ''}`}>
              <Avatar name={row.user.fullName} image={row.user.avatarUrl} frame={row.user.equippedProfileFrame} premium={row.user.isPremium} size={row.rank === 1 ? 'lg' : 'md'} />
            </span>
            <span className="mt-2 w-full truncate text-[15px] font-medium text-mb-ink">{row.user.fullName}</span>
            <span className="font-mb-display text-xl font-light tracking-[-0.02em] tabular-nums text-mb-ink sm:text-2xl">
              <CountUp value={row.minutes} format={(value) => formatMinutes(Math.round(value))} />
            </span>
          </Link>
          {/* Kürsü basamağı */}
          <div
            className={`mt-3 flex w-full items-start justify-center rounded-t-[16px] pt-3 ${pedestal[row.rank]} ${row.rank === 1 ? 'bg-mb-action text-mb-on-action' : 'bg-mb-card text-mb-ink shadow-mb-card'}`}
            style={row.rank === 1 ? { boxShadow: '0 -18px 50px -18px var(--color-mb-lamp)' } : undefined}
          >
            <span className="text-center">
              <span className="block font-mb-display text-2xl font-light leading-none">{row.rank}</span>
              <span className={`mt-1 block text-xs ${row.rank === 1 ? 'text-mb-on-action/80' : 'text-mb-body'}`}>
                {row.rank}. sıra{rewards ? `, +${rewards[row.rank - 1]} puan` : ''}
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
      className={isMe ? 'bg-mb-tint' : ''}
    >
      <Link to={`/app/u/${row.user.id}`} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-mb-surface">
        <span className="text-right text-[15px] tabular-nums text-mb-body">{row.rank}</span>
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={row.user.fullName} image={row.user.avatarUrl} frame={row.user.equippedProfileFrame} premium={row.user.isPremium} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium text-mb-ink">
              {row.user.fullName}
              {isMe ? <span className="ml-1.5 text-sm font-normal text-mb-action-ink">(sen)</span> : null}
            </span>
            <span className="mt-1.5 block h-1.5 max-w-56 overflow-hidden rounded-full bg-mb-surface" aria-hidden="true">
              <m.span
                className="block h-1.5 rounded-full bg-mb-action/70"
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
