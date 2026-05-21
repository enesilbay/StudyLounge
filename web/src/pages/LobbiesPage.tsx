import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Crown, LockKeyhole, Moon, Plus, Search, Sun, UsersRound } from 'lucide-react';
import { ModalShell, Pill, StateBlock, Surface } from '../components/ui';
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
  const greeting = hour >= 18 || hour < 6 ? 'İyi Akşamlar' : 'İyi Çalışmalar';

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
      {/* Hero Banner */}
      <div className="mb-8 relative overflow-hidden rounded-3xl bg-textDark p-8 text-white shadow-xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary blur-3xl opacity-30" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-electric blur-3xl opacity-30" />
        
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3 text-primary/80">
              <GreetingIcon className="h-6 w-6 text-primary" />
              <span className="text-sm font-black uppercase tracking-wider">{greeting}</span>
            </div>
            <h1 className="text-3xl font-black md:text-4xl">
              Çalışmaya hazır mısın, {user?.fullName?.split(' ')[0] ?? 'Öğrenci'}?
            </h1>
            <p className="mt-3 text-lg font-semibold text-white/70">
              Şu an <strong className="text-white">{activeCount}</strong> öğrenci odak modunda. Hemen bir odaya katıl!
            </p>
          </div>
          
          <button onClick={openCreate} className="group relative inline-flex min-h-14 shrink-0 items-center gap-3 overflow-hidden rounded-xl bg-white px-6 font-black text-textDark transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <span className="relative z-10 flex items-center gap-2 text-base">
              <Plus className="h-5 w-5" />
              Yeni Oda Kur
            </span>
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-1 gap-3 overflow-x-auto pb-2 scrollbar-hide lg:pb-0">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-white text-textMuted hover:bg-background hover:text-textDark shadow-sm'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <Surface className="flex min-w-[300px] shrink-0 items-center gap-3 rounded-2xl p-3 shadow-sm border-border">
          <Search className="h-5 w-5 text-textMuted ml-1" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Çalışma odası ara..."
            className="w-full bg-transparent text-base font-bold outline-none placeholder:text-textMuted"
          />
        </Surface>
      </div>

      {error ? <Surface className="mb-4 p-4 text-base font-bold text-danger">{error}</Surface> : null}
      {isLoading ? <StateBlock loading title="Odalar yükleniyor" description="En aktif çalışma odaları listeleniyor..." /> : null}

      {!isLoading ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {visibleLobbies.map((lobby) => {
            const friendsInLobby = friends.filter((friend) => friend.currentRoom === lobby.name && friend.isOnline);
            return (
              <div
                key={lobby.id}
                className={`group relative overflow-hidden rounded-3xl border border-border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  lobby.isPremiumOnly ? 'border-accent/40 bg-gradient-to-br from-white to-lightAmber/30' : ''
                }`}
              >
                {lobby.isPremiumOnly && (
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/10 blur-2xl transition-all group-hover:bg-accent/20" />
                )}
                
                <div className="relative z-10 flex items-start gap-4">
                  <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${lobby.isPremiumOnly ? 'bg-lightAmber' : 'bg-softIndigo'}`}>
                    {lobby.isPremiumOnly ? <Crown className="h-7 w-7 text-accent" /> : lobby.isPrivate ? <LockKeyhole className="h-7 w-7 text-primary" /> : <UsersRound className="h-7 w-7 text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-black text-textDark">{lobby.name}</h2>
                      {lobby.isPremiumOnly ? <Pill tone="accent">Elite</Pill> : null}
                      {lobby.isPrivate ? <Pill tone="danger">Gizli</Pill> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-relaxed text-textMuted">{lobby.description || 'Sessiz ve odaklanmış bir çalışma ortamı.'}</p>
                  </div>
                </div>

                <div className="relative z-10 mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-background/50 p-3">
                  <div className="text-center">
                    <p className="text-xl font-black text-primary">{lobby.memberCount ?? 0}</p>
                    <p className="text-xs font-bold text-textMuted uppercase tracking-wider">Odada</p>
                  </div>
                  <div className="text-center border-l border-r border-border/50">
                    <p className="text-xl font-black text-success">{lobby.activeUsers ?? 0}</p>
                    <p className="text-xs font-bold text-textMuted uppercase tracking-wider">Odakta</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-textDark">{lobby.maxUsers ?? 50}</p>
                    <p className="text-xs font-bold text-textMuted uppercase tracking-wider">Kapasite</p>
                  </div>
                </div>

                <div className="relative z-10 mt-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-2 w-2 rounded-full ${friendsInLobby.length ? 'bg-success animate-pulse' : 'bg-textMuted'}`} />
                    <p className="truncate text-sm font-bold text-textDark">
                      {friendsInLobby.length ? (
                        <span><span className="text-success">{friendsInLobby[0].fullName.split(' ')[0]}</span> burada</span>
                      ) : (
                        <span className="text-textMuted">{lobby.category ?? 'Genel'}</span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => enterLobby(lobby)} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-textDark px-5 text-sm font-black text-white transition-all hover:bg-primary hover:shadow-lg hover:shadow-primary/30">
                    Odaya Gir
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
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
