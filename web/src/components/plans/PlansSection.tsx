import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CalendarPlus, Check, DoorOpen, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage, unwrapData } from '../../lib/apiResponses';
import type { ScheduledSession } from '../../lib/study';
import type { Lobby, User } from '../../lib/types';
import { useAuthStore } from '../../store/authStore';
import { useInboxStore } from '../../store/inboxStore';
import { Avatar, Button, ModalShell, Notice, Pill, Surface, TextField } from '../ui';

const DURATIONS = [25, 50, 90, 120];

/** Odalar sayfasının üstünde: yaklaşan planlı oturumlar, davetler ve yeni plan kurma. */
export default function PlansSection({ lobbies }: { lobbies: Lobby[] }) {
  const userId = useAuthStore((state) => state.user?.id);
  const plans = useInboxStore((state) => state.plans);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "Şimdi sürüyor" etiketi için saat; yarım dakikada bir ilerler.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!userId) return null;

  const run = async (planId: number, action: () => Promise<unknown>) => {
    setBusyId(planId);
    setError(null);
    try {
      await action();
      await useInboxStore.getState().refresh();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-labelledby="plans-title" className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="plans-title" className="flex items-center gap-2 text-xl text-textDark">
          <CalendarClock className="h-5 w-5 text-primary" />
          Planlı oturumlar
        </h2>
        <Button variant="secondary" size="sm" icon={CalendarPlus} onClick={() => setCreateOpen(true)}>
          Oturum planla
        </Button>
      </div>

      {error ? (
        <div className="mb-3">
          <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice>
        </div>
      ) : null}

      {plans.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-[15px] text-textMuted">
          Yaklaşan bir plan yok. Arkadaşlarınla bir saat belirle; başlamadan 10 dakika önce hatırlatırız.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              userId={userId}
              now={now}
              busy={busyId === plan.id}
              onRespond={(status) => void run(plan.id, () => api.post(`/scheduled-sessions/${plan.id}/respond`, { status }))}
              onDelete={() => void run(plan.id, () => api.delete(`/scheduled-sessions/${plan.id}`))}
            />
          ))}
        </ul>
      )}

      <CreatePlanModal open={createOpen} lobbies={lobbies} userId={userId} onClose={() => setCreateOpen(false)} />
    </section>
  );
}

function PlanCard({
  plan,
  userId,
  now,
  busy,
  onRespond,
  onDelete,
}: {
  plan: ScheduledSession;
  userId: number;
  now: number;
  busy: boolean;
  onRespond: (status: 'accepted' | 'declined') => void;
  onDelete: () => void;
}) {
  const startsAt = new Date(plan.startsAt);
  const isOwner = plan.owner.id === userId;
  const myInvite = plan.invites.find((invite) => invite.user.id === userId);
  const live = startsAt.getTime() <= now;
  const going = [plan.owner, ...plan.invites.filter((invite) => invite.status === 'accepted').map((invite) => invite.user)];
  const waiting = plan.invites.filter((invite) => invite.status === 'pending').length;

  return (
    <li>
      <Surface className={`flex h-full flex-col gap-3 p-4 ${myInvite?.status === 'pending' ? 'border-primary' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">{live ? 'Şimdi sürüyor' : formatWhen(startsAt)}</p>
            <h3 className="truncate text-lg font-semibold text-textDark">{plan.title}</h3>
            <p className="text-sm text-textMuted">
              {plan.durationMinutes} dk · {isOwner ? 'Sen planladın' : `${plan.owner.fullName} planladı`}
              {plan.lobby ? ` · ${plan.lobby.name}` : ''}
            </p>
          </div>
          {myInvite?.status === 'declined' ? <Pill>Katılmıyorsun</Pill> : null}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {going.slice(0, 5).map((person) => (
              <Avatar key={person.id} name={person.fullName} image={person.avatarUrl} frame={person.equippedProfileFrame} size="sm" />
            ))}
          </div>
          <p className="text-sm text-textMuted">
            {going.length} kişi katılıyor{waiting ? `, ${waiting} yanıt bekleniyor` : ''}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-end gap-2">
          {myInvite?.status === 'pending' ? (
            <>
              <Button size="sm" variant="ghost" icon={X} disabled={busy} onClick={() => onRespond('declined')}>
                Katılmayacağım
              </Button>
              <Button size="sm" icon={Check} loading={busy} onClick={() => onRespond('accepted')}>
                Katılıyorum
              </Button>
            </>
          ) : null}
          {myInvite?.status === 'declined' ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onRespond('accepted')}>
              Fikrimi değiştirdim
            </Button>
          ) : null}
          {isOwner ? (
            <Button size="sm" variant="ghost" icon={Trash2} disabled={busy} onClick={onDelete} aria-label={`${plan.title} planını sil`}>
              Sil
            </Button>
          ) : null}
          {plan.lobby && (isOwner || myInvite?.status === 'accepted') ? (
            <Link to={`/app/focus/${plan.lobby.id}`}>
              <Button size="sm" variant={live ? 'lamp' : 'secondary'} icon={DoorOpen}>
                Odaya git
              </Button>
            </Link>
          ) : null}
        </div>
      </Surface>
    </li>
  );
}

function CreatePlanModal({ open, lobbies, userId, onClose }: { open: boolean; lobbies: Lobby[]; userId: number; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [duration, setDuration] = useState(50);
  const [lobbyId, setLobbyId] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [invitees, setInvitees] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setStartsAt(toLocalInputValue(nextHalfHour()));
    setDuration(50);
    setLobbyId('');
    setInvitees([]);
    setError(null);
    api
      .get<User[]>(`/users/friends/${userId}`)
      .then((response) => setFriends(unwrapData<User[]>(response.data)))
      .catch(() => setFriends([]));
  }, [open, userId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const start = new Date(startsAt);
    if (!title.trim()) return setError('Plana bir ad ver.');
    if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) return setError('İleri bir tarih ve saat seç.');
    setSaving(true);
    setError(null);
    try {
      await api.post('/scheduled-sessions', {
        title: title.trim(),
        startsAt: start.toISOString(),
        durationMinutes: duration,
        ...(lobbyId ? { lobbyId: Number(lobbyId) } : {}),
        inviteeIds: invitees,
      });
      await useInboxStore.getState().refresh();
      onClose();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleInvitee = (id: number) => setInvitees((current) => (current.includes(id) ? current.filter((item) => item !== id) : current.length >= 10 ? current : [...current, id]));
  const selectCls = 'min-h-11 w-full rounded-lg border border-border bg-sunken px-3 text-base text-textDark outline-none focus:border-accent';

  return (
    <ModalShell open={open} title="Oturum planla" description="Davet ettiklerin kabul ederse başlamadan 10 dakika önce herkese hatırlatılır." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Ne çalışılacak?" value={title} onChange={setTitle} required placeholder="Ör. Final haftası, Fizik 2" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="plan-start" className="mb-1.5 block text-sm font-semibold text-textDark">Başlangıç</label>
            <input id="plan-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required className={selectCls} />
          </div>
          <div>
            <label htmlFor="plan-duration" className="mb-1.5 block text-sm font-semibold text-textDark">Süre</label>
            <select id="plan-duration" value={duration} onChange={(event) => setDuration(Number(event.target.value))} className={selectCls}>
              {DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>{minutes} dakika</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="plan-room" className="mb-1.5 block text-sm font-semibold text-textDark">Oda (isteğe bağlı)</label>
          <select id="plan-room" value={lobbyId} onChange={(event) => setLobbyId(event.target.value)} className={selectCls}>
            <option value="">Oda seçme</option>
            {lobbies.map((lobby) => (
              <option key={lobby.id} value={lobby.id}>{lobby.name}</option>
            ))}
          </select>
          <p className="mt-1.5 text-sm text-textMuted">Odalar 24 saat açık kalır; ileri tarihli planlarda odayı o gün seçmek daha güvenli.</p>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-textDark">Davet et ({invitees.length}/10)</legend>
          {friends.length === 0 ? (
            <p className="text-sm text-textMuted">Davet edebileceğin arkadaşın yok. Tek başına da plan kurabilirsin.</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {friends.map((friend) => (
                <label key={friend.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-sunken">
                  <input type="checkbox" checked={invitees.includes(friend.id)} onChange={() => toggleInvitee(friend.id)} className="h-4 w-4 accent-[var(--sl-primary)]" />
                  <Avatar name={friend.fullName} image={friend.avatarUrl} frame={friend.equippedProfileFrame} size="sm" />
                  <span className="truncate text-[15px] text-textDark">{friend.fullName}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button type="submit" loading={saving}>Planı kur</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function nextHalfHour() {
  const date = new Date(Date.now() + 30 * 60_000);
  date.setMinutes(date.getMinutes() < 30 ? 30 : 60, 0, 0);
  return date;
}

/** datetime-local girdisi yerel saat bekler (saat dilimsiz). */
function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatWhen(date: Date) {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const time = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(date);
  if (date.toDateString() === today.toDateString()) return `Bugün ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Yarın ${time}`;
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(date);
}
