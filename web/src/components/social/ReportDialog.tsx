import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import type { ReportReason } from '../../lib/types';
import { REPORT_REASON_LABELS } from '../../lib/moderation';
import { Button, ModalShell, Notice } from '../ui';

/** Kullanıcıyı ya da bir oda mesajını yöneticilere bildirir. */
export default function ReportDialog({
  target,
  messageId,
  messagePreview,
  onClose,
}: {
  target: { id: number; fullName: string } | null;
  messageId?: number;
  messagePreview?: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (!target) return;
    setReason('spam');
    setDetails('');
    setResult(null);
  }, [target]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) return;
    setSending(true);
    setResult(null);
    try {
      const response = await api.post<{ message?: string }>('/moderation/reports', {
        targetUserId: target.id,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
        ...(messageId ? { messageId } : {}),
      });
      setResult({ tone: 'success', text: response.data?.message ?? 'Şikayetin alındı.' });
      setTimeout(onClose, 1400);
    } catch (error) {
      setResult({ tone: 'danger', text: getApiErrorMessage(error) });
    } finally {
      setSending(false);
    }
  };

  return (
    <ModalShell open={Boolean(target)} title={`${target?.fullName ?? ''} kişisini şikayet et`} description="Şikayetler yalnızca yöneticilere görünür; karşı tarafa bildirilmez." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {messagePreview ? (
          <blockquote className="rounded-lg border-l-4 border-border bg-sunken px-3 py-2 text-[15px] text-textDark">{messagePreview}</blockquote>
        ) : null}
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-textDark">Sebep</legend>
          {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-sunken">
              <input type="radio" name="report-reason" value={key} checked={reason === key} onChange={() => setReason(key)} className="h-4 w-4 accent-[var(--sl-primary)]" />
              <span className="text-[15px] text-textDark">{REPORT_REASON_LABELS[key]}</span>
            </label>
          ))}
        </fieldset>
        <div>
          <label htmlFor="report-details" className="mb-1.5 block text-sm font-semibold text-textDark">Ayrıntı (isteğe bağlı)</label>
          <textarea
            id="report-details"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={500}
            placeholder="Ne oldu? Kısaca anlat."
            className="min-h-24 w-full rounded-lg border border-border bg-sunken px-3.5 py-2.5 text-base text-textDark outline-none focus:border-accent"
          />
        </div>
        {result ? <Notice tone={result.tone}>{result.text}</Notice> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="danger" loading={sending}>Şikayet et</Button>
        </div>
      </form>
    </ModalShell>
  );
}
