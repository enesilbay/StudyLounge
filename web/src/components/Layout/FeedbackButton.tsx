import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Bug, CheckCircle2, Lightbulb, MessageSquareText, MessagesSquare, type LucideIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { Button, ModalShell, Notice, TextField } from '../ui';

type FeedbackKind = 'bug' | 'idea' | 'other';

const KINDS: { value: FeedbackKind; label: string; icon: LucideIcon; tile: string; hint: string }[] = [
  { value: 'bug', label: 'Hata', icon: Bug, tile: 'bg-mb-tile-6', hint: 'Bir şey bozuk' },
  { value: 'idea', label: 'Öneri', icon: Lightbulb, tile: 'bg-mb-tile-5', hint: 'Fikrin var' },
  { value: 'other', label: 'Diğer', icon: MessagesSquare, tile: 'bg-mb-tile-2', hint: 'Başka bir şey' },
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
            <div className="flex flex-col items-center rounded-[18px] bg-mb-tile-1 px-6 py-8 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-mb-card text-mb-action shadow-mb-card">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="mt-4 font-mb-display text-lg font-medium tracking-[-0.02em] text-mb-ink">Teşekkürler!</p>
              <p className="mt-1 text-sm text-mb-ink/70">Geri bildirimin bize ulaştı.</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={close}>Kapat</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-textDark">Konu</legend>
              <div className="grid grid-cols-3 gap-2">
                {KINDS.map((item) => {
                  const active = kind === item.value;
                  return (
                    <label
                      key={item.value}
                      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-[14px] border-2 px-2 py-3 text-center transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-mb-action ${
                        active ? `${item.tile} border-mb-ink/70 shadow-mb-card` : 'border-transparent bg-mb-surface hover:-translate-y-0.5 hover:shadow-mb-card'
                      }`}
                    >
                      <input type="radio" name="feedback-kind" value={item.value} checked={active} onChange={() => setKind(item.value)} className="sr-only" />
                      <span className={`grid h-9 w-9 place-items-center rounded-full text-mb-ink ${active ? 'bg-mb-card' : item.tile}`}>
                        <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span className="text-[15px] font-semibold text-mb-ink">{item.label}</span>
                      <span className="text-[12px] leading-tight text-mb-ink/60">{item.hint}</span>
                    </label>
                  );
                })}
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
