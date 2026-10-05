import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Notice, PageHeader, Surface, TextField, Toggle } from '../components/ui';
import { useStudyStore } from '../store/studyStore';
import { formatMinutes } from '../lib/study';
import { browserNotificationPermission, requestBrowserNotifications } from '../lib/browserNotify';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { getApiErrorMessage, unwrapUser } from '../lib/apiResponses';
import type { User } from '../lib/types';

function Input({
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  helper,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-semibold text-textDark">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base font-semibold outline-none focus:border-primary"
      />
      {helper ? <p className="mt-2 text-sm text-textMuted">{helper}</p> : null}
    </label>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, login, setUser, refreshUser, logout } = useAuthStore();
  
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    if (!editName.trim()) {
      setError('İsim boş olamaz.');
      return;
    }
    if (!editEmail.trim() || !editUsername.trim()) {
      setError('E-posta ve kullanıcı adı boş olamaz.');
      return;
    }
    if (!currentPassword) {
      setError('Değişiklikleri kaydetmek için mevcut şifreni yazmalısın.');
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
        currentPassword,
        ...(newPassword ? { newPassword } : {}),
      });
      const updatedUser = { ...unwrapUser<User>(profileResponse.data), ...unwrapUser<User>(settingsResponse.data) };
      const nextToken = settingsResponse.data?.access_token;
      
      if (nextToken) login(updatedUser, nextToken);
      else setUser(updatedUser);
      
      setCurrentPassword('');
      setNewPassword('');
      setStatus('Profil ayarları başarıyla güncellendi.');
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Hesabını yönet"
        title="Hesap Ayarları"
        action={
          <button onClick={() => navigate(-1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-base font-semibold text-textDark transition hover:bg-softIndigo">
            <ArrowLeft className="h-4 w-4" />
            Geri
          </button>
        }
      />

      {error ? <Surface className="mb-4 p-4 text-base font-semibold text-danger">{error}</Surface> : null}
      {status ? <Surface className="mb-4 p-4 text-base font-semibold text-primary">{status}</Surface> : null}

      <Surface className="p-5">
        <form onSubmit={saveProfile} className="space-y-4">
          <Input label="Ad Soyad" value={editName} onChange={setEditName} required />
          <Input label="Kullanıcı adı" value={editUsername} onChange={setEditUsername} required />
          <Input label="E-posta" value={editEmail} onChange={setEditEmail} type="email" required />
          
          <Surface className="border-accent/20 bg-accent/10 p-4">
            <p className="text-base font-semibold text-textDark">Premium durumu</p>
            <p className="mt-1 text-sm text-textMuted">{user.isPremium ? 'Premium özellikler açık.' : 'Premium özellikler kapalı.'}</p>
          </Surface>
          
          <Input label="Güvenlik Doğrulaması (Zorunlu)" value={currentPassword} onChange={setCurrentPassword} type="password" helper="Değişiklikleri kaydetmek için mevcut şifrenizi girmelisiniz." required />
          <div className="pt-2"></div>
          <Input label="Yeni Şifre (İsteğe Bağlı)" value={newPassword} onChange={setNewPassword} type="password" helper="Şifrenizi değiştirmek istemiyorsanız boş bırakın." />
          
          <div className="pt-2">
            <button disabled={isSaving} className="min-h-12 w-full rounded-xl bg-primary text-base font-semibold text-onPrimary disabled:opacity-60 transition hover:bg-secondary">
              {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
          <div className="pt-6 mt-6 border-t border-border">
            <button type="button" onClick={logout} className="min-h-12 w-full rounded-xl border border-danger/20 bg-softDanger text-base font-semibold text-danger transition hover:bg-danger/20">
              Hesaptan Çıkış Yap
            </button>
          </div>
        </form>
      </Surface>

      <GoalsCard />
      <BrowserNotificationsCard />
    </div>
  );
}

/** Günlük ve haftalık odak hedefi (dakika). Günlük hedef ilk tutulduğunda bonus puan verilir. */
function GoalsCard() {
  const goals = useStudyStore((state) => state.goals);
  const refreshGoals = useStudyStore((state) => state.refreshGoals);
  const updateGoals = useStudyStore((state) => state.updateGoals);
  const [daily, setDaily] = useState('');
  const [weekly, setWeekly] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    refreshGoals().catch(() => undefined);
  }, [refreshGoals]);

  // Sunucudan gelen değerler bir kez forma yazılır; kullanıcı düzenlerken üzerine yazılmaz.
  const [initialized, setInitialized] = useState(false);
  if (goals && !initialized) {
    setInitialized(true);
    setDaily(String(goals.dailyGoalMinutes));
    setWeekly(String(goals.weeklyGoalMinutes));
  }

  const save = async () => {
    const dailyGoalMinutes = Number(daily || 0);
    const weeklyGoalMinutes = Number(weekly || 0);
    if (!Number.isInteger(dailyGoalMinutes) || dailyGoalMinutes < 0 || dailyGoalMinutes > 720) {
      return setMessage({ tone: 'danger', text: 'Günlük hedef 0 ile 720 dakika arasında olmalı.' });
    }
    if (!Number.isInteger(weeklyGoalMinutes) || weeklyGoalMinutes < 0 || weeklyGoalMinutes > 5040) {
      return setMessage({ tone: 'danger', text: 'Haftalık hedef 0 ile 5040 dakika arasında olmalı.' });
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateGoals({ dailyGoalMinutes, weeklyGoalMinutes });
      setMessage({ tone: 'success', text: 'Hedeflerin kaydedildi.' });
    } catch (error) {
      setMessage({ tone: 'danger', text: getApiErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Surface className="mt-5 space-y-4 p-5">
      <div>
        <h2 className="text-xl text-textDark">Odak hedeflerin</h2>
        <p className="mt-1 text-sm text-textMuted">
          Günlük hedefi ilk tuttuğun gün {goals?.dailyGoalBonus ?? 25} Odak Puanı kazanırsın. 0 yazarsan hedef kapanır.
          {goals ? ` Bugün ${formatMinutes(goals.todayMinutes)}, bu hafta ${formatMinutes(goals.weekMinutes)} odaklandın.` : ''}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Günlük hedef (dakika)" type="number" value={daily} onChange={setDaily} placeholder="ör. 120" />
        <TextField label="Haftalık hedef (dakika)" type="number" value={weekly} onChange={setWeekly} placeholder="ör. 600" />
      </div>
      {message ? <Notice tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Notice> : null}
      <Button onClick={() => void save()} loading={saving}>
        Hedefleri kaydet
      </Button>
    </Surface>
  );
}

/** Sekme arka plandayken DM, dürtme ve düello için tarayıcı bildirimi izni. */
function BrowserNotificationsCard() {
  const [permission, setPermission] = useState(browserNotificationPermission);

  const description =
    permission === 'unsupported'
      ? 'Bu tarayıcı bildirimleri desteklemiyor.'
      : permission === 'denied'
        ? 'Bildirimler engellenmiş. Açmak için tarayıcının site ayarlarından izin ver.'
        : permission === 'granted'
          ? 'Açık. Kapatmak için tarayıcının site ayarlarını kullan.'
          : 'Sekme arka plandayken yeni mesaj, dürtme ve düello davetlerinde bildirim gelir.';

  return (
    <Surface className="mt-5 p-5">
      <Toggle
        label="Tarayıcı bildirimleri"
        description={description}
        checked={permission === 'granted'}
        disabled={permission === 'unsupported' || permission === 'denied' || permission === 'granted'}
        onChange={() => void requestBrowserNotifications().then(setPermission)}
      />
    </Surface>
  );
}
