import { useRef, useState } from 'react';
import { Check, Loader2, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage, unwrapUser } from '../../lib/apiResponses';
import { CHARACTERS, characterAvatarPath } from '../../lib/avatars';
import type { User } from '../../lib/types';
import { ModalShell, Notice } from '../ui';
import { outlineButton } from '../app/Kit';
import { AVATAR_TYPES, validateAvatarFile } from './avatarFile';
import { useAuthStore } from '../../store/authStore';

/** Profil fotoğrafı penceresi: 10 hazır karakterden biri ya da kendi fotoğrafın. */
export function AvatarPicker({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (message: string) => void }) {
  const { user, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<number | 'upload' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const finish = (next: User, message: string) => {
    setUser(next);
    onSaved(message);
    onClose();
  };

  const choose = async (character: number) => {
    setBusy(character);
    setError(null);
    try {
      const response = await api.put('/users/me/avatar-character', { character });
      finish(unwrapUser<User>(response.data), 'Avatarın güncellendi.');
    } catch (chooseError) {
      setError(getApiErrorMessage(chooseError));
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File) => {
    const problem = validateAvatarFile(file);
    if (problem) {
      setError(problem);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setBusy('upload');
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post(`/users/avatar/${user.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      finish(unwrapUser<User>(response.data), 'Profil fotoğrafın güncellendi.');
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <ModalShell open={open} title="Profil fotoğrafı" description="Bir karakter seç ya da kendi fotoğrafını yükle. Odada, sıralamada ve profilinde görünür." onClose={onClose}>
      <div className="space-y-4">
        {error ? <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice> : null}
        <ul className="grid grid-cols-5 gap-2.5" aria-label="Karakterler">
          {CHARACTERS.map((character) => {
            const path = characterAvatarPath(character);
            const selected = user.avatarUrl === path;
            return (
              <li key={character}>
                <button
                  type="button"
                  onClick={() => void choose(character)}
                  disabled={busy !== null}
                  aria-pressed={selected}
                  aria-label={`Karakter ${character}`}
                  className={`relative block aspect-square w-full overflow-hidden rounded-full border-2 bg-mb-surface transition hover:scale-105 disabled:cursor-wait ${
                    selected ? 'border-mb-action ring-2 ring-mb-action/30' : 'border-mb-line hover:border-mb-action/50'
                  }`}
                >
                  <img src={path} alt="" draggable={false} className="h-full w-full object-cover" />
                  {busy === character ? (
                    <span className="absolute inset-0 grid place-items-center bg-mb-solid/40 text-mb-on-solid"><Loader2 className="h-5 w-5 animate-spin" /></span>
                  ) : selected ? (
                    <span className="absolute bottom-0.5 right-0.5 grid h-5 w-5 place-items-center rounded-full bg-mb-action text-mb-on-action"><Check className="h-3 w-3" /></span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== null} className={`${outlineButton} w-full justify-center`}>
          {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Kendi fotoğrafını yükle
        </button>
        <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(",")} className="hidden" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])} />
      </div>
    </ModalShell>
  );
}
