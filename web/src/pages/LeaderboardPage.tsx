import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { api, assetUrl } from '../lib/api';
import AvatarWithFrame from '../components/UI/AvatarWithFrame';
import RankBadge from '../components/UI/RankBadge';
import { useAuthStore } from '../store/authStore';

interface LeaderboardUser {
  id: number;
  fullName: string;
  totalFocusMinutes: number;
  avatarUrl?: string;
  equippedProfileFrame?: string;
}

export default function LeaderboardPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get('/users/leaderboard');
        setUsers(res.data);
      } catch (err) {
        console.error('Liderlik tablosu yüklenemedi', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="pb-20 md:pb-0 max-w-3xl mx-auto">
      <header className="mb-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-lightAmber rounded-full flex items-center justify-center mb-4 shadow-sm">
          <Trophy className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-3xl font-black text-textDark mb-2">Liderlik Tablosu</h1>
        <p className="text-textMuted font-medium">Bu haftanın en çok odaklanan öğrencileri.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-border shadow-sm overflow-hidden">
          {users.map((user, idx) => {
            const rank = idx + 1;
            const isMe = currentUser?.id === user.id;

            return (
              <div key={user.id} className={`flex items-center justify-between p-4 px-6 border-b border-border last:border-0 ${isMe ? 'bg-softIndigo/30' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    rank === 1 ? 'bg-accent text-white shadow-sm' : 
                    rank === 2 ? 'bg-gray-300 text-white shadow-sm' :
                    rank === 3 ? 'bg-[#cd7f32] text-white shadow-sm' : 'bg-gray-100 text-textMuted'
                  }`}>
                    {rank}
                  </span>
                  
                  <AvatarWithFrame 
                    size={40} 
                    uri={user.avatarUrl ? assetUrl(user.avatarUrl) : null} 
                    name={user.fullName} 
                    frameId={user.equippedProfileFrame} 
                  />
                  
                  <div className="flex flex-col">
                    <span className="font-bold text-textDark text-base">{user.fullName}</span>
                    <RankBadge score={user.totalFocusMinutes} size={12} />
                  </div>
                </div>
                <div className="font-black text-primary text-xl flex flex-col items-end">
                  {user.totalFocusMinutes} <span className="text-[10px] text-textMuted font-bold">DAKİKA</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
