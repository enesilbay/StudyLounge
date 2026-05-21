import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Surface } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { getApiErrorMessage, unwrapUser } from '../lib/apiResponses';
import type { User } from '../lib/types';

function Input({ label, type = 'text', value, onChange, required, helper }: any) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-black text-textDark">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base font-bold outline-none focus:border-primary"
      />
      {helper ? <p className="mt-2 text-sm font-semibold text-textMuted">{helper}</p> : null}
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
        onBack={() => navigate(-1)}
      />

      {error ? <Surface className="mb-4 p-4 text-base font-bold text-danger">{error}</Surface> : null}
      {status ? <Surface className="mb-4 p-4 text-base font-bold text-primary">{status}</Surface> : null}

      <Surface className="p-5">
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
          
          <div className="pt-2">
            <button disabled={isSaving} className="min-h-12 w-full rounded-xl bg-primary text-base font-black text-white disabled:opacity-60 transition hover:bg-secondary">
              {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
          <div className="pt-6 mt-6 border-t border-border">
            <button type="button" onClick={logout} className="min-h-12 w-full rounded-xl border border-danger/20 bg-softDanger text-base font-black text-danger transition hover:bg-danger/20">
              Hesaptan Çıkış Yap
            </button>
          </div>
        </form>
      </Surface>
    </div>
  );
}
