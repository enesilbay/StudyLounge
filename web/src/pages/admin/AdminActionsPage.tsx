import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { ACTION_LABELS, dateTimeFormatter, numberFormatter } from '../../lib/admin';
import type { AdminActionRow, AdminActionType, Paged } from '../../lib/admin';
import { Button, Notice, PageHeader, Pill, StateBlock } from '../../components/ui';

const WORDS: Record<string, string> = { month: '1 ay', year: '1 yıl', unlimited: 'süresiz', user: 'kullanıcı', admin: 'yönetici' };

/** Tarih, plan ya da rol değerini okunur yazar. */
function word(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value !== 'string') return String(value as number);
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return dateTimeFormatter.format(new Date(value));
  return WORDS[value] ?? value;
}

/** İşlem türüne göre ayrıntının tek satırlık özeti. */
function describe(item: AdminActionRow): string | null {
  const d = item.details ?? {};
  switch (item.action) {
    case 'role':
      return `${word(d.from)} → ${word(d.to)}`;
    case 'mute':
      return `${word(d.hours)} saat · ${word(d.until)} tarihine kadar`;
    case 'premium_grant':
      return `${word(d.plan)} · ${d.until === 'süresiz' ? 'süresiz' : `${word(d.until)} tarihine kadar`}${d.from ? ` (önceki bitiş: ${word(d.from)})` : ''}`;
    case 'premium_revoke':
      return d.until ? `Bitiş ${word(d.until)} idi` : null;
    case 'export_users': {
      const filters = Array.isArray(d.filters) && d.filters.length ? ` · filtre: ${d.filters.join(', ')}` : '';
      return `${word(d.count)} satır${d.q ? ` · arama: "${String(d.q)}"` : ''}${filters}`;
    }
    case 'report_resolve':
    case 'report_dismiss':
      return d.reportId ? `Şikayet #${word(d.reportId)}` : null;
    default:
      return null;
  }
}

/** Yönetim: kim, kime, ne zaman, ne yaptı. Kayıtlar salt okunur. */
export default function AdminActionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const action = (searchParams.get('action') as AdminActionType | null) ?? '';
  const targetId = Number(searchParams.get('targetId')) || undefined;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [data, setData] = useState<Paged<AdminActionRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Paged<AdminActionRow>>('/admin/actions', { params: { action: action || undefined, targetId, page } });
      setData(response.data);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [action, targetId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (changes: Record<string, string | null>) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  };

  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const targetName = targetId ? data?.items.find((item) => item.target?.id === targetId)?.target?.username : undefined;

  return (
    <div>
      <PageHeader title="İşlem kaydı" description="Yöneticilerin yaptığı her işlem burada kalır; düzenlenemez ve silinemez." />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="admin-actions-filter">İşlem türü</label>
        <select
          id="admin-actions-filter"
          value={action}
          onChange={(event) => set({ action: event.target.value || null, page: null })}
          className="min-h-11 rounded-lg border border-border bg-surface px-3 text-[15px] font-semibold text-textDark outline-none focus:border-primary"
        >
          <option value="">Tüm işlemler</option>
          {(Object.keys(ACTION_LABELS) as AdminActionType[]).map((key) => (
            <option key={key} value={key}>
              {ACTION_LABELS[key].label}
            </option>
          ))}
        </select>
        {targetId ? (
          <button type="button" onClick={() => set({ targetId: null, page: null })} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary bg-softIndigo px-3.5 text-sm font-semibold text-textDark">
            {targetName ? `@${targetName}` : `Kullanıcı #${targetId}`}
            <X className="h-3.5 w-3.5" aria-label="Kişi filtresini kaldır" />
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4">
          <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice>
        </div>
      ) : null}
      {!data && loading ? <StateBlock loading title="İşlem kaydı yükleniyor" /> : null}
      {data && data.items.length === 0 ? <StateBlock title="Kayıt yok" description="Yönetici işlemleri yapıldıkça burada listelenir." /> : null}

      {data && data.items.length > 0 ? (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <ol className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-surface">
            {data.items.map((item) => {
              const meta = ACTION_LABELS[item.action] ?? { label: item.action, tone: 'neutral' as const };
              const summary = describe(item);
              return (
                <li key={item.id} className="grid gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[10.5rem_minmax(0,1fr)]">
                  <time className="text-sm tabular-nums text-textMuted" dateTime={item.createdAt}>
                    {dateTimeFormatter.format(new Date(item.createdAt))}
                  </time>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                      {item.target ? (
                        <Link to={`/admin/users/${item.target.id}`} className="font-semibold text-textDark underline-offset-2 hover:underline">
                          @{item.target.username}
                        </Link>
                      ) : item.targetLabel ? (
                        <span className="font-semibold text-textMuted" title="Hesap silinmiş">@{item.targetLabel} (silindi)</span>
                      ) : null}
                      <span className="text-sm text-textMuted">{item.admin ? `@${item.admin.username} tarafından` : item.adminLabel ? `@${item.adminLabel} (silindi) tarafından` : 'bilinmeyen yönetici'}</span>
                    </p>
                    {item.reason ? <p className="mt-1 text-[15px] text-textDark">“{item.reason}”</p> : null}
                    {summary ? <p className="mt-1 text-sm text-textMuted">{summary}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>

          <nav aria-label="Sayfalar" className="mt-4 flex items-center justify-between gap-3 text-sm text-textMuted">
            <span className="tabular-nums">{numberFormatter.format(data.total)} kayıt</span>
            <span className="flex gap-2">
              <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => set({ page: page - 1 > 1 ? String(page - 1) : null })}>
                Önceki
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= lastPage} onClick={() => set({ page: String(page + 1) })}>
                Sonraki
                <ChevronRight className="h-4 w-4" />
              </Button>
            </span>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
