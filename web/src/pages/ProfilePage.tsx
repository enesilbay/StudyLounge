import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Camera, Coins, Flame, Info, Mail, Settings, ShieldCheck, ShoppingCart, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { getApiErrorMessage, unwrapUser } from '../lib/apiResponses';
import type { User } from '../lib/types';
import { Avatar, IconTile, ModalShell, PageHeader, Pill, StateBlock, Surface } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const ranks = [
  { title: 'Çaylak', min: 0, max: 50 },
  { title: 'Odaklı', min: 50, max: 200 },
  { title: 'Akademisyen', min: 200, max: 500 },
  { title: 'Usta', min: 500, max: 1000 },
  { title: 'Efsane', min: 1000, max: null },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const { user, login, setUser, refreshUser, logout } = useAuthStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    setEditName(user.fullName ?? '');
    setEditEmail(user.email ?? '');
    setEditUsername(user.username ?? '');
  }, [user]);

  if (!user) return <StateBlock loading title="Profil yükleniyor" />;

  const score = user.totalFocusMinutes ?? 0;
  const rank = getRankInfo(score);
  const progress = getRankProgress(score);
  const badges = (user.badges ?? []).filter((badge) => badge.trim().length > 0);

  const uploadAvatar = async (file: File) => {
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post(`/users/avatar/${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(unwrapUser<User>(response.data));
      setStatus('Avatar güncellendi.');
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError));
    } finally {
      setIsUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editName.trim()) {
      setError('İsim boş olamaz.');
      return;
    }
    if (!editEmail.trim() || !editUsername.trim()) {
      setError('E-posta ve kullanıcı adı boş olamaz.');
      return;
    }
    if (newPassword && !currentPassword) {
      setError('Şifre değiştirmek için mevcut şifreni yazmalısın.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus(null);
    try {
      const profileResponse = await api.put(`/users/${user.id}/profile`, { fullName: editName.trim() });
      const settingsResponse = await api.put('/users/me/settings', {
        email: editEmail.trim(),
        username: editUsername.trim(),
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      const updatedUser = { ...unwrapUser<User>(profileResponse.data), ...unwrapUser<User>(settingsResponse.data) };
      const nextToken = settingsResponse.data?.access_token;
      if (nextToken) login(updatedUser, nextToken);
      else setUser(updatedUser);
      setCurrentPassword('');
      setNewPassword('');
      setSettingsOpen(false);
      setStatus('Profil ayarları güncellendi.');
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Odak kimliğin"
        title="Profil"
        description="Avatar, hesap ayarları, rozet ve rütbe akışları mobile ile aynı endpointleri kullanır."
        action={
          <div className="flex gap-2">
            <button onClick={() => setInfoOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-base font-black text-textDark transition hover:bg-softIndigo">
              <Info className="h-4 w-4" />
              Puan
            </button>
            <button onClick={() => setSettingsOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-base font-black text-textDark transition hover:bg-softIndigo">
              <Settings className="h-4 w-4" />
              Ayarlar
            </button>
          </div>
        }
      />

      {error ? <Surface className="mb-4 p-4 text-base font-bold text-danger">{error}</Surface> : null}
      {status ? <Surface className="mb-4 p-4 text-base font-bold text-primary">{status}</Surface> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
        <Surface className="overflow-hidden text-center">
          <div className="h-28 bg-gradient-to-br from-primary via-secondary to-electric" />
          <div className="-mt-16 px-5 pb-5">
            <div className="relative mx-auto w-fit">
              <button onClick={() => avatarInputRef.current?.click()} className="block rounded-full border-4 border-white">
                <Avatar name={user.fullName} image={user.avatarUrl} frame={user.equippedProfileFrame} size="xl" premium={user.isPremium} />
              </button>
              <button onClick={() => avatarInputRef.current?.click()} disabled={isUploading} className="absolute bottom-1 right-1 grid h-10 w-10 place-items-center rounded-full border-4 border-white bg-primary text-white disabled:opacity-70">
                <Camera className="h-4 w-4" />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadAvatar(event.target.files[0])} />
            </div>
            <h2 className="mt-4 text-2xl font-black text-textDark">
              {user.fullName} {user.equippedIcon ?? ''}
            </h2>
            <p className="mt-1 text-sm font-bold text-textMuted">@{user.username ?? 'ogrenci'}</p>
            <div className="mt-4 flex justify-center gap-2">
              {user.isPremium ? <Pill tone="accent">Premium aktif</Pill> : <Pill>Standart hesap</Pill>}
              {user.equippedProfileFrame && user.equippedProfileFrame !== 'none' ? <Pill tone="primary">Çerçeve aktif</Pill> : null}
            </div>
          </div>
        </Surface>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Metric icon={Award} label="Rütbe" value={rank.title} tone="accent" />
            <Metric icon={ShieldCheck} label="Odak Dk." value={String(score)} tone="primary" />
            <Metric icon={Flame} label="Günlük Seri" value={String(user.currentStreak ?? 0)} tone="danger" />
            <Metric icon={Coins} label="Bakiye" value={String(user.coins ?? 0)} tone="success" />
          </div>

          <Surface className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-textDark">Sonraki rütbe</h2>
                <p className="text-sm font-semibold text-textMuted">{progress.nextRank ?? 'Maksimum rütbe'}</p>
              </div>
              <Pill tone="primary">{Math.round(progress.percentage)}%</Pill>
            </div>
            <div className="h-5 overflow-hidden rounded-full bg-background shadow-inner">
              <div className="h-full rounded-full bg-gradient-to-r from-electric to-primary transition-all" style={{ width: `${progress.percentage}%` }} />
            </div>
            <p className="mt-2 text-sm font-bold text-textMuted">{progress.nextRank ? `${progress.current} / ${progress.total} dakika` : 'Tüm rütbeler tamamlandı.'}</p>
          </Surface>

          <Surface className="p-4">
            <h2 className="text-lg font-black text-textDark">Kazanılan Rozetler</h2>
            {badges.length ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {badges.map((badge) => (
                  <div key={badge} className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
                    <IconTile icon={ShieldCheck} tone="accent" />
                    <p className="font-black text-textDark">{badge}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-border bg-background p-4 text-sm font-semibold text-textMuted">Henüz rozet kazanılmadı.</p>
            )}
          </Surface>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button onClick={() => navigate('/app/shop')} className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-primary px-5 text-base font-black text-white transition hover:bg-secondary">
              <ShoppingCart className="h-5 w-5" />
              Mağazaya Git
            </button>
            <button onClick={() => navigate(user.isPremium ? '/app/analytics' : '/app/premium')} className="flex min-h-14 items-center justify-center gap-3 rounded-xl border border-border bg-white px-5 text-base font-black text-textDark transition hover:bg-softIndigo">
              {user.isPremium ? 'Analitik paneline git' : 'Analitik için PRO gerekli'}
            </button>
          </div>

          <Surface className="p-4">
            <h2 className="text-lg font-black text-textDark">Hesap bilgileri</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoRow icon={UserRound} label="Kullanıcı adı" value={`@${user.username ?? 'ogrenci'}`} />
              <InfoRow icon={Mail} label="E-posta" value={user.email ?? '-'} />
            </div>
          </Surface>
        </div>
      </div>

      <ModalShell open={settingsOpen} title="Hesap ayarları" onClose={() => setSettingsOpen(false)}>
        <form onSubmit={saveProfile} className="space-y-4">
          <Input label="Ad Soyad" value={editName} onChange={setEditName} required />
          <Input label="Kullanıcı adı" value={editUsername} onChange={setEditUsername} required />
          <Input label="E-posta" value={editEmail} onChange={setEditEmail} type="email" required />
          <Surface className="border-accent/20 bg-accent/10 p-4">
            <p className="text-base font-black text-textDark">Premium durumu</p>
            <p className="mt-1 text-sm font-semibold text-textMuted">{user.isPremium ? 'Premium özellikler açık.' : 'Premium özellikler kapalı.'}</p>
          </Surface>
          <Input label="Mevcut şifre" value={currentPassword} onChange={setCurrentPassword} type="password" />
          <Input label="Yeni şifre" value={newPassword} onChange={setNewPassword} type="password" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={() => setSettingsOpen(false)} className="min-h-12 rounded-xl border border-border bg-background text-base font-black text-textDark">İptal</button>
            <button disabled={isSaving} className="min-h-12 rounded-xl bg-primary text-base font-black text-white disabled:opacity-60">{isSaving ? 'Kaydediliyor' : 'Kaydet'}</button>
          </div>
          <button type="button" onClick={logout} className="min-h-12 w-full rounded-xl border border-danger/20 bg-softDanger text-base font-black text-danger">Çıkış Yap</button>
        </form>
      </ModalShell>

      <ModalShell open={infoOpen} title="Puan nasıl kazanılır?" description="Odak puanın çalışma odalarında masada kaldığın süreye göre artar." onClose={() => setInfoOpen(false)}>
        <div className="space-y-3">
          <InfoCard title="Pomodoro başlat" text="Bir çalışma odasına girip zamanlayıcıyı çalıştır." />
          <InfoCard title="Odakta kal" text="Web'de odak modu açık kaldıkça mobile ile aynı presence mantığı çalışır." />
          <InfoCard title="Elite odalarda x2" text="Elite odalarda aynı süre iki kat puan olarak hesabına işlenir." />
        </div>
      </ModalShell>
    </div>
  );
}

function getRankInfo(points: number) {
  return ranks.find((rank) => rank.max === null || (points >= rank.min && points < rank.max)) ?? ranks[0];
}

function getRankProgress(points: number) {
  const rank = getRankInfo(points);
  if (rank.max === null) return { current: points, total: points || 1, percentage: 100, nextRank: null as string | null };
  const current = Math.max(0, points - rank.min);
  const total = rank.max - rank.min;
  const nextRank = ranks[ranks.findIndex((item) => item.title === rank.title) + 1]?.title ?? null;
  return { current, total, percentage: Math.min(100, (current / total) * 100), nextRank };
}

function Metric({ icon, label, value, tone }: { icon: typeof Award; label: string; value: string; tone: 'primary' | 'accent' | 'danger' | 'success' }) {
  return (
    <Surface className="p-4">
      <IconTile icon={icon} tone={tone} />
      <p className="mt-3 text-xl font-black text-textDark">{value}</p>
      <p className="text-sm font-bold text-textMuted">{label}</p>
    </Surface>
  );
}

function InfoRow({ icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
      <Icon className="h-5 w-5 text-primary" />
      <div>
        <p className="text-xs font-black uppercase text-textMuted">{label}</p>
        <p className="text-sm font-bold text-textDark">{value}</p>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-black text-textDark">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base font-bold outline-none" />
    </label>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-base font-black text-textDark">{title}</p>
      <p className="mt-1 text-sm font-semibold text-textMuted">{text}</p>
    </div>
  );
}
