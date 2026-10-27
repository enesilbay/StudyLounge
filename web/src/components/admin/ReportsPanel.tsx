import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Check, MicOff, Undo2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import type { AdminReport } from '../../lib/types';
import { REPORT_REASON_LABELS } from '../../lib/moderation';
import { useAdminPending } from '../../lib/admin';
import { Avatar, Button, Notice, Pill, StateBlock, Surface } from '../ui';
import { UserActionDialog } from './UserActionDialog';
import { Pager } from './Pager';
import { usePagedList } from './pagedList';
import { banConfig, muteConfig, unbanConfig, unmuteConfig, type WithDone } from './userActions';

type Filter = 'open' | 'resolved' | 'dismissed' | 'all';
const FILTERS: [Filter, string][] = [
  ['open', 'Açık'],
  ['resolved', 'Çözülen'],
  ['dismissed', 'Kapatılan'],
  ['all', 'Tümü'],
];

const PAGE_SIZE = 25;
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

/** Şikayetleri inceler, kullanıcıyı susturur ya da yasaklar (her yaptırım onay ve gerekçe ister). */
export function ReportsPanel() {
  const [filter, setFilter] = useState<Filter>('open');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [dialog, setDialog] = useState<WithDone | null>(null);
  const refreshPending = useAdminPending((state) => state.refresh);

  const { data, loading, error, reload } = usePagedList<AdminReport>('/admin/reports', { status: filter }, page, PAGE_SIZE, setPage);

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  const act = async (reportId: number, action: () => Promise<unknown>, success: string) => {
    setBusyId(reportId);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: success });
      await reload();
      void refreshPending();
    } catch (actionError) {
      setMessage({ tone: 'danger', text: getApiErrorMessage(actionError) });
    } finally {
      setBusyId(null);
    }
  };

  /** Yaptırım iletişim kutusu başarıyla kapanınca listeyi ve bekleyen sayacını tazeler. */
  const afterSanction = (text: string) => () => {
    setDialog(null);
    setMessage({ tone: 'success', text });
    void reload();
    void refreshPending();
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 rounded-lg bg-mb-surface p-1" role="tablist" aria-label="Şikayet durumu">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => changeFilter(key)}
            className={`min-h-10 rounded-md px-4 text-[15px] font-semibold transition ${filter === key ? 'bg-mb-card text-mb-ink shadow-sm' : 'text-mb-body hover:text-mb-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <div className="mb-4">
          <Notice tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Notice>
        </div>
      ) : null}

      {loading && !data && !error ? <StateBlock loading title="Şikayetler yükleniyor" /> : null}
      {error ? (
        <StateBlock
          tone="danger"
          title="Şikayetler yüklenemedi"
          description={error}
          action={<Button variant="secondary" size="sm" onClick={() => void reload()}>Tekrar dene</Button>}
        />
      ) : null}
      {!error && data?.items.length === 0 ? <StateBlock title={filter === 'open' ? 'Açık şikayet yok' : 'Bu filtrede şikayet yok'} description="Yeni şikayetler burada görünür." /> : null}

      {!error && data && data.items.length > 0 ? (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <ul className="space-y-3">
            {data.items.map((report) => {
              const muted = report.target.mutedUntil && new Date(report.target.mutedUntil) > new Date();
              const banned = Boolean(report.target.bannedAt);
              const busy = busyId === report.id;
              const reason = `Şikayet #${report.id}`;
              const target = report.target;
              return (
                <li key={report.id}>
                  <Surface className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Link to={`/admin/users/${target.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
                        <Avatar name={target.fullName} image={target.avatarUrl} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-mb-ink">{target.fullName}</span>
                          <span className="block truncate text-sm text-mb-body">@{target.username}</span>
                        </span>
                      </Link>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Pill tone="danger">{REPORT_REASON_LABELS[report.reason] ?? report.reason}</Pill>
                        {muted ? <Pill tone="info">Susturuldu</Pill> : null}
                        {banned ? <Pill tone="danger">Yasaklı</Pill> : null}
                        {report.status !== 'open' ? <Pill>{report.status === 'resolved' ? 'Çözüldü' : 'Kapatıldı'}</Pill> : null}
                      </div>
                    </div>

                    {report.messageText ? (
                      <blockquote className="mt-3 rounded-lg bg-mb-surface px-3 py-2 text-[15px] text-mb-ink">
                        {report.messageText}
                        {report.roomName ? <span className="mt-1 block text-xs text-mb-body">{report.roomName} odasında</span> : null}
                      </blockquote>
                    ) : null}
                    {report.details ? <p className="mt-2 text-[15px] text-mb-ink">{report.details}</p> : null}
                    <p className="mt-2 text-sm text-mb-body">
                      {report.reporter.fullName} bildirdi, {dateFormatter.format(new Date(report.createdAt))}
                      {report.resolvedBy ? `. ${report.resolvedBy.fullName} ${report.status === 'resolved' ? 'çözdü' : 'kapattı'}.` : ''}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-mb-line pt-3">
                      {muted ? (
                        <Button size="sm" variant="ghost" icon={Undo2} disabled={busy} onClick={() => setDialog(unmuteConfig(target.id, afterSanction('Susturma kaldırıldı.')))}>
                          Susturmayı kaldır
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" icon={MicOff} disabled={busy} onClick={() => setDialog(muteConfig(target.id, afterSanction('24 saat susturuldu.'), { hours: '24', reason }))}>
                            24 saat sustur
                          </Button>
                          <Button size="sm" variant="secondary" icon={MicOff} disabled={busy} onClick={() => setDialog(muteConfig(target.id, afterSanction('7 gün susturuldu.'), { hours: '168', reason }))}>
                            7 gün sustur
                          </Button>
                        </>
                      )}
                      {banned ? (
                        <Button size="sm" variant="ghost" icon={Undo2} disabled={busy} onClick={() => setDialog(unbanConfig(target.id, afterSanction('Yasak kaldırıldı.')))}>
                          Yasağı kaldır
                        </Button>
                      ) : (
                        <Button size="sm" variant="danger" icon={Ban} disabled={busy} onClick={() => setDialog(banConfig(target.id, target.username ?? target.fullName, afterSanction('Hesap askıya alındı.'), { reason }))}>
                          Yasakla
                        </Button>
                      )}
                      {report.status === 'open' ? (
                        <span className="ml-auto flex gap-2">
                          <Button size="sm" variant="ghost" icon={X} disabled={busy} onClick={() => void act(report.id, () => api.patch(`/admin/reports/${report.id}`, { status: 'dismissed' }), 'Şikayet kapatıldı.')}>
                            Kapat
                          </Button>
                          <Button size="sm" icon={Check} disabled={busy} onClick={() => void act(report.id, () => api.patch(`/admin/reports/${report.id}`, { status: 'resolved' }), 'Şikayet çözüldü olarak işaretlendi.')}>
                            Çözüldü
                          </Button>
                        </span>
                      ) : null}
                    </div>
                  </Surface>
                </li>
              );
            })}
          </ul>
          <Pager data={data} page={page} onPage={setPage} />
        </div>
      ) : null}

      {dialog ? <UserActionDialog config={dialog} onClose={() => setDialog(null)} onDone={dialog.onDone} /> : null}
    </div>
  );
}
