import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { unwrapData } from '../lib/apiResponses';
import { formatMinutes } from '../lib/study';
import type { User, WeeklyChampions, WeeklyLeague } from '../lib/types';
import { Avatar, LampMark, StateBlock, Surface } from '../components/ui';
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

/** Haftalık lig ve tüm zamanların sıralaması. İlk üç, lambaları yanan üç masa olarak gösterilir. */
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
    <div>
      <header className="mb-6">
        <h1 className="text-4xl md:text-5xl">Sıralama</h1>
        <p className="mt-3 max-w-2xl text-lg text-textMuted">
          {period === 'week' && league ? <WeekLine league={league} /> : 'Hesap açıldığından beri en çok odaklananlar.'}
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Segmented
          label="Dönem"
          value={period}
          onChange={setPeriod}
          options={[
            ['week', 'Bu hafta'],
            ['all', 'Tüm zamanlar'],
          ]}
        />
        <Segmented
          label="Kimler"
          value={scope}
          onChange={setScope}
          options={[
            ['global', 'Herkes'],
            ['friends', 'Arkadaşlar'],
          ]}
        />
        <div className="lg:ml-auto lg:w-72">
          <UserSearch placeholder="Birini bul" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {rows === null ? <StateBlock loading title="Sıralama yükleniyor" /> : null}
          {rows?.length === 0 ? (
            <StateBlock
              title={period === 'week' ? 'Bu hafta henüz kimse odaklanmadı' : 'Gösterilecek kimse yok'}
              description={period === 'week' ? 'İlk lambayı sen yak; haftanın ilk dakikaları burada görünür.' : scope === 'friends' ? 'Arkadaş ekledikçe burada sıralanırsınız.' : undefined}
              action={<Link to="/app/lobbies" className="font-semibold text-primary hover:underline">Bir odaya gir</Link>}
            />
          ) : null}

          {podium.length ? <Podium rows={podium} rewards={period === 'week' ? league?.rewards : undefined} meId={me?.id} /> : null}

          {rest.length ? (
            <ol className="mt-6 divide-y divide-border rounded-xl border border-border bg-surface" start={4}>
              {rest.map((row) => (
                <RankRow key={row.user.id} row={row} leaderMinutes={leaderMinutes} isMe={row.user.id === me?.id} />
              ))}
            </ol>
          ) : null}

          {myWeeklyRank ? (
            <p className="mt-4 rounded-lg border border-primary/30 bg-softIndigo px-4 py-3 text-[15px] text-textDark">
              Sen {myWeeklyRank.rank}. sıradasın; bu hafta {formatMinutes(myWeeklyRank.minutes)} odaklandın.
            </p>
          ) : null}
          {period === 'week' && league && !league.me && rows?.length ? (
            <p className="mt-4 text-[15px] text-textMuted">Bu hafta henüz odaklanmadın. Bir odada masaya geçtiğinde sıralamaya girersin.</p>
          ) : null}
        </div>

        <aside aria-labelledby="champions-title">
          <Surface className="p-5">
            <h2 id="champions-title" className="text-xl text-textDark">Geçen haftaların birincileri</h2>
            {champions.length === 0 ? (
              <p className="mt-2 text-[15px] text-textMuted">İlk hafta bitince birinci burada yazacak. Her pazartesi ilk üç ödül puanı alır.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {champions.map((week) => {
                  const winner = week.podium.find((entry) => entry.rank === 1);
                  if (!winner) return null;
                  return (
                    <li key={week.weekStart}>
                      <Link to={`/app/u/${winner.user.id}`} className="flex items-center gap-3 rounded-lg p-1 hover:bg-sunken">
                        <Avatar name={winner.user.fullName} image={winner.user.avatarUrl} frame={winner.user.equippedProfileFrame} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-textDark">{winner.user.fullName}</span>
                          <span className="block text-sm text-textMuted">
                            {shortDate.format(new Date(`${week.weekStart}T12:00:00`))} haftası, {formatMinutes(winner.minutes)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Surface>
        </aside>
      </div>
    </div>
  );
}

/** "5 – 11 Ekim haftası. Pazartesi 00:00'a 2 gün 4 saat kaldı; ilk üç 100, 60 ve 30 puan alır." */
function WeekLine({ league }: { league: WeeklyLeague }) {
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
    <>
      {start.getDate()} – {shortDate.format(end)} haftası. Lig pazartesi 00:00'da sıfırlanıyor, {left} kaldı. İlk üç {a}, {b} ve {c} Odak Puanı alır.
    </>
  );
}

/** İlk üç: 2-1-3 dizilişinde, lambası sıraya göre parlayan masalar. */
function Podium({ rows, rewards, meId }: { rows: Row[]; rewards?: number[]; meId?: number }) {
  const order = [rows[1], rows[0], rows[2]].filter(Boolean) as Row[];
  const height: Record<number, string> = { 1: 'pt-10 sm:pt-14', 2: 'pt-6 sm:pt-8', 3: 'pt-4 sm:pt-5' };
  return (
    <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="İlk üç">
      {order.map((row) => (
        <li key={row.user.id} className={`order-none ${row.rank === 1 ? 'sm:-mt-4' : ''}`}>
          <Link
            to={`/app/u/${row.user.id}`}
            className={`sl-desk-glow-${row.rank} flex flex-col items-center rounded-xl border border-border bg-surface px-2 pb-4 text-center transition hover:border-primary/50 sm:px-4 ${height[row.rank]} ${row.user.id === meId ? 'outline-2 outline-offset-2 outline-primary' : ''}`}
          >
            <LampMark lit className={row.rank === 1 ? 'h-9 w-9' : 'h-7 w-7'} />
            <span className="mt-3">
              <Avatar name={row.user.fullName} image={row.user.avatarUrl} frame={row.user.equippedProfileFrame} premium={row.user.isPremium} size={row.rank === 1 ? 'lg' : 'md'} />
            </span>
            <span className="mt-2 w-full truncate text-[15px] font-semibold text-textDark">{row.user.fullName}</span>
            <span className="font-display text-xl text-textDark sm:text-2xl">{formatMinutes(row.minutes)}</span>
            <span className="mt-1 text-sm text-textMuted">
              {row.rank}. sıra{rewards ? `, +${rewards[row.rank - 1]} puan` : ''}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function RankRow({ row, leaderMinutes, isMe }: { row: Row; leaderMinutes: number; isMe: boolean }) {
  const share = Math.max(2, Math.round((row.minutes / leaderMinutes) * 100));
  return (
    <li className={isMe ? 'bg-softIndigo' : ''}>
      <Link to={`/app/u/${row.user.id}`} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-sunken">
        <span className="text-right text-[15px] tabular-nums text-textMuted">{row.rank}</span>
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={row.user.fullName} image={row.user.avatarUrl} frame={row.user.equippedProfileFrame} premium={row.user.isPremium} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-textDark">
              {row.user.fullName}
              {isMe ? <span className="ml-1.5 text-sm font-normal text-primary">(sen)</span> : null}
            </span>
            <span className="mt-1 block h-1.5 max-w-56 rounded-full bg-sunken" aria-hidden="true">
              <span className="block h-1.5 rounded-full bg-primary/60" style={{ width: `${share}%` }} />
            </span>
          </span>
        </span>
        <span className="text-[15px] font-semibold tabular-nums text-textDark">{formatMinutes(row.minutes)}</span>
      </Link>
    </li>
  );
}

function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (value: T) => void; options: [T, string][] }) {
  return (
    <div className="inline-flex rounded-lg bg-sunken p-1" role="tablist" aria-label={label}>
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={`min-h-10 rounded-md px-4 text-[15px] font-semibold transition ${value === key ? 'bg-surface text-textDark shadow-sm' : 'text-textMuted hover:text-textDark'}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
