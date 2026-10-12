import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, animate, domAnimation, m, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Columns3, Crown, List, LockKeyhole, Plus, Search, UserPlus, Users, Video, type LucideIcon } from 'lucide-react';
import { Button, ModalShell, Notice, StateBlock, TextField, Toggle } from '../components/ui';
import { api } from '../lib/api';
import { getApiErrorMessage, unwrapData } from '../lib/apiResponses';
import type { Lobby } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import { OnboardingCard } from '../components/onboarding/OnboardingCard';
import { ROOM_CATEGORIES, ROOM_FILTER_CATEGORIES } from '../lib/roomCategories';

const categories = ROOM_FILTER_CATEGORIES;
const roomCategories = ROOM_CATEGORIES;

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
  const [view, setViewState] = useState(readView);
  // "+N oda daha" ile açılan sütunlar
  const [expanded, setExpanded] = useState<Partial<Record<RoomKind, boolean>>>({});
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
      return `${lobby.name} ${lobby.description ?? ''}`.toLocaleLowerCase('tr-TR').includes(needle);
    });
  }, [lobbies, query, selectedCategory]);

  const setView = (next: 'board' | 'list') => {
    setViewState(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Depolama kapalıysa görünüm tercihi yalnızca bu oturumda kalır.
    }
  };

  const totalInRooms = lobbies.reduce((sum, lobby) => sum + (lobby.memberCount ?? 0), 0);
  const totalFocused = lobbies.reduce((sum, lobby) => sum + (lobby.activeUsers ?? 0), 0);

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
    // Animasyonlar yalnızca bu sayfada; "hareketi azalt" açıkken MotionConfig hepsini durdurur.
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mb-display text-[2rem] font-light leading-tight tracking-[-0.04em] text-mb-ink md:text-[2.25rem]">Odalar</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openCreate} className={user?.isPremium ? darkButton : outlineButton}>
            {user?.isPremium ? <Plus className="h-4 w-4" /> : <Crown className="h-4 w-4 text-mb-action" />}
            {user?.isPremium ? 'Oda kur' : 'Oda kurmak için Premium'}
          </button>
          <Link to="/app/dm" className={outlineButton}>
            <UserPlus className="h-4 w-4" />
            Arkadaş ekle
          </Link>
        </div>
      </header>

      <LiveBanner rooms={lobbies.length} people={totalInRooms} lit={Math.min(totalFocused, totalInRooms)} ready={!isLoading} />

      <div className="mt-6">
        <OnboardingCard roomListId="oda-listesi" />
      </div>

      {/* Görünüm sekmeleri */}
      <div className="mt-2 flex items-end justify-between gap-4 border-b border-mb-line">
        <div role="tablist" aria-label="Oda görünümü" className="flex gap-1">
          {views.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={view === option.value}
              onClick={() => setView(option.value)}
              className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 text-[15px] font-medium transition ${
                view === option.value ? 'border-mb-action text-mb-ink' : 'border-transparent text-mb-body hover:text-mb-ink'
              }`}
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <section id="oda-listesi" aria-label="Odalar" className="mt-5 scroll-mt-20 rounded-[24px] bg-mb-surface p-3 md:p-4">
        {/* Arama: odaların hemen üstünde */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex min-h-12 flex-1 items-center gap-2.5 rounded-[14px] border border-mb-line bg-mb-card px-4 transition focus-within:border-mb-action">
            <Search className="h-[18px] w-[18px] shrink-0 text-mb-body" />
            <span className="sr-only">Oda ara</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Oda adı ya da konu ara" className="w-full bg-transparent text-[15px] text-mb-ink outline-none placeholder:text-mb-body" />
          </label>
          <label className="flex min-h-12 items-center gap-2 rounded-[14px] border border-mb-line bg-mb-card pl-4 pr-2 transition focus-within:border-mb-action">
            <span className="text-sm text-mb-body">Kategori</span>
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="min-h-10 bg-transparent pr-1 text-[15px] font-medium text-mb-ink outline-none [&>option]:bg-mb-card">
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <div className="mt-4">
            <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-4">
            <StateBlock loading title="Odalar yükleniyor" />
          </div>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
        {!isLoading && visibleLobbies.length > 0 && view === 'board' ? (
          <m.div key="pano" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="scrollbar-hide -mx-3 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
            {columns.map((column, columnIndex) => {
              const rooms = sortByActivity(visibleLobbies.filter((lobby) => roomKind(lobby) === column.kind));
              const open = expanded[column.kind] ?? false;
              const shown = open ? rooms : rooms.slice(0, COLUMN_LIMIT);
              const hiddenCount = rooms.length - shown.length;
              return (
                <section key={column.kind} aria-labelledby={`sutun-${column.kind}`} className="flex w-[85%] shrink-0 snap-start flex-col rounded-[18px] bg-mb-band/70 p-2.5 sm:w-[60%] md:w-auto">
                  <header className="flex items-center gap-2.5 px-1.5 pb-3 pt-1">
                    <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-mb-card text-mb-body shadow-mb-card">
                      <column.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <h2 id={`sutun-${column.kind}`} className="font-mb-display text-[15px] font-medium tracking-[-0.01em] text-mb-ink">{column.title}</h2>
                    <span className="ml-auto grid h-6 min-w-6 place-items-center rounded-[7px] bg-mb-card px-1.5 text-xs font-semibold tabular-nums text-mb-ink">{rooms.length}</span>
                  </header>
                  {rooms.length > 0 ? (
                    <>
                      <ul className="space-y-2">
                        {shown.map((lobby, index) =>
                          (lobby.memberCount ?? 0) > 0 ? (
                            <RoomCard key={lobby.id} lobby={lobby} kind={column.kind} friends={friends} isPremium={!!user?.isPremium} onEnter={enterLobby} delay={columnIndex * 0.06 + index * 0.05} />
                          ) : (
                            <QuietRoomCard key={lobby.id} lobby={lobby} kind={column.kind} isPremium={!!user?.isPremium} onEnter={enterLobby} delay={columnIndex * 0.06 + index * 0.05} />
                          ),
                        )}
                      </ul>
                      {rooms.length > COLUMN_LIMIT ? (
                        <button
                          type="button"
                          onClick={() => setExpanded((current) => ({ ...current, [column.kind]: !open }))}
                          aria-expanded={open}
                          className="mt-2 min-h-10 w-full rounded-[12px] text-sm font-medium text-mb-body transition hover:bg-mb-card hover:text-mb-ink"
                        >
                          {open ? 'Daha az göster' : `+${hiddenCount} oda daha`}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <p className="rounded-[14px] border border-dashed border-mb-line px-3 py-6 text-center text-sm text-mb-body">{column.empty}</p>
                  )}
                </section>
              );
            })}
          </m.div>
        ) : null}

        {!isLoading && visibleLobbies.length > 0 && view === 'list' ? (
          <m.ul key="liste" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="mt-4 divide-y divide-mb-line overflow-hidden rounded-[18px] border border-mb-line bg-mb-card">
            {visibleLobbies.map((lobby) => (
              <RoomRow key={lobby.id} lobby={lobby} friends={friends} isPremium={!!user?.isPremium} onEnter={enterLobby} />
            ))}
          </m.ul>
        ) : null}
        </AnimatePresence>

        {!isLoading && visibleLobbies.length === 0 ? (
          <div className="mt-4">
            <StateBlock
              title={lobbies.length === 0 ? 'Henüz açık oda yok' : 'Bu filtreye uyan oda yok'}
              description={lobbies.length === 0 ? 'Odalar 24 saat açık kalır. İlk odayı sen kurabilirsin.' : 'Kategoriyi ya da aramayı değiştirip tekrar bak.'}
              action={lobbies.length === 0 ? <Button onClick={openCreate} icon={Plus}>Oda kur</Button> : undefined}
            />
          </div>
        ) : null}
      </section>

      <ModalShell open={createOpen} title="Yeni çalışma odası" description="Oda 24 saat açık kalır." onClose={() => setCreateOpen(false)}>
        <form onSubmit={createLobby} className="space-y-4">
          <TextField label="Oda adı" value={newName} onChange={setNewName} required placeholder="Örn. Final haftası, sessiz" />
          <div>
            <label htmlFor="room-category" className="mb-1.5 block text-sm font-semibold text-textDark">Kategori</label>
            <select id="room-category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className="min-h-11 w-full rounded-lg border border-border bg-sunken px-3 text-base text-textDark outline-none focus:border-primary">
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
    </MotionConfig>
    </LazyMotion>
  );
}

type RoomKind = 'open' | 'video' | 'elite' | 'private';

/**
 * Pano sütunları (oda türüne göre). Bir oda birden çok türe uyabilir; en kısıtlayıcı
 * olana yerleşir (şifreli > Elite > kameralı > herkese açık), diğer türleri kartta etiket olarak görünür.
 */
const columns: Array<{ kind: RoomKind; title: string; icon: LucideIcon; empty: string }> = [
  { kind: 'open', title: 'Herkese açık', icon: Users, empty: 'Herkese açık oda yok.' },
  { kind: 'video', title: 'Kameralı', icon: Video, empty: 'Kameralı oda yok.' },
  { kind: 'elite', title: 'Elite', icon: Crown, empty: 'Elite oda yok.' },
  { kind: 'private', title: 'Şifreli', icon: LockKeyhole, empty: 'Şifreli oda yok.' },
];

function roomKind(lobby: Lobby): RoomKind {
  if (lobby.isPrivate) return 'private';
  if (lobby.isPremiumOnly) return 'elite';
  if (lobby.allowVideo) return 'video';
  return 'open';
}

const views: Array<{ value: 'board' | 'list'; label: string; icon: LucideIcon }> = [
  { value: 'board', label: 'Pano', icon: Columns3 },
  { value: 'list', label: 'Liste', icon: List },
];

const VIEW_KEY = 'sl-odalar-gorunum';

function readView(): 'board' | 'list' {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'board';
  } catch {
    return 'board';
  }
}

const darkButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-mb-solid px-4 text-[15px] font-medium text-mb-on-solid shadow-mb-raised transition hover:-translate-y-0.5 active:translate-y-0';
const outlineButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border border-mb-line bg-mb-card px-4 text-[15px] font-medium text-mb-ink transition hover:bg-mb-surface';

type RoomProps = { lobby: Lobby; friends: FriendPresence[]; isPremium: boolean; onEnter: (lobby: Lobby) => void };

/** Kartta ve satırda ortak oda bilgisi. */
function useRoomInfo({ lobby, friends, isPremium }: Omit<RoomProps, 'onEnter'>) {
  const members = lobby.memberCount ?? 0;
  const capacity = lobby.maxUsers ?? 50;
  const focused = Math.min(lobby.activeUsers ?? 0, members);
  const full = members >= capacity;
  const locked = !!lobby.isPremiumOnly && !isPremium;
  const friendsHere = friends.filter((friend) => friend.currentRoom === lobby.name && friend.isOnline);
  const friendsText = friendsHere.length
    ? `${friendsHere[0].fullName.split(' ')[0]}${friendsHere.length > 1 ? ` ve ${friendsHere.length - 1} arkadaşın` : ''} burada`
    : null;
  return { members, capacity, focused, full, locked, friendsText, action: full ? 'Dolu' : locked ? 'Premium' : 'Katıl' };
}

/** Karttaki küçük etiketler: kategori + sütun dışındaki türler. */
function RoomTags({ lobby, kind }: { lobby: Lobby; kind?: RoomKind }) {
  const tag = 'inline-flex items-center gap-1 rounded-[8px] bg-mb-surface px-2.5 py-1 text-[13px] font-medium text-mb-body';
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={tag}>{lobby.category ?? 'Genel'}</span>
      {lobby.allowVideo && kind !== 'video' ? (
        <span className={tag}>
          <Video className="h-3.5 w-3.5" aria-hidden="true" />
          Kameralı
        </span>
      ) : null}
      {lobby.isPremiumOnly && kind !== 'elite' ? (
        <span className={tag}>
          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
          Elite
        </span>
      ) : null}
      {lobby.isPrivate && kind !== 'private' ? (
        <span className={tag}>
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          Şifreli
        </span>
      ) : null}
    </div>
  );
}

/** Sütunda en fazla bu kadar oda görünür; gerisi "+N oda daha" ile açılır. */
const COLUMN_LIMIT = 5;

/** Canlı odalar üstte: önce lambası yanan çok olan, sonra kalabalık olan; boş odalar en altta. */
function sortByActivity(rooms: Lobby[]) {
  return [...rooms].sort(
    (a, b) => (b.activeUsers ?? 0) - (a.activeUsers ?? 0) || (b.memberCount ?? 0) - (a.memberCount ?? 0),
  );
}

/** Canlı oda (içinde biri var): büyük kart. Odakta biri varsa üstünde lamba ışığı. */
function RoomCard({ lobby, kind, friends, isPremium, onEnter, delay = 0 }: RoomProps & { kind: RoomKind; delay?: number }) {
  const info = useRoomInfo({ lobby, friends, isPremium });
  const ratio = info.capacity ? Math.min(1, info.members / info.capacity) : 0;
  return (
    <m.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[16px] bg-mb-card p-4 shadow-mb-card transition-shadow duration-200 hover:shadow-mb-raised"
      style={info.focused > 0 ? { backgroundImage: 'radial-gradient(120% 60% at 50% -10%, var(--sl-lamp), transparent 70%)' } : undefined}
    >
      <RoomTags lobby={lobby} kind={kind} />
      <h3 className="mt-3 font-mb-display text-[17px] font-medium leading-snug tracking-[-0.02em] text-mb-ink">{lobby.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-mb-body">{lobby.description || 'Sessiz, odaklı bir çalışma masası.'}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-mb-body">
        <LampRow total={info.members} lit={info.focused} />
        <span>{info.members === 0 ? 'Boş' : info.focused > 0 ? `${info.focused} odakta` : 'Kimse odakta değil'}</span>
        {info.friendsText ? <span className="font-medium text-success">{info.friendsText}</span> : null}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-mb-body">Doluluk</span>
          <span className="font-medium tabular-nums text-mb-ink">
            {info.members}/{info.capacity} kişi
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mb-line" aria-hidden="true">
          <m.div
            className="h-full rounded-full bg-mb-meter"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(ratio * 100, info.members ? 4 : 0)}%` }}
            transition={{ duration: 0.8, delay: delay + 0.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      <EnterButton label={info.action} locked={info.locked} disabled={info.full} onClick={() => onEnter(lobby)} className="mt-4 w-full" />
    </m.li>
  );
}

/** Boş oda: tek satırlık sakin kart. */
function QuietRoomCard({ lobby, kind, isPremium, onEnter, delay = 0 }: Omit<RoomProps, 'friends'> & { kind: RoomKind; delay?: number }) {
  const info = useRoomInfo({ lobby, friends: [], isPremium });
  return (
    <m.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 rounded-[14px] bg-mb-card/70 px-3.5 py-2.5 transition-colors hover:bg-mb-card"
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-medium tracking-[-0.01em] text-mb-ink">{lobby.name}</h3>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-mb-body">
          {lobby.category ?? 'Genel'}
          {lobby.allowVideo && kind !== 'video' ? <Video className="h-3 w-3 shrink-0" aria-label="Kameralı" /> : null}
          {lobby.isPremiumOnly && kind !== 'elite' ? <Crown className="h-3 w-3 shrink-0" aria-label="Elite" /> : null}
          {lobby.isPrivate && kind !== 'private' ? <LockKeyhole className="h-3 w-3 shrink-0" aria-label="Şifreli" /> : null}
          <span aria-hidden="true">·</span> Boş
        </p>
      </div>
      <EnterButton label={info.action} locked={info.locked} disabled={info.full} onClick={() => onEnter(lobby)} className="min-h-9 shrink-0 px-3" />
    </m.li>
  );
}

function RoomRow({ lobby, friends, isPremium, onEnter }: RoomProps) {
  const info = useRoomInfo({ lobby, friends, isPremium });
  return (
    <li className="flex flex-col gap-3 px-4 py-4 transition hover:bg-mb-surface/60 sm:flex-row sm:items-center md:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="font-mb-display text-lg font-medium tracking-[-0.02em] text-mb-ink">{lobby.name}</h3>
          <RoomTags lobby={lobby} />
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-mb-body">{lobby.description || 'Sessiz, odaklı bir çalışma masası.'}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-mb-body">
          <LampRow total={info.members} lit={info.focused} />
          <span>
            {info.members === 0 ? 'Boş' : `${info.members}/${info.capacity} kişi`}
            {info.focused > 0 ? `, ${info.focused} odakta` : ''}
          </span>
          {info.friendsText ? <span className="font-medium text-success">{info.friendsText}</span> : null}
        </div>
      </div>
      <EnterButton label={info.action} locked={info.locked} disabled={info.full} onClick={() => onEnter(lobby)} className="sm:w-28" />
    </li>
  );
}

function EnterButton({ label, locked, disabled, onClick, className = '' }: { label: string; locked: boolean; disabled: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[12px] px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        locked ? 'border border-mb-line bg-mb-bg text-mb-ink hover:bg-mb-surface' : 'bg-mb-action text-mb-on-action shadow-mb-press hover:bg-mb-action-2'
      } ${className}`}
    >
      {locked ? <Crown className="h-4 w-4 text-mb-action" aria-hidden="true" /> : null}
      {label}
    </button>
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
          className={`h-2.5 w-2.5 rounded-full ${index < lit ? 'bg-accent shadow-[0_0_8px_var(--sl-blush)] motion-safe:animate-[sl-lamba_2.6s_ease-in-out_infinite]' : 'border border-mb-body/50'}`}
        />
      ))}
      {total > MAX_LAMPS ? <span className="ml-0.5 text-xs">+{total - MAX_LAMPS}</span> : null}
    </span>
  );
}

/**
 * Planlı oturumların yerinde duran canlı şerit: üç sayı, süzülen 3B lamba ve
 * ışığında yükselen toz zerreleri. Sayılar açılışta sayarak gelir.
 */
function LiveBanner({ rooms, people, lit, ready }: { rooms: number; people: number; lit: number; ready: boolean }) {
  const reduce = useReducedMotion();
  return (
    <section aria-label="Şu an odalarda" className="relative mt-6 overflow-hidden rounded-[24px] bg-mb-solid text-mb-on-solid shadow-mb-raised">
      {/* Lamba ışığı: yanan lamba varsa daha güçlü, yavaşça nefes alır */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-[22rem] w-[30rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--color-mb-lamp) 55%, transparent), transparent)' }}
        initial={{ opacity: 0.35 }}
        animate={reduce ? { opacity: lit > 0 ? 0.7 : 0.35 } : { opacity: lit > 0 ? [0.55, 0.85, 0.55] : [0.3, 0.42, 0.3] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-96 rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--color-mb-action-2) 70%, transparent), transparent)' }}
      />
      {reduce ? null : <Motes />}

      <div className="relative flex items-center justify-between gap-4 px-5 py-6 md:px-8 md:py-7">
        <dl className="grid grid-cols-3 gap-4 sm:gap-10">
          <Stat value={rooms} label="oda açık" ready={ready} />
          <Stat value={people} label="kişi masada" ready={ready} />
          <Stat value={lit} label="lamba yanıyor" ready={ready} lamp />
        </dl>
        <m.img
          src="/landing/3b/lamba.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none relative -my-4 hidden w-28 shrink-0 select-none drop-shadow-[0_18px_30px_rgb(0_0_0/0.35)] sm:block md:w-36"
          animate={{ y: [0, -8, 0], rotate: [-3, -1, -3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </section>
  );
}

function Stat({ value, label, ready, lamp = false }: { value: number; label: string; ready: boolean; lamp?: boolean }) {
  const count = useMotionValue(0);
  const shown = useTransform(count, (latest) => Math.round(latest).toLocaleString('tr-TR'));
  useEffect(() => {
    if (!ready) return;
    const controls = animate(count, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [count, value, ready]);
  return (
    // Etiket telefonda iki satıra kırılabilir; sayılar yine de alt çizgide hizalı kalır.
    <div className="flex min-w-0 flex-col justify-between">
      <dt className="flex items-center gap-1.5 text-[13px] leading-snug text-mb-on-solid/70">
        {lamp ? <span aria-hidden="true" className={`h-2 w-2 rounded-full ${value > 0 ? 'bg-mb-lamp shadow-[0_0_10px_var(--color-mb-lamp)] motion-safe:animate-[sl-lamba_2.6s_ease-in-out_infinite]' : 'bg-mb-on-solid/30'}`} /> : null}
        {label}
      </dt>
      <dd className="mt-2 font-mb-display text-[2rem] font-light leading-none tracking-[-0.04em] tabular-nums md:text-[2.75rem]">
        {ready ? <m.span>{shown}</m.span> : '–'}
      </dd>
    </div>
  );
}

/** Lamba ışığında yavaşça yükselen toz zerreleri (konumlar sabit, rastgele değil). */
const motes = [
  { left: '58%', size: 3, delay: 0, duration: 7 },
  { left: '66%', size: 2, delay: 1.6, duration: 8 },
  { left: '72%', size: 3, delay: 3.1, duration: 6.5 },
  { left: '79%', size: 2, delay: 0.8, duration: 9 },
  { left: '85%', size: 2, delay: 2.4, duration: 7.5 },
  { left: '62%', size: 2, delay: 4.2, duration: 8.5 },
  { left: '90%', size: 3, delay: 5, duration: 7 },
];

function Motes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {motes.map((mote, index) => (
        <m.span
          key={index}
          className="absolute bottom-0 rounded-full bg-mb-lamp"
          style={{ left: mote.left, width: mote.size, height: mote.size }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [-4, -150], opacity: [0, 0.8, 0] }}
          transition={{ duration: mote.duration, delay: mote.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
