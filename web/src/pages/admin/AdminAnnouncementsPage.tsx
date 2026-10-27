import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CircleStop, Megaphone, Pencil, Save, Send, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { dateTimeFormatter } from '../../lib/admin';
import type { AdminAnnouncementRow, AnnouncementStatus, AnnouncementTone } from '../../lib/admin';
import { defaultEnd } from '../../components/admin/announcementTime';
import { Button, ModalShell, Notice, PageHeader, Pill, StateBlock, TextField } from '../../components/ui';

const MAX_LENGTH = 280;

const TONES: { value: AnnouncementTone; label: string; hint: string }[] = [
  { value: 'info', label: 'Bilgi', hint: 'Yeni özellik, genel haber' },
  { value: 'warning', label: 'Uyarı', hint: 'Bakım, kesinti' },
];

const DURATIONS = [
  { label: '1 saat', hours: 1 },
  { label: '6 saat', hours: 6 },
  { label: '1 gün', hours: 24 },
  { label: '3 gün', hours: 72 },
  { label: '1 hafta', hours: 168 },
];

const STATUS: Record<AnnouncementStatus, { label: string; tone: 'success' | 'info' | 'neutral' }> = {
  live: { label: 'Yayında', tone: 'success' },
  scheduled: { label: 'Planlı', tone: 'info' },
  ended: { label: 'Bitti', tone: 'neutral' },
};

/** `datetime-local` alanı için yerel saatte `YYYY-MM-DDTHH:mm`. */
function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Yönetim: uygulama üstü duyurular. Başlangıç ve bitiş arasında herkese görünür. */
export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<AdminAnnouncementRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const latest = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<AnnouncementTone>('info');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState(() => toLocalInput(defaultEnd('', 24)));
  // Bitişe elle dokunulmadıysa gönderim anında seçili süreden yeniden hesaplanır.
  const [hours, setHours] = useState(24);
  const [endsAuto, setEndsAuto] = useState(true);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<AdminAnnouncementRow | null>(null);
  const [editing, setEditing] = useState<AdminAnnouncementRow | null>(null);

  const load = useCallback(async () => {
    const requestId = ++latest.current;
    setLoading(true);
    try {
      const response = await api.get<AdminAnnouncementRow[]>('/admin/announcements');
      if (requestId !== latest.current) return;
      setItems(Array.isArray(response.data) ? response.data : []);
      setLoadError(null);
    } catch (failure) {
      if (requestId !== latest.current) return;
      setLoadError(getApiErrorMessage(failure));
    } finally {
      if (requestId === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setDuration = (value: number) => {
    setHours(value);
    setEndsAuto(true);
    setEndsAt(toLocalInput(defaultEnd(startsAt, value)));
  };

  const changeStart = (value: string) => {
    setStartsAt(value);
    if (endsAuto) setEndsAt(toLocalInput(defaultEnd(value, hours)));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!message.trim()) return setFormError('Duyuru metnini yaz.');
    if (!endsAt) return setFormError('Bitiş zamanını seç.');
    setSending(true);
    try {
      const end = endsAuto ? defaultEnd(startsAt, hours) : new Date(endsAt);
      await api.post('/admin/announcements', {
        message: message.trim(),
        tone,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: end.toISOString(),
      });
      setMessage('');
      setStartsAt('');
      setEndsAuto(true);
      setEndsAt(toLocalInput(defaultEnd('', hours)));
      setNotice(startsAt ? 'Duyuru planlandı.' : 'Duyuru yayında.');
      await load();
    } catch (sendError) {
      setFormError(getApiErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  };

  /** Yayındaki duyuruyu şimdi bitirir; henüz başlamamış (planlı) duyuruyu siler. */
  const endNow = async (item: AdminAnnouncementRow) => {
    setBusyId(item.id);
    try {
      if (item.status === 'scheduled') {
        // Bitişi şimdiye çekmek başlangıçtan önce kalacağı için sunucu reddeder; planlı duyuruyu iptal etmek silmektir.
        await api.delete(`/admin/announcements/${item.id}`);
        setNotice('Planlı duyuru iptal edildi.');
      } else {
        await api.patch(`/admin/announcements/${item.id}`, { endsAt: new Date().toISOString() });
        setNotice('Duyuru bitirildi.');
      }
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async (item: AdminAnnouncementRow, changes: { message: string; tone: AnnouncementTone; startsAt: string; endsAt: string }) => {
    await api.patch(`/admin/announcements/${item.id}`, {
      message: changes.message,
      tone: changes.tone,
      startsAt: new Date(changes.startsAt).toISOString(),
      endsAt: new Date(changes.endsAt).toISOString(),
    });
    setEditing(null);
    setNotice('Duyuru güncellendi.');
    await load();
  };

  const remove = async (item: AdminAnnouncementRow) => {
    setBusyId(item.id);
    try {
      await api.delete(`/admin/announcements/${item.id}`);
      setToDelete(null);
      setNotice('Duyuru silindi.');
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Yönetim"
        title="Duyurular"
        description="Uygulamanın üstünde görünen kısa duyuru. Başlangıç ve bitiş arasında yayında kalır; kullanıcı kapatabilir."
      />

      <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4 rounded-[16px] border border-mb-line bg-mb-card p-5">
        <div>
          <TextField label="Duyuru metni" value={message} onChange={(value) => setMessage(value.slice(0, MAX_LENGTH))} multiline placeholder="Örn. Bu gece 02:00–03:00 arası bakım var, odalar kısa süre kapalı olabilir." />
          <p className="mt-1 text-right text-sm text-mb-body">{message.length} / {MAX_LENGTH}</p>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-mb-ink">Tür</legend>
          <div className="flex flex-wrap gap-2">
            {TONES.map((item) => (
              <label
                key={item.value}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[12px] border px-3.5 transition ${tone === item.value ? 'border-mb-action bg-mb-surface' : 'border-mb-line'}`}
              >
                <input type="radio" name="tone" value={item.value} checked={tone === item.value} onChange={() => setTone(item.value)} className="accent-[var(--color-mb-action)]" />
                <span className="font-semibold text-mb-ink">{item.label}</span>
                <span className="text-sm text-mb-body">{item.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ann-start" className="mb-1.5 block text-sm font-semibold text-mb-ink">Başlangıç</label>
            <input
              id="ann-start"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => changeStart(event.target.value)}
              className="min-h-11 w-full rounded-[12px] border border-mb-field bg-mb-surface px-3.5 text-base text-mb-ink outline-none focus:border-mb-action"
            />
            <p className="mt-1.5 text-sm text-mb-body">Boş bırakırsan hemen başlar.</p>
          </div>
          <div>
            <label htmlFor="ann-end" className="mb-1.5 block text-sm font-semibold text-mb-ink">Bitiş</label>
            <input
              id="ann-end"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => {
                setEndsAt(event.target.value);
                setEndsAuto(false);
              }}
              required
              className="min-h-11 w-full rounded-[12px] border border-mb-field bg-mb-surface px-3.5 text-base text-mb-ink outline-none focus:border-mb-action"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DURATIONS.map((item) => (
                <button
                  key={item.hours}
                  type="button"
                  onClick={() => setDuration(item.hours)}
                  aria-pressed={endsAuto && hours === item.hours}
                  className={`min-h-8 rounded-full border px-3 text-sm font-semibold transition hover:text-mb-ink ${endsAuto && hours === item.hours ? 'border-mb-action text-mb-ink' : 'border-mb-line text-mb-body'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        <div className="flex justify-end">
          <Button type="submit" icon={Send} loading={sending}>Yayınla</Button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {notice ? <Notice tone="success" onDismiss={() => setNotice(null)}>{notice}</Notice> : null}
        {error ? <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice> : null}
      </div>

      <div className="mt-5">
        {loading && !items && !loadError ? (
          <StateBlock loading title="Duyurular yükleniyor" />
        ) : loadError ? (
          <StateBlock
            tone="danger"
            title="Duyurular yüklenemedi"
            description={loadError}
            action={<Button variant="secondary" size="sm" onClick={() => void load()}>Tekrar dene</Button>}
          />
        ) : !items?.length ? (
          <StateBlock title="Henüz duyuru yok" description="Yukarıdaki formdan ilk duyuruyu yayınla." />
        ) : (
          <ul className="divide-y divide-mb-line overflow-hidden rounded-[16px] border border-mb-line bg-mb-card">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Pill>
                    {item.tone === 'warning' ? <Pill tone="accent">Uyarı</Pill> : null}
                  </div>
                  <p className="mt-1.5 flex items-start gap-2 text-base text-mb-ink">
                    <Megaphone className="mt-1 h-4 w-4 shrink-0 text-mb-body" aria-hidden="true" />
                    <span className="min-w-0 break-words">{item.message}</span>
                  </p>
                  <p className="mt-1 text-sm text-mb-body">
                    {dateTimeFormatter.format(new Date(item.startsAt))} → {dateTimeFormatter.format(new Date(item.endsAt))}
                    {item.createdBy ? ` · ${item.createdBy.username}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(item)}>Düzenle</Button>
                  {item.status !== 'ended' ? (
                    <Button size="sm" variant="secondary" icon={CircleStop} loading={busyId === item.id} onClick={() => void endNow(item)}>
                      {item.status === 'live' ? 'Şimdi bitir' : 'İptal et'}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="danger" icon={Trash2} onClick={() => setToDelete(item)}>Sil</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing ? <EditAnnouncementDialog item={editing} onClose={() => setEditing(null)} onSave={(changes) => saveEdit(editing, changes)} /> : null}

      {toDelete ? (
        <ModalShell open title="Duyuru silinsin mi?" description="Duyuru listeden kalkar. İşlem kaydında metni görünmeye devam eder." onClose={() => setToDelete(null)}>
          <p className="mb-5 rounded-[12px] border border-mb-line bg-mb-surface p-3 text-base text-mb-ink">{toDelete.message}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setToDelete(null)} disabled={busyId !== null}>Vazgeç</Button>
            <Button variant="danger" icon={Trash2} loading={busyId === toDelete.id} onClick={() => void remove(toDelete)}>Sil</Button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

/** Duyuru düzenleme penceresi: metin, tür, başlangıç ve bitiş (mevcut PATCH ucu). */
function EditAnnouncementDialog({
  item,
  onClose,
  onSave,
}: {
  item: AdminAnnouncementRow;
  onClose: () => void;
  onSave: (changes: { message: string; tone: AnnouncementTone; startsAt: string; endsAt: string }) => Promise<void>;
}) {
  const [message, setMessage] = useState(item.message);
  const [tone, setTone] = useState<AnnouncementTone>(item.tone);
  const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date(item.startsAt)));
  const [endsAt, setEndsAt] = useState(() => toLocalInput(new Date(item.endsAt)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!message.trim()) return setError('Duyuru metnini yaz.');
    if (!startsAt || !endsAt) return setError('Başlangıç ve bitiş zamanını seç.');
    if (new Date(endsAt) <= new Date(startsAt)) return setError('Bitiş, başlangıçtan sonra olmalı.');
    setBusy(true);
    try {
      await onSave({ message: message.trim(), tone, startsAt, endsAt });
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
      setBusy(false);
    }
  };

  return (
    <ModalShell open title="Duyuruyu düzenle" onClose={busy ? () => undefined : onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <div>
          <TextField label="Duyuru metni" value={message} onChange={(value) => setMessage(value.slice(0, MAX_LENGTH))} multiline />
          <p className="mt-1 text-right text-sm text-mb-body">{message.length} / {MAX_LENGTH}</p>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-mb-ink">Tür</legend>
          <div className="flex flex-wrap gap-2">
            {TONES.map((option) => (
              <label key={option.value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[12px] border px-3.5 transition ${tone === option.value ? 'border-mb-action bg-mb-surface' : 'border-mb-line'}`}>
                <input type="radio" name="edit-tone" value={option.value} checked={tone === option.value} onChange={() => setTone(option.value)} className="accent-[var(--color-mb-action)]" />
                <span className="font-semibold text-mb-ink">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ann-edit-start" className="mb-1.5 block text-sm font-semibold text-mb-ink">Başlangıç</label>
            <input id="ann-edit-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required className="min-h-11 w-full rounded-[12px] border border-mb-field bg-mb-surface px-3.5 text-base text-mb-ink outline-none focus:border-mb-action" />
          </div>
          <div>
            <label htmlFor="ann-edit-end" className="mb-1.5 block text-sm font-semibold text-mb-ink">Bitiş</label>
            <input id="ann-edit-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required className="min-h-11 w-full rounded-[12px] border border-mb-field bg-mb-surface px-3.5 text-base text-mb-ink outline-none focus:border-mb-action" />
          </div>
        </div>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Vazgeç</Button>
          <Button type="submit" icon={Save} loading={busy}>Kaydet</Button>
        </div>
      </form>
    </ModalShell>
  );
}
