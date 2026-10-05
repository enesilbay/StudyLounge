import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { unwrapData } from '../lib/apiResponses';
import { formatMinutes } from '../lib/study';
import type { DailyAnalytics } from '../lib/types';
import { StateBlock, Surface } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { useStudyStore } from '../store/studyStore';
import StudyInsights from '../components/analytics/StudyInsights';

const DAY_MS = 24 * 60 * 60 * 1000;
const weekdayShort = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });
const weekdayLong = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'short' });

/** Tarayıcının yerel günü (kullanıcı Türkiye'de; backend de Türkiye saatiyle yazar). */
function localKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const goals = useStudyStore((state) => state.goals);
  const refreshGoals = useStudyStore((state) => state.refreshGoals);
  const [records, setRecords] = useState<DailyAnalytics[] | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let ignore = false;
    api
      .get<DailyAnalytics[]>(`/users/analytics/${user.id}`)
      .then((response) => !ignore && setRecords(unwrapData<DailyAnalytics[]>(response.data)))
      .catch(() => !ignore && setRecords([]));
    refreshGoals().catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [user?.id, refreshGoals]);

  const days = useMemo(() => {
    const byDate = new Map((records ?? []).map((record) => [record.date, record.focusMinutes ?? 0]));
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getTime() - (6 - index) * DAY_MS);
      return { date, minutes: byDate.get(localKey(date)) ?? 0, isToday: index === 6 };
    });
  }, [records]);

  const hours = useMemo(
    () =>
      (records ?? []).reduce((sum, record) => {
        record.hourlyDistribution?.forEach((value, index) => (sum[index] += value));
        return sum;
      }, Array<number>(24).fill(0)),
    [records],
  );

  if (records === null) return <StateBlock loading title="Analitik yükleniyor" />;

  const weekTotal = days.reduce((sum, day) => sum + day.minutes, 0);
  const today = days[6].minutes;
  const best = days.reduce((top, day) => (day.minutes > top.minutes ? day : top), days[0]);
  const peakHour = hours.reduce((top, value, index) => (value > hours[top] ? index : top), 0);
  const dailyGoal = goals?.dailyGoalMinutes ?? 0;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-4xl md:text-5xl">Analitik</h1>
        <p className="mt-3 max-w-2xl text-lg text-textMuted">Son yedi günde ne kadar odaklandın, hangi saatlerde verimli oldun.</p>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
        <Stat label="Son 7 gün" value={formatMinutes(weekTotal)} note={goals?.weeklyGoalMinutes ? `Haftalık hedef ${formatMinutes(goals.weeklyGoalMinutes)}` : `Günde ortalama ${formatMinutes(Math.round(weekTotal / 7))}`} />
        <Stat label="Bugün" value={formatMinutes(today)} note={dailyGoal ? (today >= dailyGoal ? 'Günlük hedef tamam' : `Hedefe ${formatMinutes(dailyGoal - today)} kaldı`) : 'Günlük hedef koymadın'} />
        <Stat label="Seri" value={`${user?.currentStreak ?? 0} gün`} note={`En uzun ${user?.bestStreak ?? 0} gün`} />
        <Stat label="En verimli saat" value={weekTotal ? `${String(peakHour).padStart(2, '0')}:00` : '—'} note={weekTotal && best.minutes ? `En iyi gün ${weekdayShort.format(best.date)}` : 'Veri bekleniyor'} />
      </dl>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Surface className="p-5">
          <h2 className="text-lg font-semibold text-textDark">Son 7 gün</h2>
          <p className="text-sm text-textMuted">Günlük odak süresi{dailyGoal ? ', kesikli çizgi günlük hedefin' : ''}</p>
          <WeekChart days={days} goal={dailyGoal} />
        </Surface>

        <Surface className="p-5">
          <h2 className="text-lg font-semibold text-textDark">Saatlere göre</h2>
          <p className="text-sm text-textMuted">Son 7 günde hangi saatte ne kadar odaklandın</p>
          <HourStrip hours={hours} />
        </Surface>
      </div>

      <StudyInsights />
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="text-sm text-textMuted">{label}</dt>
      <dd className="mt-1 font-display text-3xl text-textDark">{value}</dd>
      <dd className="mt-0.5 text-sm text-textMuted">{note}</dd>
    </div>
  );
}

/** Tek seri çubuk grafik: ince çubuklar, sade ızgara, isteğe bağlı hedef çizgisi ve üzerine gelince değer. */
function WeekChart({ days, goal }: { days: { date: Date; minutes: number; isToday: boolean }[]; goal: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const top = niceCeiling(Math.max(30, goal, ...days.map((day) => day.minutes)));
  const ticks = [top, top / 2, 0];

  return (
    <div className="mt-5 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2">
      <div className="relative h-52" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} className="absolute right-0 -translate-y-1/2 text-xs tabular-nums text-textMuted" style={{ top: `${100 - (tick / top) * 100}%` }}>
            {tick ? formatMinutes(tick) : '0'}
          </span>
        ))}
      </div>
      <div className="relative h-52" onMouseLeave={() => setHovered(null)}>
        {ticks.map((tick) => (
          <span key={tick} className="absolute inset-x-0 border-t border-border" style={{ top: `${100 - (tick / top) * 100}%` }} aria-hidden="true" />
        ))}
        {goal ? (
          <span className="absolute inset-x-0 z-[1] border-t-2 border-dashed border-textMuted/70" style={{ top: `${100 - (goal / top) * 100}%` }} aria-hidden="true" />
        ) : null}
        <ol className="absolute inset-0 grid grid-cols-7 gap-2" aria-label="Son 7 günün odak süreleri">
          {days.map((day, index) => {
            const height = (day.minutes / top) * 100;
            const label = `${weekdayLong.format(day.date)}: ${day.minutes ? formatMinutes(day.minutes) : 'odak yok'}`;
            return (
              <li key={index} className="relative flex items-end justify-center">
                <button
                  type="button"
                  aria-label={label}
                  onMouseEnter={() => setHovered(index)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  className="flex h-full w-full items-end justify-center rounded focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className={`block w-3/5 max-w-10 rounded-t ${day.minutes ? 'bg-primary' : 'bg-transparent'} ${hovered === index ? 'opacity-80' : ''}`} style={{ height: `${Math.max(day.minutes ? 2 : 0, height)}%` }} />
                </button>
                {hovered === index ? (
                  <span role="tooltip" className="pointer-events-none absolute z-10 mb-1 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs text-textDark shadow" style={{ bottom: `${Math.min(height, 88)}%` }}>
                    {label}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
      <span />
      <ol className="mt-2 grid grid-cols-7 gap-2 text-center text-xs" aria-hidden="true">
        {days.map((day, index) => (
          <li key={index} className={day.isToday ? 'font-semibold text-textDark' : 'text-textMuted'}>
            {day.isToday ? 'Bugün' : weekdayShort.format(day.date)}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 24 saatlik şerit: tek renkli (turkuaz) ölçek, en yoğun saate göre. */
function HourStrip({ hours }: { hours: number[] }) {
  const max = Math.max(...hours);
  const level = (value: number) => {
    if (!value || !max) return 'bg-sunken';
    const ratio = value / max;
    if (ratio > 0.75) return 'bg-primary';
    if (ratio > 0.5) return 'bg-primary/70';
    if (ratio > 0.25) return 'bg-primary/45';
    return 'bg-primary/20';
  };
  if (!max) return <p className="py-10 text-center text-[15px] text-textMuted">Bir odak oturumu tamamladığında saatlerin burada belirir.</p>;

  return (
    <div className="mt-5">
      <ol className="grid grid-cols-12 gap-1" aria-label="Saatlere göre odak süresi">
        {hours.map((value, hour) => {
          const label = `${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00: ${value ? formatMinutes(value) : 'odak yok'}`;
          return (
            <li key={hour} title={label} aria-label={label} className="text-center">
              <span className={`block h-9 rounded ${level(value)}`} />
              <span className="mt-1 block text-[11px] tabular-nums text-textMuted" aria-hidden="true">{String(hour).padStart(2, '0')}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-textMuted">Koyu kareler en çok odaklandığın saatler.</p>
    </div>
  );
}

/** Eksen üst sınırı: 30 dakikanın katlarına yuvarlanır. */
function niceCeiling(value: number) {
  return Math.ceil(value / 30) * 30;
}
