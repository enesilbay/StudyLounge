import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, LockKeyhole, Plus, Search, Video } from 'lucide-react';
import { Button, ModalShell, Notice, StateBlock, TextField, Toggle } from '../components/ui';
import { api } from '../lib/api';
import { getApiErrorMessage, unwrapData } from '../lib/apiResponses';
import type { Lobby } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import PlansSection from '../components/plans/PlansSection';

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

// Backend ile aynı sınır (lobbies.service.ts → MAX_VIDEO_ROOM_USERS)
const MAX_VIDEO_ROOM_USERS = 6;
const MAX_LAMPS = 10;

type FriendPresence = { currentRoom?: string | null; isOnline?: boolean; fullName: string };

export default function LobbiesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [query, setQuery] = useState('');
  const [videoOnly, setVideoOnly] = useState(false);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [friends, setFriends] = useState<FriendPresence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Genel');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPremiumOnly, setIsPremiumOnly] = useState(false);
  const [allowVideo, setAllowVideo] = useState(false);
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
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return lobbies.filter((lobby) => {
      if (selectedCategory !== 'Tümü' && lobby.category !== selectedCategory) return false;
      if (videoOnly && !lobby.allowVideo) return false;
      return `${lobby.name} ${lobby.description ?? ''}`.toLocaleLowerCase('tr-TR').includes(needle);
    });
  }, [lobbies, query, selectedCategory, videoOnly]);

  const totalInRooms = lobbies.reduce((sum, lobby) => sum + (lobby.memberCount ?? 0), 0);
  const totalFocused = lobbies.reduce((sum, lobby) => sum + (lobby.activeUsers ?? 0), 0);
  const firstName = user?.fullName?.split(' ')[0] ?? 'Hoş geldin';

  const openCreate = () => {
    if (!user?.isPremium) {
      navigate('/app/premium');
      return;
    }
    setFormError(null);
    setCreateOpen(true);
  };

  const resetForm = () => {
    setNewName('');
    setNewDesc('');
    setNewCategory('Genel');
    setIsPrivate(false);
    setIsPremiumOnly(false);
    setAllowVideo(false);
    setRoomPassword('');
  };

  const createLobby = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newName.trim()) return setFormError('Odaya bir ad ver.');
    if (isPrivate && !roomPassword.trim()) return setFormError('Şifreli oda için bir şifre belirle.');

    setCreating(true);
    setFormError(null);
    try {
      const privateCap = user?.isPremium ? 5 : 2;
      const baseCap = isPrivate ? privateCap : 50;
      await api.post('/lobbies', {
        name: newName.trim(),
        description: newDesc.trim(),
        category: newCategory,
        icon: allowVideo ? 'video' : isPremiumOnly ? 'crown' : 'users',
        isPrivate,
        isPremiumOnly,
        allowVideo,
        password: isPrivate ? roomPassword : undefined,
        maxUsers: allowVideo ? Math.min(baseCap, MAX_VIDEO_ROOM_USERS) : baseCap,
      });
      setCreateOpen(false);
      resetForm();
      await loadData();
    } catch (createError) {
      setFormError(getApiErrorMessage(createError));
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
      setFormError(null);
      setPasswordOpen(true);
      return;
    }
    navigate(`/app/focus/${lobby.id}`);
  };

  const verifyPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLobby) return;
    if (!enterPassword.trim()) return setFormError('Şifreyi gir.');
    setVerifying(true);
    setFormError(null);
    try {
      await api.post('/lobbies/verify-password', { lobbyId: selectedLobby.id, password: enterPassword });
      setPasswordOpen(false);
      setEnterPassword('');
      navigate(`/app/focus/${selectedLobby.id}`);
    } catch (verifyError) {
      setFormError(getApiErrorMessage(verifyError));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl">{firstName}, hangi masaya oturuyorsun?</h1>
          <p className="mt-3 text-lg text-textMuted">
            {totalInRooms > 0
              ? `${lobbies.length} odada ${totalInRooms} kişi var, ${totalFocused > 0 ? `${totalFocused} kişinin lambası şu an yanıyor.` : 'şu an kimse odaklanmıyor.'}`
              : 'Odalar şu an sessiz. İlk lambayı sen yak.'}
          </p>
        </div>
        <Button onClick={openCreate} icon={user?.isPremium ? Plus : Crown} size="lg" variant={user?.isPremium ? 'primary' : 'secondary'}>
          {user?.isPremium ? 'Oda kur' : 'Oda kurmak için Premium'}
        </Button>
      </header>

      <PlansSection lobbies={lobbies} />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="flex min-h-11 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface px-3.5 focus-within:border-accent">
          <Search className="h-[18px] w-[18px] shrink-0 text-textMuted" />
          <span className="sr-only">Oda ara</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Oda adı ya da konu ara" className="w-full bg-transparent text-base outline-none" />
        </label>
        <button
          type="button"
          onClick={() => setVideoOnly((v) => !v)}
          aria-pressed={videoOnly}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-[15px] font-semibold transition ${
            videoOnly ? 'border-primary bg-softIndigo text-primary' : 'border-border bg-surface text-textMuted hover:text-textDark'
          }`}
        >
          <Video className="h-[18px] w-[18px]" />
          Sadece kameralı odalar
        </button>
      </div>

      <div className="scrollbar-hide -mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Kategori">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            aria-pressed={selectedCategory === category}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              selectedCategory === category ? 'bg-textDark text-background' : 'text-textMuted hover:bg-sunken hover:text-textDark'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4">
          <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice>
        </div>
      ) : null}

      {isLoading ? <StateBlock loading title="Odalar yükleniyor" /> : null}

      {!isLoading && visibleLobbies.length > 0 ? (
        <ul className="sl-panel divide-y divide-border overflow-hidden">
          {visibleLobbies.map((lobby) => {
            const friendsInLobby = friends.filter((friend) => friend.currentRoom === lobby.name && friend.isOnline);
            const members = lobby.memberCount ?? 0;
            const focused = Math.min(lobby.activeUsers ?? 0, members);
            const full = members >= (lobby.maxUsers ?? 50);
            return (
              <li key={lobby.id}>
                <div className="flex flex-col gap-4 px-5 py-5 transition hover:bg-sunken/50 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <h2 className="text-xl md:text-2xl">{lobby.name}</h2>
                      {lobby.allowVideo ? <Badge icon={Video} tone="primary">Kameralı</Badge> : null}
                      {lobby.isPremiumOnly ? <Badge icon={Crown} tone="accent">Elite</Badge> : null}
                      {lobby.isPrivate ? <Badge icon={LockKeyhole} tone="neutral">Şifreli</Badge> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 max-w-2xl text-[15px] leading-6 text-textMuted">
                      {lobby.description || 'Sessiz, odaklı bir çalışma masası.'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-textMuted">
                      <LampRow total={members} lit={focused} />
                      <span>
                        {members === 0 ? 'Boş' : `${members}/${lobby.maxUsers ?? 50} kişi`}
                        {focused > 0 ? `, ${focused} odakta` : ''}
                      </span>
                      <span>{lobby.category ?? 'Genel'}</span>
                      {friendsInLobby.length ? (
                        <span className="font-semibold text-success">
                          {friendsInLobby[0].fullName.split(' ')[0]}
                          {friendsInLobby.length > 1 ? ` ve ${friendsInLobby.length - 1} arkadaşın` : ''} burada
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    variant={lobby.isPremiumOnly && !user?.isPremium ? 'secondary' : 'primary'}
                    onClick={() => enterLobby(lobby)}
                    disabled={full}
                    className="sm:w-32"
                  >
                    {full ? 'Dolu' : lobby.isPremiumOnly && !user?.isPremium ? 'Premium' : 'Katıl'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!isLoading && visibleLobbies.length === 0 ? (
        <StateBlock
          title={lobbies.length === 0 ? 'Henüz açık oda yok' : 'Bu filtreye uyan oda yok'}
          description={lobbies.length === 0 ? 'Odalar 24 saat açık kalır. İlk odayı sen kurabilirsin.' : 'Kategoriyi ya da aramayı değiştirip tekrar bak.'}
          action={lobbies.length === 0 ? <Button onClick={openCreate} icon={Plus}>Oda kur</Button> : undefined}
        />
      ) : null}

      <ModalShell open={createOpen} title="Yeni çalışma odası" description="Oda 24 saat açık kalır." onClose={() => setCreateOpen(false)}>
        <form onSubmit={createLobby} className="space-y-4">
          <TextField label="Oda adı" value={newName} onChange={setNewName} required placeholder="Örn. Final haftası, sessiz" />
          <div>
            <label htmlFor="room-category" className="mb-1.5 block text-sm font-semibold text-textDark">Kategori</label>
            <select id="room-category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className="min-h-11 w-full rounded-lg border border-border bg-sunken px-3 text-base text-textDark outline-none focus:border-accent">
              {roomCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>
          <TextField label="Açıklama" value={newDesc} onChange={setNewDesc} multiline placeholder="Ne çalışılıyor, oda kuralları neler?" />

          <Toggle
            label="Kamera ve ekran paylaşımı"
            description={`Katılımcılar web'den kamerasını açıp ekran paylaşabilir. En fazla ${MAX_VIDEO_ROOM_USERS} kişi.`}
            checked={allowVideo}
            onChange={setAllowVideo}
          />
          <Toggle label="Şifreli oda" description={`Sadece şifreyi bilenler girer, en fazla ${user?.isPremium ? 5 : 2} kişi.`} checked={isPrivate} onChange={setIsPrivate} />
          <Toggle label="Elite oda" description="Sadece Premium üyeler girer, odak süresi 2 kat sayılır." checked={isPremiumOnly} onChange={setIsPremiumOnly} />
          {isPrivate ? <TextField label="Oda şifresi" value={roomPassword} onChange={setRoomPassword} type="password" required /> : null}

          {formError ? <Notice tone="danger">{formError}</Notice> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Vazgeç</Button>
            <Button type="submit" loading={creating}>Odayı kur</Button>
          </div>
        </form>
      </ModalShell>

      <ModalShell open={passwordOpen} title="Şifreli oda" description={`"${selectedLobby?.name ?? ''}" odasına girmek için şifreyi gir.`} onClose={() => setPasswordOpen(false)}>
        <form onSubmit={verifyPassword} className="space-y-4">
          <TextField label="Şifre" value={enterPassword} onChange={setEnterPassword} type="password" required />
          {formError ? <Notice tone="danger">{formError}</Notice> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setPasswordOpen(false)}>Vazgeç</Button>
            <Button type="submit" loading={verifying}>Odaya gir</Button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}

/** Odadaki her kişi için bir lamba; odaklananlarınki yanar. */
function LampRow({ total, lit }: { total: number; lit: number }) {
  if (total === 0) return null;
  const shown = Math.min(total, MAX_LAMPS);
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: shown }, (_, index) => (
        <span
          key={index}
          className={`h-2.5 w-2.5 rounded-full ${index < lit ? 'bg-accent shadow-[0_0_8px_var(--sl-blush)]' : 'border border-textMuted/50'}`}
        />
      ))}
      {total > MAX_LAMPS ? <span className="ml-0.5 text-xs">+{total - MAX_LAMPS}</span> : null}
    </span>
  );
}

function Badge({ icon: Icon, tone, children }: { icon: typeof Video; tone: 'primary' | 'accent' | 'neutral'; children: string }) {
  const cls = {
    primary: 'bg-softIndigo text-primary',
    accent: 'bg-lightAmber text-accentDark',
    neutral: 'bg-sunken text-textMuted',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[13px] font-semibold ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
