import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Plus, Share2, Star, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { dotClassFor } from '../../lib/study';
import type { Task } from '../../lib/study';
import { useStudyStore } from '../../store/studyStore';

/**
 * Kişisel görev listesi (odanın yan panelinde). Yeni görev seçili derse bağlanır.
 * "Bu turda" işaretli görevler üstte durur; istenirse odaya sohbet mesajı olarak paylaşılır.
 */
export default function TasksPanel({ onShare, onError }: { onShare: (text: string) => void; onError: (message: string) => void }) {
  const selectedSubjectId = useStudyStore((state) => state.selectedSubjectId);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get<Task[]>('/tasks');
      setTasks(response.data);
    } catch (error) {
      onError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!title.trim()) return;
    setAdding(true);
    try {
      const response = await api.post<Task>('/tasks', { title: title.trim(), subjectId: selectedSubjectId, current: true });
      setTasks((current) => [response.data, ...current]);
      setTitle('');
    } catch (error) {
      onError(getApiErrorMessage(error));
    } finally {
      setAdding(false);
    }
  };

  const update = async (task: Task, changes: Partial<Pick<Task, 'done' | 'current'>>) => {
    // Önce ekranda güncellenir; sunucu reddederse liste yeniden yüklenir.
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...changes, ...(changes.done ? { current: false } : {}) } : item)));
    try {
      await api.patch(`/tasks/${task.id}`, changes);
    } catch (error) {
      onError(getApiErrorMessage(error));
      void load();
    }
  };

  const remove = async (task: Task) => {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    try {
      await api.delete(`/tasks/${task.id}`);
    } catch (error) {
      onError(getApiErrorMessage(error));
      void load();
    }
  };

  const open = tasks.filter((task) => !task.done).sort((a, b) => Number(b.current) - Number(a.current));
  const done = tasks.filter((task) => task.done);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form
        className="flex items-center gap-1 border-b border-border p-2"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder="Bu turda ne yapacaksın?"
          aria-label="Yeni görev"
          className="min-h-10 min-w-0 flex-1 rounded-lg bg-sunken px-3 text-[15px] outline-none focus:ring-1 focus:ring-accent"
        />
        <button disabled={adding || !title.trim()} aria-label="Görevi ekle" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-onPrimary disabled:opacity-40">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </form>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? <p className="pt-8 text-center text-[15px] text-textMuted">Görevler yükleniyor…</p> : null}
        {!loading && tasks.length === 0 ? (
          <p className="px-2 pt-8 text-center text-[15px] text-textMuted">Listen boş. Bu turda bitirmek istediğin işi yaz; yıldızlı görevler üstte durur.</p>
        ) : null}

        <ul className="space-y-1">
          {open.map((task) => (
            <TaskRow key={task.id} task={task} onToggleDone={() => void update(task, { done: true })} onToggleCurrent={() => void update(task, { current: !task.current })} onShare={() => onShare(`Bu turda: ${task.title}`)} onRemove={() => void remove(task)} />
          ))}
        </ul>

        {done.length ? (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold text-textMuted">Bitenler (son 7 gün)</p>
            <ul className="space-y-1">
              {done.map((task) => (
                <TaskRow key={task.id} task={task} onToggleDone={() => void update(task, { done: false })} onShare={() => onShare(`Bitirdim: ${task.title}`)} onRemove={() => void remove(task)} />
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggleDone,
  onToggleCurrent,
  onShare,
  onRemove,
}: {
  task: Task;
  onToggleDone: () => void;
  onToggleCurrent?: () => void;
  onShare: () => void;
  onRemove: () => void;
}) {
  return (
    <li className={`group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-sunken ${task.current ? 'bg-softIndigo' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? `${task.title} görevini geri al` : `${task.title} görevini bitir`}
        onClick={onToggleDone}
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${task.done ? 'border-primary bg-primary text-onPrimary' : 'border-border bg-surface'}`}
      >
        {task.done ? <Check className="h-3.5 w-3.5" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`break-words text-[15px] leading-6 ${task.done ? 'text-textMuted line-through' : 'text-textDark'}`}>{task.title}</p>
        {task.subject ? (
          <p className="flex items-center gap-1.5 text-xs text-textMuted">
            <span className={`h-2 w-2 rounded-full ${dotClassFor(task.subject.color)}`} aria-hidden="true" />
            {task.subject.name}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center opacity-70 group-hover:opacity-100 group-focus-within:opacity-100">
        {onToggleCurrent ? (
          <button type="button" onClick={onToggleCurrent} aria-pressed={task.current} aria-label={task.current ? 'Bu turdan çıkar' : 'Bu tura al'} title={task.current ? 'Bu turdan çıkar' : 'Bu tura al'} className="grid h-8 w-8 place-items-center rounded text-textMuted hover:text-primary">
            <Star className={`h-4 w-4 ${task.current ? 'fill-current text-primary' : ''}`} />
          </button>
        ) : null}
        <button type="button" onClick={onShare} aria-label="Odada paylaş" title="Odada paylaş" className="grid h-8 w-8 place-items-center rounded text-textMuted hover:text-primary">
          <Share2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={onRemove} aria-label="Görevi sil" title="Sil" className="grid h-8 w-8 place-items-center rounded text-textMuted hover:text-danger">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
