import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Undo2 } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { useAdminPending } from '../../lib/admin';
import { Button, Notice, Pill, StateBlock, Surface } from '../ui';

type FeedbackKind = 'bug' | 'idea' | 'other';
type Filter = 'open' | 'done' | 'all';

interface AdminFeedback {
  id: number;
  kind: FeedbackKind;
  message: string;
  page: string | null;
  userAgent: string | null;
  status: 'open' | 'done';
  createdAt: string;
  user: { id: number; username: string; fullName: string } | null;
}

const FILTERS: [Filter, string][] = [
  ['open', 'Açık'],
  ['done', 'Tamamlanan'],
  ['all', 'Tümü'],
];

const KIND_LABELS: Record<FeedbackKind, { label: string; tone: 'danger' | 'info' | 'neutral' }> = {
  bug: { label: 'Hata', tone: 'danger' },
  idea: { label: 'Öneri', tone: 'info' },
  other: { label: 'Diğer', tone: 'neutral' },
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

/** Yönetici: uygulama içinden gelen hata bildirimleri ve öneriler. */
export function FeedbackPanel() {
  const [filter, setFilter] = useState<Filter>('open');
  const [items, setItems] = useState<AdminFeedback[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshPending = useAdminPending((state) => state.refresh);

  const load = useCallback(async () => {
    try {
      const response = await api.get<AdminFeedback[]>('/admin/feedback', { params: { status: filter } });
      setItems(response.data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
      setItems([]);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: number, status: 'open' | 'done') => {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/admin/feedback/${id}`, { status });
      await load();
      void refreshPending();
    } catch (updateError) {
      setError(getApiErrorMessage(updateError));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 rounded-lg bg-sunken p-1" role="tablist" aria-label="Geri bildirim durumu">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`min-h-10 rounded-md px-4 text-[15px] font-semibold transition ${filter === key ? 'bg-surface text-textDark shadow-sm' : 'text-textMuted hover:text-textDark'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4">
          <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice>
        </div>
      ) : null}

      {items === null ? <StateBlock loading title="Geri bildirimler yükleniyor" /> : null}
      {items?.length === 0 ? <StateBlock title={filter === 'open' ? 'Açık geri bildirim yok' : 'Bu filtrede geri bildirim yok'} description="Kullanıcılar menüdeki geri bildirim düğmesiyle yazdığında burada görünür." /> : null}

      <ul className="space-y-3">
        {items?.map((item) => {
          const kind = KIND_LABELS[item.kind] ?? KIND_LABELS.other;
          const busy = busyId === item.id;
          return (
            <li key={item.id}>
              <Surface className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={kind.tone}>{kind.label}</Pill>
                  {item.status === 'done' ? <Pill>Tamamlandı</Pill> : null}
                  <span className="ml-auto text-sm text-textMuted">{dateFormatter.format(new Date(item.createdAt))}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-6 text-textDark">{item.message}</p>
                <p className="mt-2 text-sm text-textMuted">
                  {item.user ? (
                    <Link to={`/app/u/${item.user.id}`} className="font-semibold hover:underline">
                      {item.user.fullName} (@{item.user.username})
                    </Link>
                  ) : (
                    'Silinmiş kullanıcı'
                  )}
                </p>
                {item.page ? <p className="mt-1 text-sm text-textMuted">Sayfa: {item.page}</p> : null}
                {item.userAgent ? <p className="mt-1 truncate text-xs text-textMuted" title={item.userAgent}>{item.userAgent}</p> : null}
                <div className="mt-3 flex justify-end border-t border-border pt-3">
                  {item.status === 'open' ? (
                    <Button size="sm" icon={Check} disabled={busy} onClick={() => void setStatus(item.id, 'done')}>
                      Tamamlandı
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" icon={Undo2} disabled={busy} onClick={() => void setStatus(item.id, 'open')}>
                      Yeniden aç
                    </Button>
                  )}
                </div>
              </Surface>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
