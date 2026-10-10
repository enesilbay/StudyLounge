import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { Button, ModalShell, Notice, TextField } from '../ui';

type FeedbackKind = 'bug' | 'idea' | 'other';

const KINDS: { value: FeedbackKind; label: string }[] = [
  { value: 'bug', label: 'Hata' },
  { value: 'idea', label: 'Öneri' },
  { value: 'other', label: 'Diğer' },
];

const PLACEHOLDERS: Record<FeedbackKind, string> = {
  bug: 'Ne yapıyordun, ne olmasını bekledin, ne oldu?',
  idea: 'Neyi daha iyi yapabiliriz?',
  other: 'Aklındakini yaz.',
};

/** Menüdeki "Geri bildirim" düğmesi ve formu. Bulunulan sayfa da gönderilir. */
export function FeedbackButton({ className = '' }: { className?: string }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const close = useCallback(() => {
    if (sending) return;
    setOpen(false);
    setError(null);
    if (sent) {
      setSent(false);
      setMessage('');
      setKind('bug');
    }
  }, [sending, sent]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return setError('Mesajını yaz.');
    setSending(true);
    setError(null);
    try {
      await api.post('/feedback', { kind, message: message.trim(), page: location.pathname });
      setSent(true);
    } catch (sendError) {
      setError(getApiErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Geri bildirim"
        title="Geri bildirim"
        className={`grid h-10 w-10 place-items-center rounded-lg text-textMuted transition hover:bg-sunken hover:text-textDark ${className}`}
      >
        <MessageSquareText className="h-[18px] w-[18px]" />
      </button>

      <ModalShell open={open} title="Geri bildirim" description="Hata mı buldun, bir fikrin mi var? Doğrudan bize ulaşır." onClose={close}>
        {sent ? (
          <div className="space-y-4">
            <Notice tone="success">Teşekkürler, geri bildirimin bize ulaştı.</Notice>
            <div className="flex justify-end">
              <Button onClick={close}>Kapat</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-textDark">Konu</legend>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-sunken p-1">
                {KINDS.map((item) => (
                  <label
                    key={item.value}
                    className={`flex min-h-10 cursor-pointer items-center justify-center rounded-md text-[15px] font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                      kind === item.value ? 'bg-surface text-textDark shadow-sm' : 'text-textMuted hover:text-textDark'
                    }`}
                  >
                    <input type="radio" name="feedback-kind" value={item.value} checked={kind === item.value} onChange={() => setKind(item.value)} className="sr-only" />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <TextField label="Mesajın" value={message} onChange={(value) => setMessage(value.slice(0, 2000))} placeholder={PLACEHOLDERS[kind]} multiline />
            <p className="-mt-2 text-right text-sm text-textMuted">{message.length} / 2000</p>
            {error ? <Notice tone="danger">{error}</Notice> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={close} disabled={sending}>
                Vazgeç
              </Button>
              <Button type="submit" loading={sending} disabled={!message.trim()}>
                Gönder
              </Button>
            </div>
          </form>
        )}
      </ModalShell>
    </>
  );
}
