import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ban, Bell, Crown, KeyRound, LogOut, ShieldAlert, Trash2, UserRound } from 'lucide-react';
import { Avatar, Button, ModalShell, Notice, TextField, Toggle } from '../components/ui';
import { AppPage, Card, Rise, actionButton, inputClass, outlineButton } from '../components/app/Kit';
import type { Tile } from '../components/app/Kit';
import { browserNotificationPermission, requestBrowserNotifications } from '../lib/browserNotify';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { getApiErrorMessage, unwrapUser } from '../lib/apiResponses';
import type { User } from '../lib/types';

/** Her bölümün kendi pastel tonu: menüde, kart başlığında ve kart üstündeki ışıltıda aynı ton kullanılır. */
const SECTION_TONE: Record<string, { tile: Tile; wash: string }> = {
  hesap: { tile: 'bg-mb-tile-1', wash: 'from-mb-tile-1/60' },
  guvenlik: { tile: 'bg-mb-tile-2', wash: 'from-mb-tile-2/60' },
  bildirimler: { tile: 'bg-mb-tile-5', wash: 'from-mb-tile-5/60' },
  engellenenler: { tile: 'bg-mb-tile-4', wash: 'from-mb-tile-4/60' },
};

const sections = [
  { id: 'hesap', label: 'Hesap', icon: UserRound },
  { id: 'guvenlik', label: 'Güvenlik', icon: KeyRound },
  { id: 'bildirimler', label: 'Bildirimler', icon: Bell },
  { id: 'engellenenler', label: 'Engellenenler', icon: Ban },
  { id: 'hesabi-sil', label: 'Hesabı sil', icon: Trash2 },
];

function Field({ label, type = 'text', value, onChange, required = false, helper, autoComplete }: { label: string; type?: string; value: string; onChange: (value: string) => void; required?: boolean; helper?: string; autoComplete?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-mb-ink">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} autoComplete={autoComplete} className={inputClass} />
      {helper ? <span className="mt-1.5 block text-[13px] text-mb-body">{helper}</span> : null}
    </label>
  );
}

/** Ayar bölümü: başlık, kısa açıklama ve içerik; menüden bu kimlikle atlanır. */
function Section({ id, icon: Icon, title, description, delay, children, danger = false }: { id: string; icon: typeof UserRound; title: string; description?: string; delay: number; children: ReactNode; danger?: boolean }) {
  return (
    <Rise delay={delay} as="section">
      <Card className={`scroll-mt-24 overflow-hidden bg-gradient-to-br to-mb-card to-45% p-5 md:p-6 ${danger ? 'from-softDanger' : (SECTION_TONE[id]?.wash ?? 'from-mb-tint')}`}>
        <div id={id} className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] shadow-mb-card ${danger ? 'bg-softDanger text-danger' : `${SECTION_TONE[id]?.tile ?? 'bg-mb-tint'} text-mb-ink`}`}>
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-mb-display text-lg font-medium tracking-[-0.02em] text-mb-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-mb-body">{description}</p> : null}
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </Card>
    </Rise>
  );
}

export default function SettingsPage() {
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

    if (!editName.trim()) return setError('İsim boş olamaz.');
    if (!editEmail.trim() || !editUsername.trim()) return setError('E-posta ve kullanıcı adı boş olamaz.');
    if (!currentPassword) return setError('Değişiklikleri kaydetmek için mevcut şifreni yazmalısın.');

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
      setStatus('Ayarların kaydedildi.');
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AppPage title="Ayarlar">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        {/* Bölüm menüsü (geniş ekran) */}
        <Rise as="div" className="hidden lg:block">
          <nav aria-label="Ayar bölümleri" className="sticky top-24 space-y-1">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="group flex min-h-11 items-center gap-2.5 rounded-[12px] px-2 text-sm font-medium text-mb-body transition hover:bg-mb-surface hover:text-mb-ink">
                <span className={`grid h-8 w-8 place-items-center rounded-[10px] text-mb-ink transition-transform group-hover:scale-110 group-hover:-rotate-6 ${SECTION_TONE[section.id]?.tile ?? 'bg-softDanger text-danger'}`}>
                  <section.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {section.label}
              </a>
            ))}
          </nav>
        </Rise>

        <div className="max-w-2xl space-y-4">
          {error ? <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice> : null}
          {status ? <Notice tone="success" onDismiss={() => setStatus(null)}>{status}</Notice> : null}

          <form onSubmit={saveProfile} className="space-y-4">
            <Section id="hesap" icon={UserRound} title="Hesap" description="Adın, kullanıcı adın ve e-postan." delay={0.05}>
              <div className="mb-5 flex items-center gap-3 rounded-[14px] bg-mb-card/80 p-3 shadow-mb-card">
                <Avatar name={user.fullName} image={user.avatarUrl} frame={user.equippedProfileFrame} premium={user.isPremium} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-mb-ink">{editName || user.fullName}</p>
                  <p className="truncate text-[13px] text-mb-body">@{editUsername || user.username}</p>
                </div>
                <Link to="/app/premium" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${user.isPremium ? 'bg-mb-tint text-mb-action' : 'bg-mb-card text-mb-body hover:text-mb-ink'}`}>
                  <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                  {user.isPremium ? 'Premium açık' : 'Standart hesap'}
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Ad soyad" value={editName} onChange={setEditName} required autoComplete="name" />
                </div>
                <Field label="Kullanıcı adı" value={editUsername} onChange={setEditUsername} required autoComplete="username" />
                <Field label="E-posta" value={editEmail} onChange={setEditEmail} type="email" required autoComplete="email" />
              </div>
            </Section>

            <Section id="guvenlik" icon={KeyRound} title="Güvenlik" description="Değişiklikleri kaydetmek için mevcut şifren gerekir." delay={0.1}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mevcut şifre" value={currentPassword} onChange={setCurrentPassword} type="password" required autoComplete="current-password" />
                <Field label="Yeni şifre (isteğe bağlı)" value={newPassword} onChange={setNewPassword} type="password" helper="Değiştirmek istemiyorsan boş bırak." autoComplete="new-password" />
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={logout} className={outlineButton}>
                  <LogOut className="h-4 w-4" />
                  Çıkış yap
                </button>
                <button disabled={isSaving} className={actionButton}>
                  {isSaving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
                </button>
              </div>
            </Section>
          </form>

          <BrowserNotificationsCard />
          <BlockedUsersCard />
          {user.username ? <DeleteAccountCard username={user.username} /> : null}
        </div>
      </div>
    </AppPage>
  );
}

/** Hesabı kalıcı olarak silme. Onay için kullanıcı adı ve (varsa) şifre istenir. */
function DeleteAccountCard({ username }: { username: string }) {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (deleting) return;
    setOpen(false);
    setConfirmation('');
    setPassword('');
    setError(null);
  }, [deleting]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (confirmation.trim() !== username) return setError(`Onay için kullanıcı adını aynen yaz: ${username}`);
    setDeleting(true);
    setError(null);
    try {
      await api.delete('/users/me', { data: { confirmation: confirmation.trim(), ...(password ? { password } : {}) } });
      logout();
      navigate('/', { replace: true });
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
      setDeleting(false);
    }
  };

  return (
    <Section id="hesabi-sil" icon={ShieldAlert} title="Hesabı sil" delay={0.25} danger>
      <p className="text-sm text-mb-body">
        Hesabın, çalışma geçmişin, derslerin, görevlerin, arkadaşlıkların ve özel mesajların kalıcı olarak silinir. Odalarda yazdığın mesajlar kalır ama adın görünmez. Bu işlem geri alınamaz.
      </p>
      <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[12px] border border-danger/30 bg-softDanger px-4 text-[15px] font-medium text-danger transition hover:bg-danger/15">
        <Trash2 className="h-4 w-4" />
        Hesabımı sil
      </button>

      <ModalShell open={open} title="Hesabını silmek istediğine emin misin?" description="Bu işlem geri alınamaz." onClose={close}>
        <form onSubmit={submit} className="space-y-4">
          <TextField label={`Onaylamak için kullanıcı adını yaz: ${username}`} value={confirmation} onChange={setConfirmation} required />
          <TextField label="Şifren" type="password" value={password} onChange={setPassword} helper="Hesabı yalnızca Google ile açtıysan ve şifre belirlemediysen boş bırak." />
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={close} disabled={deleting}>
              Vazgeç
            </Button>
            <Button type="submit" variant="danger" loading={deleting} disabled={confirmation.trim() !== username}>
              Hesabımı kalıcı olarak sil
            </Button>
          </div>
        </form>
      </ModalShell>
    </Section>
  );
}

type BlockedEntry = { id: number; blocked: Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl' | 'equippedProfileFrame'> };

/** Engellediğin kişiler; engel kaldırılınca yeniden mesaj ve istek gönderebilirler. */
function BlockedUsersCard() {
  const [entries, setEntries] = useState<BlockedEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<BlockedEntry[]>('/moderation/blocks')
      .then((response) => setEntries(response.data))
      .catch(() => setEntries([]));
  }, []);

  const unblock = async (userId: number) => {
    setError(null);
    try {
      await api.delete(`/moderation/blocks/${userId}`);
      setEntries((current) => current?.filter((entry) => entry.blocked.id !== userId) ?? null);
    } catch (unblockError) {
      setError(getApiErrorMessage(unblockError));
    }
  };

  return (
    <Section id="engellenenler" icon={Ban} title="Engellenenler" description="Engellediğin kişi sana mesaj, düello, dürtme ya da arkadaşlık isteği gönderemez." delay={0.2}>
      {error ? <div className="mb-3"><Notice tone="danger">{error}</Notice></div> : null}
      {entries?.length === 0 ? <p className="rounded-[12px] bg-mb-surface px-4 py-3 text-sm text-mb-body">Kimseyi engellemedin.</p> : null}
      <ul className="divide-y divide-mb-line">
        {entries?.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 py-2.5">
            <Avatar name={entry.blocked.fullName} image={entry.blocked.avatarUrl} frame={entry.blocked.equippedProfileFrame} size="sm" />
            <Link to={`/app/u/${entry.blocked.id}`} className="min-w-0 flex-1 hover:underline">
              <span className="block truncate font-medium text-mb-ink">{entry.blocked.fullName}</span>
              <span className="block truncate text-[13px] text-mb-body">@{entry.blocked.username}</span>
            </Link>
            <button type="button" onClick={() => void unblock(entry.blocked.id)} className={`${outlineButton} min-h-9 text-sm`}>
              Engeli kaldır
            </button>
          </li>
        ))}
      </ul>
    </Section>
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
    <Section id="bildirimler" icon={Bell} title="Bildirimler" delay={0.15}>
      <Toggle
        label="Tarayıcı bildirimleri"
        description={description}
        checked={permission === 'granted'}
        disabled={permission === 'unsupported' || permission === 'denied' || permission === 'granted'}
        onChange={() => void requestBrowserNotifications().then(setPermission)}
      />
    </Section>
  );
}
