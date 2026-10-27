import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { ACTION_LABELS, dateTimeFormatter } from '../../lib/admin';
import type { AdminActionRow, AdminActionType } from '../../lib/admin';
import { Button, PageHeader, Pill, StateBlock } from '../../components/ui';
import { Pager } from '../../components/admin/Pager';
import { usePagedList } from '../../components/admin/pagedList';

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
    case 'room_owner':
      return `${String(d.roomName ?? '')}: ${word(d.from)} → ${word(d.to)}`;
    case 'room_lock':
    case 'room_unlock':
      return d.roomName ? String(d.roomName) : null;
    case 'room_close':
      return `${String(d.roomName ?? '')} · ${word(d.memberCount)} kişi vardı`;
    case 'announcement_create':
    case 'announcement_update':
    case 'announcement_delete':
      return d.message ? `“${String(d.message)}”` : null;
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

  const set = useCallback(
    (changes: Record<string, string | null>) => {
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
    },
    [setSearchParams],
  );

  // URL'deki sayfa son sayfayı aşarsa son sayfaya dön.
  const clampPage = useCallback((last: number) => set({ page: last > 1 ? String(last) : null }), [set]);
  const { data, loading, error, reload } = usePagedList<AdminActionRow>('/admin/actions', { action: action || undefined, targetId }, page, undefined, clampPage);

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
          className="min-h-11 rounded-lg border border-mb-line bg-mb-card px-3 text-[15px] font-semibold text-mb-ink outline-none focus:border-mb-action"
        >
          <option value="">Tüm işlemler</option>
          {(Object.keys(ACTION_LABELS) as AdminActionType[]).map((key) => (
            <option key={key} value={key}>
              {ACTION_LABELS[key].label}
            </option>
          ))}
        </select>
        {targetId ? (
          <button type="button" onClick={() => set({ targetId: null, page: null })} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-mb-action bg-mb-tint px-3.5 text-sm font-semibold text-mb-ink">
            {targetName ? `@${targetName}` : `Kullanıcı #${targetId}`}
            <X className="h-3.5 w-3.5" aria-label="Kişi filtresini kaldır" />
          </button>
        ) : null}
      </div>

      {!data && loading && !error ? <StateBlock loading title="İşlem kaydı yükleniyor" /> : null}
      {error ? (
        <StateBlock
          tone="danger"
          title="İşlem kaydı yüklenemedi"
          description={error}
          action={<Button variant="secondary" size="sm" onClick={() => void reload()}>Tekrar dene</Button>}
        />
      ) : null}
      {!error && data && data.items.length === 0 ? <StateBlock title="Kayıt yok" description="Yönetici işlemleri yapıldıkça burada listelenir." /> : null}

      {!error && data && data.items.length > 0 ? (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <ol className="divide-y divide-mb-line overflow-hidden rounded-[14px] border border-mb-line bg-mb-card">
            {data.items.map((item) => {
              const meta = ACTION_LABELS[item.action] ?? { label: item.action, tone: 'neutral' as const };
              const summary = describe(item);
              return (
                <li key={item.id} className="grid gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[10.5rem_minmax(0,1fr)]">
                  <time className="text-sm tabular-nums text-mb-body" dateTime={item.createdAt}>
                    {dateTimeFormatter.format(new Date(item.createdAt))}
                  </time>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                      {item.target ? (
                        <Link to={`/admin/users/${item.target.id}`} className="font-semibold text-mb-ink underline-offset-2 hover:underline">
                          @{item.target.username}
                        </Link>
                      ) : item.targetLabel ? (
                        <span className="font-semibold text-mb-body" title="Hesap silinmiş">@{item.targetLabel} (silindi)</span>
                      ) : null}
                      <span className="text-sm text-mb-body">{item.admin ? `@${item.admin.username} tarafından` : item.adminLabel ? `@${item.adminLabel} (silindi) tarafından` : 'bilinmeyen yönetici'}</span>
                    </p>
                    {item.reason ? <p className="mt-1 text-[15px] text-mb-ink">“{item.reason}”</p> : null}
                    {summary ? <p className="mt-1 text-sm text-mb-body">{summary}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>

          <Pager data={data} page={page} onPage={(next) => set({ page: next > 1 ? String(next) : null })} />
        </div>
      ) : null}
    </div>
  );
}
