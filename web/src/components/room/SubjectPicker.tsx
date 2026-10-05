import { useEffect, useId, useState } from 'react';
import { BookOpen, Check, X } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { dotClassFor } from '../../lib/study';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';

const NEW_SUBJECT = '__new__';

/** Odak oturumunun dersi. Seçim oturum geçmişine ve analitikteki ders dağılımına yansır. */
export default function SubjectPicker({ onError }: { onError: (message: string) => void }) {
  const userId = useAuthStore((state) => state.user?.id);
  const { subjects, subjectsLoaded, selectedSubjectId, loadSubjects, createSubject, selectSubject } = useStudyStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const selectId = useId();

  useEffect(() => {
    if (userId && !subjectsLoaded) loadSubjects(userId).catch(() => undefined);
  }, [userId, subjectsLoaded, loadSubjects]);

  if (!userId) return null;
  const selected = subjects.find((subject) => subject.id === selectedSubjectId);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const subject = await createSubject(name.trim());
      selectSubject(userId, subject.id);
      setAdding(false);
      setName('');
    } catch (error) {
      onError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (adding) {
    return (
      <form
        className="mt-2 flex items-center gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && setAdding(false)}
          maxLength={40}
          placeholder="Ders adı, ör. Fizik 2"
          aria-label="Yeni ders adı"
          className="min-h-9 w-48 rounded-lg border border-border bg-sunken px-3 text-sm text-textDark outline-none focus:border-accent"
        />
        <button type="submit" disabled={saving || !name.trim()} aria-label="Dersi ekle" className="grid h-9 w-9 place-items-center rounded-lg text-primary hover:bg-softIndigo disabled:opacity-50">
          <Check className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setAdding(false)} aria-label="Vazgeç" className="grid h-9 w-9 place-items-center rounded-lg text-textMuted hover:bg-sunken">
          <X className="h-4 w-4" />
        </button>
      </form>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <label htmlFor={selectId} className="flex items-center gap-1.5 text-sm font-semibold text-textMuted">
        {selected ? <span className={`h-2.5 w-2.5 rounded-full ${dotClassFor(selected.color)}`} aria-hidden="true" /> : <BookOpen className="h-3.5 w-3.5" />}
        Ders
      </label>
      <select
        id={selectId}
        value={selectedSubjectId ?? ''}
        onChange={(event) => {
          if (event.target.value === NEW_SUBJECT) {
            setAdding(true);
            return;
          }
          selectSubject(userId, event.target.value ? Number(event.target.value) : null);
        }}
        className="min-h-9 max-w-56 rounded-lg border border-border bg-surface px-2 text-sm font-semibold text-textDark outline-none focus:border-accent"
      >
        <option value="">Derssiz</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
        <option value={NEW_SUBJECT}>+ Yeni ders…</option>
      </select>
    </div>
  );
}
