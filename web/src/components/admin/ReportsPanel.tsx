import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Check, MicOff, Undo2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import type { AdminReport } from '../../lib/types';
import { REPORT_REASON_LABELS } from '../../lib/moderation';
import { useAdminPending } from '../../lib/admin';
import { Avatar, Button, Notice, Pill, StateBlock, Surface } from '../ui';

type Filter = 'open' | 'resolved' | 'dismissed' | 'all';
const FILTERS: [Filter, string][] = [
  ['open', 'Açık'],
  ['resolved', 'Çözülen'],
  ['dismissed', 'Kapatılan'],
  ['all', 'Tümü'],
];

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

/** Şikayetleri inceler, kullanıcıyı susturur ya da yasaklar. */
export function ReportsPanel() {
  const [filter, setFilter] = useState<Filter>('open');
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const refreshPending = useAdminPending((state) => state.refresh);

  const load = useCallback(async () => {
    try {
      const response = await api.get<AdminReport[]>('/admin/reports', { params: { status: filter } });
      setReports(response.data);
    } catch (error) {
      setMessage({ tone: 'danger', text: getApiErrorMessage(error) });
      setReports([]);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (reportId: number, action: () => Promise<unknown>, success: string) => {
    setBusyId(reportId);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: success });
      await load();
      void refreshPending();
    } catch (error) {
      setMessage({ tone: 'danger', text: getApiErrorMessage(error) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 rounded-lg bg-sunken p-1" role="tablist" aria-label="Şikayet durumu">
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

      {message ? (
        <div className="mb-4">
          <Notice tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Notice>
        </div>
      ) : null}

      {reports === null ? <StateBlock loading title="Şikayetler yükleniyor" /> : null}
      {reports?.length === 0 ? <StateBlock title={filter === 'open' ? 'Açık şikayet yok' : 'Bu filtrede şikayet yok'} description="Yeni şikayetler burada görünür." /> : null}

      <ul className="space-y-3">
        {reports?.map((report) => {
          const muted = report.target.mutedUntil && new Date(report.target.mutedUntil) > new Date();
          const banned = Boolean(report.target.bannedAt);
          const busy = busyId === report.id;
          return (
            <li key={report.id}>
              <Surface className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link to={`/admin/users/${report.target.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
                    <Avatar name={report.target.fullName} image={report.target.avatarUrl} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-textDark">{report.target.fullName}</span>
                      <span className="block truncate text-sm text-textMuted">@{report.target.username}</span>
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
                  <blockquote className="mt-3 rounded-lg bg-sunken px-3 py-2 text-[15px] text-textDark">
                    {report.messageText}
                    {report.roomName ? <span className="mt-1 block text-xs text-textMuted">{report.roomName} odasında</span> : null}
                  </blockquote>
                ) : null}
                {report.details ? <p className="mt-2 text-[15px] text-textDark">{report.details}</p> : null}
                <p className="mt-2 text-sm text-textMuted">
                  {report.reporter.fullName} bildirdi, {dateFormatter.format(new Date(report.createdAt))}
                  {report.resolvedBy ? `. ${report.resolvedBy.fullName} ${report.status === 'resolved' ? 'çözdü' : 'kapattı'}.` : ''}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  {muted ? (
                    <Button size="sm" variant="ghost" icon={Undo2} disabled={busy} onClick={() => void act(report.id, () => api.delete(`/admin/users/${report.target.id}/mute`), 'Susturma kaldırıldı.')}>
                      Susturmayı kaldır
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="secondary" icon={MicOff} disabled={busy} onClick={() => void act(report.id, () => api.post(`/admin/users/${report.target.id}/mute`, { hours: 24, reason: `Şikayet #${report.id}` }), '24 saat susturuldu.')}>
                        24 saat sustur
                      </Button>
                      <Button size="sm" variant="secondary" icon={MicOff} disabled={busy} onClick={() => void act(report.id, () => api.post(`/admin/users/${report.target.id}/mute`, { hours: 168, reason: `Şikayet #${report.id}` }), '7 gün susturuldu.')}>
                        7 gün sustur
                      </Button>
                    </>
                  )}
                  {banned ? (
                    <Button size="sm" variant="ghost" icon={Undo2} disabled={busy} onClick={() => void act(report.id, () => api.delete(`/admin/users/${report.target.id}/ban`), 'Yasak kaldırıldı.')}>
                      Yasağı kaldır
                    </Button>
                  ) : (
                    <Button size="sm" variant="danger" icon={Ban} disabled={busy} onClick={() => void act(report.id, () => api.post(`/admin/users/${report.target.id}/ban`, { reason: `Şikayet #${report.id}` }), 'Hesap askıya alındı.')}>
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
    </div>
  );
}
