import { useId, useState, type FormEvent } from 'react';
import { Button, ModalShell, Notice, TextField } from '../ui';

export interface ActionChoice {
  value: string;
  label: string;
}

export interface UserActionConfig {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  /** Seçenekler (ör. susturma süresi, Premium süresi); ilki varsayılan. */
  choices?: ActionChoice[];
  choicesLabel?: string;
  reasonRequired?: boolean;
  /** Doluysa onay için bu metin (kullanıcı adı) aynen yazılmalı. */
  confirmText?: string;
  run: (input: { choice?: string; reason: string; confirmation: string }) => Promise<unknown>;
}

/** Yönetici işlemi onayı: isteğe bağlı seçenek, gerekçe ve (silmede) kullanıcı adı onayı. */
export function UserActionDialog({ config, onClose, onDone }: { config: UserActionConfig; onClose: () => void; onDone: () => void }) {
  const [choice, setChoice] = useState(config.choices?.[0]?.value);
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const groupId = useId();

  const reasonOk = !config.reasonRequired || reason.trim().length >= 3;
  const confirmOk = !config.confirmText || confirmation.trim() === config.confirmText;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reasonOk || !confirmOk) return;
    setBusy(true);
    setError(null);
    try {
      await config.run({ choice, reason: reason.trim(), confirmation: confirmation.trim() });
      onDone();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
      setBusy(false);
    }
  };

  return (
    <ModalShell open title={config.title} description={config.description} onClose={busy ? () => undefined : onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        {config.choices ? (
          <fieldset>
            <legend id={groupId} className="mb-1.5 text-sm font-semibold text-textDark">{config.choicesLabel ?? 'Seçenek'}</legend>
            <div className="flex flex-wrap gap-1 rounded-lg bg-sunken p-1" role="radiogroup" aria-labelledby={groupId}>
              {config.choices.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={choice === item.value}
                  onClick={() => setChoice(item.value)}
                  className={`min-h-9 flex-1 rounded-md px-3 text-sm font-semibold transition ${choice === item.value ? 'bg-surface text-textDark shadow-sm' : 'text-textMuted hover:text-textDark'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        <TextField
          label={config.reasonRequired ? 'Gerekçe' : 'Gerekçe (isteğe bağlı)'}
          value={reason}
          onChange={setReason}
          multiline
          placeholder="İşlem kaydında görünür."
          helper={config.reasonRequired ? 'Bu işlem için gerekçe zorunlu.' : undefined}
        />

        {config.confirmText ? (
          <TextField
            label={`Onaylamak için kullanıcı adını yaz: ${config.confirmText}`}
            value={confirmation}
            onChange={setConfirmation}
            placeholder={config.confirmText}
          />
        ) : null}

        {error ? <Notice tone="danger">{error}</Notice> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="submit" variant={config.danger ? 'danger' : 'primary'} loading={busy} disabled={!reasonOk || !confirmOk}>
            {config.confirmLabel}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
