import { Settings, Coins } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import AvatarWithFrame from '../components/UI/AvatarWithFrame';
import RankBadge from '../components/UI/RankBadge';
import { assetUrl } from '../lib/api';

export default function ProfilePage() {
  const { user } = useAuthStore();

  if (!user) {
    return <div>Yükleniyor...</div>;
  }

  const focusMinutes = user.totalFocusMinutes || 0;
  const avatarUri = user.avatarUrl ? assetUrl(user.avatarUrl) : null;

  return (
    <div>
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-textDark mb-2">Profilin</h1>
          <p className="text-textMuted font-medium">Gelişimini ve istatistiklerini buradan takip edebilirsin.</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-textMuted hover:bg-gray-50">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <div className="bg-white rounded-[24px] p-8 border border-border shadow-sm flex flex-col items-center mb-8">
        <div className="mb-4">
          <AvatarWithFrame 
            size={120} 
            uri={avatarUri} 
            name={user.fullName} 
            frameId={user.equippedProfileFrame} 
          />
        </div>
        <h2 className="text-2xl font-black text-textDark mb-2 flex items-center gap-2">
          {user.fullName} {user.isPremium && <span className="text-accent text-sm ml-1">PRO</span>}
        </h2>
        <RankBadge score={focusMinutes} size={20} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[24px] border border-border shadow-sm">
          <h3 className="text-textMuted font-bold mb-2">Toplam Odak</h3>
          <p className="text-3xl font-black text-primary">
            {Math.floor(focusMinutes / 60)} sa {focusMinutes % 60} dk
          </p>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-border shadow-sm">
          <h3 className="text-textMuted font-bold mb-2">Odak Puanı</h3>
          <p className="text-3xl font-black text-accent">{focusMinutes}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-border shadow-sm">
          <h3 className="text-textMuted font-bold mb-2 flex items-center gap-2">
            <Coins className="w-5 h-5 text-warning" /> Jeton
          </h3>
          <p className="text-3xl font-black text-warning">{user.coins || 0}</p>
        </div>
      </div>
    </div>
  );
}
