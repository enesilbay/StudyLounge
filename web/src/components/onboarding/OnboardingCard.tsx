import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { Button, Notice, Surface } from '../ui';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { onboardingSteps, readOnboardingDismissed, shouldShowOnboarding, writeOnboardingDismissed } from '../../lib/onboarding';
import type { OnboardingStepId } from '../../lib/onboarding';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';

const GOAL_CHOICES = [60, 120, 180];

/**
 * İlk giriş yönlendirmesi: ders ekle → günlük hedef seç → bir odada ilk lambanı yak.
 * Adımlar gerçek veriden hesaplanır; hepsi bitince ya da kullanıcı kapatınca görünmez.
 */
export function OnboardingCard({ roomListId }: { roomListId: string }) {
  const user = useAuthStore((state) => state.user);
  const { subjects, subjectsLoaded, goals, loadSubjects, createSubject, refreshGoals, updateGoals } = useStudyStore();
  const [dismissed, setDismissed] = useState(() => (user ? readOnboardingDismissed(user.id) : true));
  const [subjectName, setSubjectName] = useState('');
  const [busy, setBusy] = useState<OnboardingStepId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || dismissed) return;
    if (!subjectsLoaded) loadSubjects(user.id).catch(() => undefined);
    if (!goals) refreshGoals().catch(() => undefined);
  }, [user, dismissed, subjectsLoaded, goals, loadSubjects, refreshGoals]);

  // Veri gelmeden kart gösterilmez; yoksa tamamlanmış adımlar bir an eksik görünür.
  if (!user || dismissed || !subjectsLoaded || !goals) return null;

  const steps = onboardingSteps({
    subjectCount: subjects.length,
    dailyGoalMinutes: goals.dailyGoalMinutes,
    totalFocusMinutes: user.totalFocusMinutes ?? 0,
  });
  if (!shouldShowOnboarding(steps, dismissed)) return null;
  const done = (id: OnboardingStepId) => steps.find((step) => step.id === id)?.done ?? false;

  const run = async (id: OnboardingStepId, action: () => Promise<unknown>) => {
    setBusy(id);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
    } finally {
      setBusy(null);
    }
  };

  const addSubject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = subjectName.trim();
    if (!name) return;
    void run('subject', async () => {
      await createSubject(name);
      setSubjectName('');
    });
  };

  const dismiss = () => {
    writeOnboardingDismissed(user.id);
    setDismissed(true);
  };

  const completed = steps.filter((step) => step.done).length;

  return (
    <Surface className="mb-8 p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl text-textDark">Masanı hazırla</h2>
          <p className="mt-1 text-base text-textMuted">Üç kısa adım; {completed} / 3 tamam.</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Başlangıç adımlarını gizle" title="Gizle" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-textMuted hover:bg-sunken hover:text-textDark">
          <X className="h-5 w-5" />
        </button>
      </div>

      <ol className="mt-5 space-y-4">
        <Step number={1} done={done('subject')} title="Çalışacağın dersi ekle" description="Odak sürelerin derslere göre ayrılır; Analitik'te hangi derse ne kadar çalıştığını görürsün.">
          {done('subject') ? null : (
            <form onSubmit={addSubject} className="mt-3 flex max-w-md gap-2">
              <label className="sr-only" htmlFor="onboarding-subject">
                Ders adı
              </label>
              <input
                id="onboarding-subject"
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value.slice(0, 40))}
                placeholder="ör. Matematik"
                className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-sunken px-3 text-base text-textDark outline-none transition focus:border-accent"
              />
              <Button type="submit" size="sm" loading={busy === 'subject'} disabled={!subjectName.trim()}>
                Ekle
              </Button>
            </form>
          )}
        </Step>

        <Step number={2} done={done('goal')} title="Günlük hedefini seç" description="Hedefini ilk tuttuğun gün Odak Puanı kazanırsın. Ayarlar'dan istediğin zaman değiştirebilirsin.">
          {done('goal') ? null : (
            <div className="mt-3 flex flex-wrap gap-2">
              {GOAL_CHOICES.map((minutes) => (
                <Button key={minutes} size="sm" variant="secondary" disabled={busy === 'goal'} onClick={() => void run('goal', () => updateGoals({ dailyGoalMinutes: minutes }))}>
                  Günde {minutes / 60} saat
                </Button>
              ))}
            </div>
          )}
        </Step>

        <Step number={3} done={done('focus')} title="Bir odaya katıl ve lambanı yak" description="Odaya girip sayacı başlatınca lamban yanar; odadakiler senin de çalıştığını görür.">
          {done('focus') ? null : (
            <Button size="sm" className="mt-3" onClick={() => document.getElementById(roomListId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              Odaları gör
            </Button>
          )}
        </Step>
      </ol>

      {error ? (
        <div className="mt-4">
          <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice>
        </div>
      ) : null}
    </Surface>
  );
}

function Step({ number, done, title, description, children }: { number: number; done: boolean; title: string; description: string; children?: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${done ? 'bg-success text-background' : 'border border-border text-textMuted'}`}
        aria-hidden="true"
      >
        {done ? <Check className="h-4 w-4" /> : number}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${done ? 'text-textMuted line-through' : 'text-textDark'}`}>
          {title}
          <span className="sr-only">{done ? ' (tamamlandı)' : ''}</span>
        </p>
        {done ? null : <p className="mt-0.5 text-[15px] text-textMuted">{description}</p>}
        {children}
      </div>
    </li>
  );
}
