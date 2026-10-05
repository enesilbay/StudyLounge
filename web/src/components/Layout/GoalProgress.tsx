import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Target } from 'lucide-react';
import { formatMinutes } from '../../lib/study';
import { useStudyStore } from '../../store/studyStore';

/** Kenar çubuğunda günlük hedef halkası. Hedef yoksa ayarlara giden kısa bir bağlantı gösterir. */
export default function GoalProgress() {
  const goals = useStudyStore((state) => state.goals);
  const refreshGoals = useStudyStore((state) => state.refreshGoals);

  useEffect(() => {
    refreshGoals().catch(() => undefined);
  }, [refreshGoals]);

  if (!goals) return null;

  if (!goals.dailyGoalMinutes) {
    return (
      <NavLink to="/app/settings" className="mx-2 mb-3 flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-textMuted transition hover:bg-sunken hover:text-textDark">
        <Target className="h-4 w-4" />
        Günlük hedef koy
      </NavLink>
    );
  }

  const ratio = Math.min(1, goals.todayMinutes / goals.dailyGoalMinutes);
  const reached = ratio >= 1;
  return (
    <NavLink to="/app/analytics" className="mx-2 mb-3 flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-sunken" title="Analitiğe git">
      <ProgressRing ratio={ratio} reached={reached} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-textDark">{reached ? 'Bugünkü hedef tamam' : 'Bugünkü hedef'}</p>
        <p className="truncate text-xs text-textMuted">
          {formatMinutes(goals.todayMinutes)} / {formatMinutes(goals.dailyGoalMinutes)}
        </p>
      </div>
    </NavLink>
  );
}

export function ProgressRing({ ratio, reached, size = 40 }: { ratio: number; reached: boolean; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" role="img" aria-label={`Yüzde ${Math.round(ratio * 100)}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-border" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        className={`transition-[stroke-dashoffset] duration-500 ${reached ? 'stroke-success' : 'stroke-primary'}`}
      />
    </svg>
  );
}
