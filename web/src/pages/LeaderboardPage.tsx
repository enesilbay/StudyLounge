import { useEffect, useState } from 'react';
import { Crown, Medal, Trophy } from 'lucide-react';
import { Avatar, PageHeader, Pill, Surface } from '../components/ui';
import { api } from '../lib/api';
import { unwrapData } from '../lib/apiResponses';
import type { User } from '../lib/types';

type Scope = 'global' | 'friends';

export default function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>('global');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadLeaderboard() {
      setIsLoading(true);
      const endpoint = scope === 'global' ? '/users/leaderboard' : '/users/friends-leaderboard';
      try {
        const response = await api.get<User[]>(endpoint);
        if (!ignore) {
          setUsers(unwrapData<User[]>(response.data));
        }
      } catch {
        if (!ignore) {
          setUsers([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadLeaderboard();
    return () => {
      ignore = true;
    };
  }, [scope]);

  const topUser = users[0];

  return (
    <div>
      <PageHeader
        eyebrow="Sıralama"
        title="Liderlik tablosu"
        description="Global ve arkadaş sıralaması gerçek kullanıcı verileriyle listelenir."
        action={
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-white p-1">
            <button
              onClick={() => setScope('global')}
              className={`rounded-lg px-4 py-2 text-base font-black ${scope === 'global' ? 'bg-softIndigo text-primary' : 'text-textMuted'}`}
            >
              Global
            </button>
            <button
              onClick={() => setScope('friends')}
              className={`rounded-lg px-4 py-2 text-base font-black ${scope === 'friends' ? 'bg-softIndigo text-primary' : 'text-textMuted'}`}
            >
              Arkadaşlar
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Surface className="overflow-hidden">
          <div className="grid grid-cols-[72px_minmax(0,1fr)_140px_130px] gap-4 border-b border-border bg-background px-5 py-3 text-base font-black uppercase text-textMuted max-md:hidden">
            <span>Sıra</span>
            <span>Öğrenci</span>
            <span>Odak</span>
            <span>Rütbe</span>
          </div>
          {users.map((user, index) => {
            const rank = index + 1;
            return (
              <div
                key={user.id}
                className={`grid grid-cols-[44px_minmax(0,1fr)] items-center gap-4 border-b border-border px-5 py-4 last:border-0 md:grid-cols-[72px_minmax(0,1fr)_140px_130px] ${
                  rank === 1 ? 'bg-lightAmber/60' : 'bg-white'
                }`}
              >
                <div className="flex items-center">
                  <RankIcon rank={rank} />
                </div>
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar name={user.fullName} image={user.avatarUrl} frame={user.equippedProfileFrame} premium={user.isPremium} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-textDark">
                      {user.fullName} {user.equippedIcon ?? ''}
                    </p>
                    <p className="truncate text-base font-bold text-textMuted">@{user.username ?? 'kullanici'}</p>
                  </div>
                </div>
                <p className="hidden text-lg font-black text-primary md:block">{user.totalFocusMinutes ?? 0}</p>
                <div className="hidden md:block">
                  <Pill tone={rank <= 3 ? 'accent' : 'primary'}>{rank <= 3 ? 'Usta' : 'Yükselen'}</Pill>
                </div>
              </div>
            );
          })}

          {!isLoading && users.length === 0 ? (
            <div className="p-6 text-base font-bold text-textMuted">Bu sıralamada gösterilecek kullanıcı yok.</div>
          ) : null}
          {isLoading ? <div className="p-6 text-base font-bold text-textMuted">Sıralama yükleniyor...</div> : null}
        </Surface>

        <Surface className="p-5">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-lightAmber text-accent">
            <Trophy className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-textDark">Haftanın vitrini</h2>
          <p className="mt-2 text-base font-semibold leading-6 text-textMuted">
            {topUser
              ? `${topUser.fullName}, ${topUser.totalFocusMinutes ?? 0} dakika ile şu an listenin başında.`
              : 'Liderlik tablosu doldukça en yüksek odak süresine sahip kullanıcı burada öne çıkar.'}
          </p>
          <div className="mt-5 space-y-3">
            <Pill tone="accent">Profil çerçeveleri destekli</Pill>
            <Pill tone="primary">Arkadaş filtresi aktif</Pill>
            <Pill tone="success">Canlı puan verisi</Pill>
          </div>
        </Surface>
      </div>
    </div>
  );
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white">
        <Crown className="h-5 w-5" />
      </span>
    );
  }
  if (rank <= 3) {
    return (
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-softIndigo text-primary">
        <Medal className="h-5 w-5" />
      </span>
    );
  }
  return <span className="grid h-10 w-10 place-items-center rounded-xl bg-background text-base font-black text-textMuted">{rank}</span>;
}
