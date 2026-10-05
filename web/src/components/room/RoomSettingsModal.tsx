import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { DoorClosed, Lock, LockOpen } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import type { Lobby } from '../../lib/types';
import { Button, ModalShell, Notice, TextField, Toggle } from '../ui';

/**
 * Oda sahibinin ayarları. Açıklama/kategori/şifre/kapasite kaydedilir; kilit ve kapatma
 * odadaki herkese anında yansır (socket). Oda adı değiştirilemez.
 */
export default function RoomSettingsModal({
  open,
  lobby,
  categories,
  onClose,
  onSaved,
  onToggleLock,
  onCloseRoom,
}: {
  open: boolean;
  lobby: Lobby;
  categories: string[];
  onClose: () => void;
  onSaved: (lobby: Lobby) => void;
  onToggleLock: (locked: boolean) => void;
  onCloseRoom: () => void;
}) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Genel');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [capacity, setCapacity] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setDescription(lobby.description ?? '');
    setCategory(lobby.category ?? 'Genel');
    setIsPrivate(Boolean(lobby.isPrivate));
    setPassword('');
    setCapacity(String(lobby.maxUsers ?? ''));
    setConfirmClose(false);
    setMessage(null);
    // Yalnızca pencere açılırken forma yazılır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (isPrivate && !lobby.isPrivate && !password.trim()) {
      return setMessage({ tone: 'danger', text: 'Şifreli oda için bir şifre belirle.' });
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await api.patch<Lobby>(`/lobbies/${lobby.id}`, {
        description: description.trim(),
        category,
        isPrivate,
        ...(isPrivate && password.trim() ? { password: password.trim() } : {}),
        ...(capacity ? { maxUsers: Number(capacity) } : {}),
      });
      onSaved(response.data);
      setPassword('');
      setMessage({ tone: 'success', text: 'Oda ayarları kaydedildi.' });
    } catch (error) {
      setMessage({ tone: 'danger', text: getApiErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const selectCls = 'min-h-11 w-full rounded-lg border border-border bg-sunken px-3 text-base text-textDark outline-none focus:border-accent';

  return (
    <ModalShell open={open} title="Oda ayarları" description={`"${lobby.name}" odasının sahibisin. Oda adı değiştirilemez.`} onClose={onClose}>
      <div className="space-y-5">
        <Toggle
          label="Yeni girişleri kapat"
          description={lobby.isLocked ? 'Kapalı. Şu an odada olanlar sayfayı yenilese de geri girebilir.' : 'Açık. Odayı bulan herkes girebilir.'}
          checked={Boolean(lobby.isLocked)}
          onChange={(locked) => onToggleLock(locked)}
          trailing={lobby.isLocked ? <Lock className="h-4 w-4 text-textMuted" /> : <LockOpen className="h-4 w-4 text-textMuted" />}
        />

        <form onSubmit={save} className="space-y-4 border-t border-border pt-5">
          <TextField label="Açıklama" value={description} onChange={setDescription} multiline placeholder="Ne çalışılıyor, oda kuralları neler?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="room-settings-category" className="mb-1.5 block text-sm font-semibold text-textDark">Kategori</label>
              <select id="room-settings-category" value={category} onChange={(event) => setCategory(event.target.value)} className={selectCls}>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <TextField label="Kapasite" type="number" value={capacity} onChange={setCapacity} helper={lobby.allowVideo ? 'Kameralı odalarda en fazla 6.' : '2 ile 250 arası.'} />
          </div>
          <Toggle label="Şifreli oda" description="Yalnızca şifreyi bilenler girer. Şifreyi değiştirince eski şifreyle girenler odada kalır." checked={isPrivate} onChange={setIsPrivate} />
          {isPrivate ? (
            <TextField label={lobby.isPrivate ? 'Yeni şifre (değiştirmek istemiyorsan boş bırak)' : 'Oda şifresi'} type="password" value={password} onChange={setPassword} />
          ) : null}
          {message ? <Notice tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Notice> : null}
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>Ayarları kaydet</Button>
          </div>
        </form>

        <div className="rounded-lg border border-danger/30 bg-softDanger p-4">
          <p className="font-semibold text-textDark">Odayı kapat</p>
          <p className="mt-1 text-sm text-textMuted">Herkes odadan çıkarılır ve oda silinir. Sohbet geçmişi kaybolur.</p>
          <div className="mt-3 flex gap-2">
            {confirmClose ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setConfirmClose(false)}>Vazgeç</Button>
                <Button size="sm" variant="danger" icon={DoorClosed} onClick={onCloseRoom}>Evet, odayı kapat</Button>
              </>
            ) : (
              <Button size="sm" variant="danger" icon={DoorClosed} onClick={() => setConfirmClose(true)}>Odayı kapat</Button>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
