import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Lock, LockOpen, RefreshCw, Search, Trash2, UserCog, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { dateTimeFormatter, numberFormatter, timeAgo } from '../../lib/admin';
import type { AdminRoomRow, AdminUserRow, Paged } from '../../lib/admin';
import { Button, ModalShell, Notice, PageHeader, Pill, StateBlock, TextField } from '../../components/ui';

type RoomFilter = 'live' | 'locked' | 'private' | 'video';

const FILTERS: { key: RoomFilter; label: string; match: (room: AdminRoomRow) => boolean }[] = [
  { key: 'live', label: 'İçinde kişi var', match: (room) => room.memberCount > 0 },
  { key: 'locked', label: 'Kilitli', match: (room) => room.isLocked },
  { key: 'private', label: 'Şifreli', match: (room) => room.isPrivate },
  { key: 'video', label: 'Kameralı', match: (room) => room.allowVideo },
];

type Dialog = { kind: 'close' | 'owner'; room: AdminRoomRow } | null;

/** Yönetim: bütün odalar; kilitleme, sahip değiştirme ve kapatma. Her işlem işlem kaydına yazılır. */
export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<AdminRoomRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<RoomFilter[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<AdminRoomRow[]>('/admin/rooms');
      setRooms(response.data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('tr');
    return (rooms ?? []).filter(
      (room) =>
        active.every((key) => FILTERS.find((filter) => filter.key === key)?.match(room)) &&
        (!term || room.name.toLocaleLowerCase('tr').includes(term) || room.owner?.username.toLocaleLowerCase('tr').includes(term)),
    );
  }, [rooms, query, active]);

  const totals = useMemo(
    () => ({ rooms: rooms?.length ?? 0, people: (rooms ?? []).reduce((sum, room) => sum + room.memberCount, 0) }),
    [rooms],
  );

  const toggleLock = async (room: AdminRoomRow) => {
    setBusyId(room.id);
    setNotice(null);
    try {
      await api.patch(`/admin/rooms/${room.id}/lock`, { locked: !room.isLocked });
      setNotice(room.isLocked ? `“${room.name}” kilidi açıldı.` : `“${room.name}” yeni girişlere kilitlendi.`);
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
    } finally {
      setBusyId(null);
    }
  };

  const afterDialog = async (message: string) => {
    setDialog(null);
    setNotice(message);
    await load();
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Yönetim"
        title="Odalar"
        description={`${numberFormatter.format(totals.rooms)} oda, şu an ${numberFormatter.format(totals.people)} kişi içeride. Odalar oluşturulduktan 24 saat sonra kendiliğinden silinir.`}
        action={
          <Button variant="secondary" icon={RefreshCw} onClick={() => void load()} loading={loading}>
            Yenile
          </Button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Oda ya da sahip ara</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mb-body" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Oda adı ya da sahibin kullanıcı adı"
            className="min-h-11 w-full rounded-[12px] border border-mb-line bg-mb-surface pl-10 pr-3.5 text-base text-mb-ink outline-none transition focus:border-mb-action focus:bg-mb-card"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtreler">
          {FILTERS.map((filter) => {
            const on = active.includes(filter.key);
            return (
              <button
                key={filter.key}
                type="button"
                aria-pressed={on}
                onClick={() => setActive((current) => (on ? current.filter((key) => key !== filter.key) : [...current, filter.key]))}
                className={`min-h-9 rounded-full border px-3.5 text-sm font-semibold transition ${on ? 'border-mb-action bg-mb-action text-mb-on-action' : 'border-mb-line bg-mb-card text-mb-body hover:text-mb-ink'}`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {notice ? <Notice tone="success" onDismiss={() => setNotice(null)}>{notice}</Notice> : null}
        {error ? <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice> : null}
      </div>

      <div className="mt-5">
        {loading && !rooms ? (
          <StateBlock loading title="Odalar yükleniyor" />
        ) : visible.length === 0 ? (
          <StateBlock
            title={rooms?.length ? 'Filtreye uyan oda yok' : 'Şu an açık oda yok'}
            description={rooms?.length ? 'Aramayı ya da filtreleri değiştir.' : 'Biri oda açtığında burada görünür.'}
          />
        ) : (
          <ul className="divide-y divide-mb-line overflow-hidden rounded-[16px] border border-mb-line bg-mb-card">
            {visible.map((room) => (
              <li key={room.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <span aria-hidden="true" className="text-xl">{room.icon}</span>
                    <h2 className="truncate text-lg text-mb-ink">{room.name}</h2>
                    {room.isLocked ? <Pill tone="info">Kilitli</Pill> : null}
                    {room.isPrivate ? <Pill>Şifreli</Pill> : null}
                    {room.isPremiumOnly ? <Pill tone="primary">Premium</Pill> : null}
                    {room.allowVideo ? <Pill>Kameralı</Pill> : null}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-mb-body">
                    <span className="inline-flex items-center gap-1">
                      <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                      {room.owner ? (
                        <Link to={`/admin/users/${room.owner.id}`} className="font-medium text-mb-ink hover:underline">
                          {room.owner.username}
                        </Link>
                      ) : (
                        'Sahipsiz'
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {room.memberCount} / {room.maxUsers}
                    </span>
                    <span title={dateTimeFormatter.format(new Date(room.createdAt))}>{timeAgo(room.createdAt)} açıldı</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={room.isLocked ? LockOpen : Lock}
                    loading={busyId === room.id}
                    onClick={() => void toggleLock(room)}
                  >
                    {room.isLocked ? 'Kilidi aç' : 'Kilitle'}
                  </Button>
                  <Button size="sm" variant="secondary" icon={UserCog} onClick={() => setDialog({ kind: 'owner', room })}>
                    Sahibi değiştir
                  </Button>
                  <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDialog({ kind: 'close', room })}>
                    Kapat
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog?.kind === 'close' ? (
        <CloseDialog room={dialog.room} onClose={() => setDialog(null)} onDone={() => afterDialog(`“${dialog.room.name}” kapatıldı.`)} />
      ) : null}
      {dialog?.kind === 'owner' ? (
        <OwnerDialog room={dialog.room} onClose={() => setDialog(null)} onDone={(name) => afterDialog(`“${dialog.room.name}” odasının sahibi artık ${name}.`)} />
      ) : null}
    </div>
  );
}

function CloseDialog({ room, onClose, onDone }: { room: AdminRoomRow; onClose: () => void; onDone: () => void | Promise<void> }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/admin/rooms/${room.id}`, { data: { reason: reason.trim() || undefined } });
      await onDone();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open
      title={`“${room.name}” kapatılsın mı?`}
      description={room.memberCount > 0 ? `İçerideki ${room.memberCount} kişi odadan çıkarılır. Bu geri alınamaz.` : 'Oda silinir. Bu geri alınamaz.'}
      onClose={onClose}
    >
      <div className="space-y-4">
        <TextField label="Gerekçe (isteğe bağlı)" value={reason} onChange={setReason} helper="İşlem kaydında görünür." />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Vazgeç</Button>
          <Button variant="danger" icon={Trash2} loading={busy} onClick={() => void submit()}>Odayı kapat</Button>
        </div>
      </div>
    </ModalShell>
  );
}

function OwnerDialog({ room, onClose, onDone }: { room: AdminRoomRow; onClose: () => void; onDone: (username: string) => void | Promise<void> }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<AdminUserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    const timer = window.setTimeout(() => {
      setSearching(true);
      api
        .get<Paged<AdminUserRow>>('/admin/users', { params: { q: trimmed, pageSize: 6 } })
        .then((response) => setResults(response.data.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [term]);

  const pick = async (user: AdminUserRow) => {
    setBusyId(user.id);
    setError(null);
    try {
      await api.patch(`/admin/rooms/${room.id}/owner`, { userId: user.id, reason: reason.trim() || undefined });
      await onDone(user.username);
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
      setBusyId(null);
    }
  };

  return (
    <ModalShell
      open
      title="Oda sahibini değiştir"
      description={`“${room.name}” şu an ${room.owner ? room.owner.username : 'sahipsiz'}. Yeni sahibi ara ve seç.`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <TextField label="Kullanıcı ara" value={term} onChange={setTerm} placeholder="Ad, kullanıcı adı ya da e-posta" />
        <ul className="space-y-1.5" aria-live="polite">
          {(term.trim().length >= 2 ? results : []).map((user) => (
            <li key={user.id}>
              <button
                type="button"
                disabled={busyId !== null || user.id === room.owner?.id}
                onClick={() => void pick(user)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[12px] border border-mb-line bg-mb-surface px-3.5 text-left transition hover:border-mb-action disabled:opacity-55"
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-mb-ink">{user.fullName}</span>{' '}
                  <span className="text-sm text-mb-body">@{user.username}</span>
                </span>
                <span className="shrink-0 text-sm text-mb-body">
                  {user.id === room.owner?.id ? 'Şu anki sahip' : busyId === user.id ? 'Değiştiriliyor…' : 'Seç'}
                </span>
              </button>
            </li>
          ))}
          {!searching && term.trim().length >= 2 && results.length === 0 ? <li className="text-sm text-mb-body">Eşleşen kullanıcı yok.</li> : null}
        </ul>
        <TextField label="Gerekçe (isteğe bağlı)" value={reason} onChange={setReason} helper="İşlem kaydında görünür." />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busyId !== null}>Vazgeç</Button>
        </div>
      </div>
    </ModalShell>
  );
}
