import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CircleStop, Megaphone, Send, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { dateTimeFormatter } from '../../lib/admin';
import type { AdminAnnouncementRow, AnnouncementStatus, AnnouncementTone } from '../../lib/admin';
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<AnnouncementTone>('info');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState(() => toLocalInput(new Date(Date.now() + 24 * 3600 * 1000)));
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<AdminAnnouncementRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<AdminAnnouncementRow[]>('/admin/announcements');
      setItems(response.data);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setDuration = (hours: number) => {
    const from = startsAt ? new Date(startsAt) : new Date();
    setEndsAt(toLocalInput(new Date(from.getTime() + hours * 3600 * 1000)));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!message.trim()) return setFormError('Duyuru metnini yaz.');
    if (!endsAt) return setFormError('Bitiş zamanını seç.');
    setSending(true);
    try {
      await api.post('/admin/announcements', {
        message: message.trim(),
        tone,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: new Date(endsAt).toISOString(),
      });
      setMessage('');
      setStartsAt('');
      setNotice(startsAt ? 'Duyuru planlandı.' : 'Duyuru yayında.');
      await load();
    } catch (sendError) {
      setFormError(getApiErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  };

  const endNow = async (item: AdminAnnouncementRow) => {
    setBusyId(item.id);
    try {
      await api.patch(`/admin/announcements/${item.id}`, { endsAt: new Date().toISOString() });
      setNotice('Duyuru bitirildi.');
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
    } finally {
      setBusyId(null);
    }
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
              onChange={(event) => setStartsAt(event.target.value)}
              className="min-h-11 w-full rounded-[12px] border border-mb-line bg-mb-surface px-3.5 text-base text-mb-ink outline-none focus:border-mb-action"
            />
            <p className="mt-1.5 text-sm text-mb-body">Boş bırakırsan hemen başlar.</p>
          </div>
          <div>
            <label htmlFor="ann-end" className="mb-1.5 block text-sm font-semibold text-mb-ink">Bitiş</label>
            <input
              id="ann-end"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              required
              className="min-h-11 w-full rounded-[12px] border border-mb-line bg-mb-surface px-3.5 text-base text-mb-ink outline-none focus:border-mb-action"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DURATIONS.map((item) => (
                <button
                  key={item.hours}
                  type="button"
                  onClick={() => setDuration(item.hours)}
                  className="min-h-8 rounded-full border border-mb-line px-3 text-sm font-semibold text-mb-body transition hover:text-mb-ink"
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
        {loading && !items ? (
          <StateBlock loading title="Duyurular yükleniyor" />
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
