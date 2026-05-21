import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Crown, LockKeyhole, Moon, Plus, Search, Sparkles, Sun, UsersRound } from 'lucide-react';
import { Avatar, IconTile, ModalShell, PageHeader, Pill, StateBlock, Surface } from '../components/ui';
import { api } from '../lib/api';
import { getApiErrorMessage, unwrapData } from '../lib/apiResponses';
import type { Lobby } from '../lib/types';
import { useAuthStore } from '../store/authStore';

const categories = [
  'Tümü',
  'Bilgisayar Bilimi',
  'Tıp & Sağlık',
  'Hukuk',
  'Sınav Hazırlık',
  'Yabancı Dil',
  'Tasarım & Sanat',
  'Mühendislik',
  'İşletme & Ekonomi',
  'Fen Bilimleri',
  'Genel',
];

const roomCategories = categories.filter((category) => category !== 'Tümü');

export default function LobbiesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [query, setQuery] = useState('');
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [friends, setFriends] = useState<Array<{ currentRoom?: string | null; isOnline?: boolean; fullName: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Genel');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPremiumOnly, setIsPremiumOnly] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);
  const [enterPassword, setEnterPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [lobbyResponse, friendsResponse] = await Promise.all([
        api.get<Lobby[]>('/lobbies'),
        api.get('/users/friends/0').catch(() => ({ data: [] })),
      ]);
      setLobbies(unwrapData<Lobby[]>(lobbyResponse.data));
      setFriends(Array.isArray(friendsResponse.data) ? friendsResponse.data : unwrapData(friendsResponse.data));
      void refreshUser();
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleLobbies = useMemo(() => {
    return lobbies.filter((lobby) => {
      const categoryMatch = selectedCategory === 'Tümü' || lobby.category === selectedCategory;
      const haystack = `${lobby.name} ${lobby.description ?? ''}`.toLowerCase();
      return categoryMatch && haystack.includes(query.toLowerCase());
    });
  }, [lobbies, query, selectedCategory]);

  const activeCount = lobbies.reduce((sum, lobby) => sum + (lobby.memberCount ?? 0), 0);
  const eliteCount = lobbies.filter((lobby) => lobby.isPremiumOnly).length;
  const hour = new Date().getHours();
  const GreetingIcon = hour >= 18 || hour < 6 ? Moon : Sun;
  const greeting = hour >= 18 || hour < 6 ? 'İyi akşamlar' : 'İyi çalışmalar';

  const openCreate = () => {
    if (!user?.isPremium) {
      navigate('/app/premium');
      return;
    }
    setCreateOpen(true);
  };

  const createLobby = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newName.trim()) {
      setError('Lütfen bir lobi ismi girin.');
      return;
    }
    if (isPrivate && !roomPassword.trim()) {
      setError('Lütfen gizli oda için bir şifre belirleyin.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await api.post('/lobbies', {
        name: newName.trim(),
        description: newDesc.trim(),
        category: newCategory,
        icon: isPremiumOnly ? 'crown' : 'users',
        isPrivate,
        isPremiumOnly,
        password: isPrivate ? roomPassword : undefined,
        maxUsers: isPrivate ? (user?.isPremium ? 5 : 2) : 50,
      });
      setCreateOpen(false);
      setNewName('');
      setNewDesc('');
      setNewCategory('Genel');
      setIsPrivate(false);
      setIsPremiumOnly(false);
      setRoomPassword('');
      await loadData();
    } catch (createError) {
      setError(getApiErrorMessage(createError));
    } finally {
      setCreating(false);
    }
  };

  const enterLobby = (lobby: Lobby) => {
    if (lobby.isPremiumOnly && !user?.isPremium) {
      navigate('/app/premium');
      return;
    }
    if (lobby.isPrivate) {
      setSelectedLobby(lobby);
      setPasswordOpen(true);
      return;
    }
    navigate(`/app/focus/${lobby.id}`);
  };

  const verifyPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLobby) return;
    if (!enterPassword.trim()) {
      setError('Lütfen şifre girin.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await api.post('/lobbies/verify-password', { lobbyId: selectedLobby.id, password: enterPassword });
      setPasswordOpen(false);
      setEnterPassword('');
      navigate(`/app/focus/${selectedLobby.id}`);
    } catch (verifyError) {
      setError(getApiErrorMessage(verifyError));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`${greeting}, ${user?.fullName?.split(' ')[0] ?? 'Öğrenci'}`}
        description="Odalar, arkadaşların ve odak akışların mobile uygulamayla aynı backend contractları üzerinden yönetilir."
        action={
          <button onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-base font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-secondary hover:shadow-md">
            <Plus className="h-4 w-4" />
            Oda Kur
          </button>
        }
      />

      <Surface className="mb-4 overflow-hidden">
        <div className="grid gap-4 bg-gradient-to-r from-primary via-secondary to-electric p-5 text-white md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-accent">
              <GreetingIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black uppercase text-white/70">Bugünkü çalışma alanın</p>
              <p className="mt-1 text-xl font-black">Odaklanmaya hazır {visibleLobbies.length} oda var.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Summary label="Oda" value={lobbies.length} />
            <Summary label="Aktif" value={activeCount} />
            <Summary label="Elite" value={eliteCount} />
          </div>
        </div>
      </Surface>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Surface className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Çalışma odası bul..." className="min-h-12 w-full rounded-xl border border-border bg-white px-4 pl-11 text-base font-semibold outline-none transition focus:border-electric focus:ring-4 focus:ring-electric/10" />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition ${
                  selectedCategory === category ? 'border-primary bg-primary text-white shadow-sm' : 'border-border bg-white/70 text-textMuted hover:border-electric/40 hover:bg-softIndigo hover:text-primary'
                }`}
              >
                {category === 'Tümü' ? <Sparkles className="h-4 w-4" /> : null}
                {category}
              </button>
            ))}
          </div>
        </Surface>

        <Surface className="p-4">
          <div className="flex items-center gap-4">
            <Avatar name={user?.fullName ?? 'StudyLounge'} image={user?.avatarUrl} frame={user?.equippedProfileFrame} premium={user?.isPremium} />
            <div>
              <p className="text-base font-black text-textDark">Bugünkü durum</p>
              <p className="text-sm font-semibold text-textMuted">{user?.currentStreak ?? 0} günlük seri devam ediyor.</p>
            </div>
          </div>
        </Surface>
      </div>

      {error ? <Surface className="mb-4 p-4 text-base font-bold text-danger">{error}</Surface> : null}
      {isLoading ? <StateBlock loading title="Lobiler yükleniyor" description="Mobile ile aynı /lobbies endpointinden veriler alınıyor." /> : null}

      {!isLoading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visibleLobbies.map((lobby) => {
            const friendsInLobby = friends.filter((friend) => friend.currentRoom === lobby.name && friend.isOnline);
            return (
              <Surface key={lobby.id} className={`p-4 transition hover:-translate-y-0.5 hover:shadow-md ${lobby.isPremiumOnly ? 'border-accent/40 bg-accent/5' : ''}`}>
                <div className="flex items-start gap-4">
                  <IconTile icon={lobby.isPremiumOnly ? Crown : lobby.isPrivate ? LockKeyhole : UsersRound} tone={lobby.isPremiumOnly ? 'accent' : 'primary'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-textDark">{lobby.name}</h2>
                      {lobby.isPremiumOnly ? <Pill tone="accent">Elite</Pill> : null}
                      {lobby.isPrivate ? <Pill>Gizli</Pill> : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-textMuted">{lobby.description || 'Odaklanmak için hazır bir çalışma odası.'}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <Stat value={lobby.memberCount ?? 0} label="Odada" tone="primary" />
                  <Stat value={lobby.activeUsers ?? 0} label="Odak" tone="success" />
                  <Stat value={lobby.maxUsers ?? 50} label="Kapasite" tone="accent" />
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase text-textMuted">{lobby.category ?? 'Genel'}</p>
                    <p className="mt-1 truncate text-sm font-bold text-textDark">{friendsInLobby.length ? `${friendsInLobby[0].fullName.split(' ')[0]} burada` : 'Arkadaş bekleniyor'}</p>
                  </div>
                  <button onClick={() => enterLobby(lobby)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-base font-black text-white transition hover:bg-secondary">
                    Gir
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </Surface>
            );
          })}
        </div>
      ) : null}

      {!isLoading && visibleLobbies.length === 0 ? <StateBlock title="Henüz lobi yok" description="İlk çalışma odasını sen kur veya arama filtreni değiştir." /> : null}

      <ModalShell open={createOpen} title="Yeni Çalışma Odası" description="Mobile uygulamadaki oda kurma formuyla aynı alanlar kullanılır." onClose={() => setCreateOpen(false)}>
        <form onSubmit={createLobby} className="space-y-4">
          <Input label="Oda İsmi" value={newName} onChange={setNewName} required />
          <label className="block">
            <span className="mb-2 block text-base font-black text-textDark">Kategori Seç</span>
            <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base font-bold outline-none">
              {roomCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-base font-black text-textDark">Açıklama</span>
            <textarea value={newDesc} onChange={(event) => setNewDesc(event.target.value)} className="min-h-24 w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold outline-none" />
          </label>
          <Toggle label="Gizli Oda" checked={isPrivate} onChange={setIsPrivate} />
          {user?.isPremium ? <Toggle label="Elite Oda" checked={isPremiumOnly} onChange={setIsPremiumOnly} /> : null}
          {isPrivate ? <Input label="Oda Şifresi" value={roomPassword} onChange={setRoomPassword} type="password" required helper={`Gizli odalar ${user?.isPremium ? 'Premium olduğun için en fazla 5' : 'ücretsiz planda en fazla 2'} kişiliktir.`} /> : null}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="min-h-12 rounded-xl border border-border bg-background text-base font-black text-textDark">İptal</button>
            <button disabled={creating} className="min-h-12 rounded-xl bg-primary text-base font-black text-white disabled:opacity-60">{creating ? 'Oluşturuluyor' : 'Oluştur'}</button>
          </div>
        </form>
      </ModalShell>

      <ModalShell open={passwordOpen} title="Gizli Oda" description={`"${selectedLobby?.name ?? ''}" odasına girmek için şifreyi gir.`} onClose={() => setPasswordOpen(false)}>
        <form onSubmit={verifyPassword} className="space-y-4">
          <Input label="Şifre" value={enterPassword} onChange={setEnterPassword} type="password" required />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={() => setPasswordOpen(false)} className="min-h-12 rounded-xl border border-border bg-background text-base font-black text-textDark">İptal</button>
            <button disabled={verifying} className="min-h-12 rounded-xl bg-primary text-base font-black text-white disabled:opacity-60">{verifying ? 'Kontrol ediliyor' : 'Giriş Yap'}</button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/12 p-3 text-center backdrop-blur">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-xs font-bold text-white/70">{label}</p>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: 'primary' | 'success' | 'accent' }) {
  const text = { primary: 'text-primary', success: 'text-success', accent: 'text-accentDark' };
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className={`text-lg font-black ${text[tone]}`}>{value}</p>
      <p className="text-sm font-bold text-textMuted">{label}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, helper }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; helper?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-black text-textDark">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base font-bold outline-none" />
      {helper ? <span className="mt-1 block text-sm font-bold text-textMuted">{helper}</span> : null}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
      <span className="text-base font-black text-textDark">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-primary" />
    </label>
  );
}
