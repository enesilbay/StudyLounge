import { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { CalendarRange, Clock3, Flame, Sun } from 'lucide-react';
import { api } from '../lib/api';
import { unwrapData } from '../lib/apiResponses';
import { formatMinutes } from '../lib/study';
import type { DailyAnalytics } from '../lib/types';
import { AppPage, Card, CardTitle, CountUp, Rise } from '../components/app/Kit';
import { useAuthStore } from '../store/authStore';
import StudyInsights from '../components/analytics/StudyInsights';

const DAY_MS = 24 * 60 * 60 * 1000;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const weekdayShort = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });
const weekdayLong = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'short' });

/** Tarayıcının yerel günü (kullanıcı Türkiye'de; backend de Türkiye saatiyle yazar). */
function localKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const [records, setRecords] = useState<DailyAnalytics[] | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let ignore = false;
    api
      .get<DailyAnalytics[]>(`/users/analytics/${user.id}`)
      .then((response) => !ignore && setRecords(unwrapData<DailyAnalytics[]>(response.data)))
      .catch(() => !ignore && setRecords([]));
    return () => {
      ignore = true;
    };
  }, [user?.id]);

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

  if (records === null) return <p className="py-16 text-center text-mb-body">Analitik yükleniyor…</p>;

  const weekTotal = days.reduce((sum, day) => sum + day.minutes, 0);
  const today = days[6].minutes;
  const best = days.reduce((top, day) => (day.minutes > top.minutes ? day : top), days[0]);
  const peakHour = hours.reduce((top, value, index) => (value > hours[top] ? index : top), 0);
  const asDuration = (value: number) => formatMinutes(Math.round(value));

  return (
    <AppPage title="Analitik" description="Son yedi günde ne kadar odaklandın, hangi saatlerde verimli oldun.">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile index={0} icon={CalendarRange} label="Son 7 gün" note={`Günde ortalama ${formatMinutes(Math.round(weekTotal / 7))}`}>
          <CountUp value={weekTotal} format={asDuration} />
        </Tile>
        <Tile index={1} icon={Sun} label="Bugün" note={today ? 'Bugün odaklandın' : 'Henüz odak yok'}>
          <CountUp value={today} format={asDuration} />
        </Tile>
        <Tile index={2} icon={Flame} label="Seri" note={`En uzun ${user?.bestStreak ?? 0} gün`}>
          <CountUp value={user?.currentStreak ?? 0} />
          <span className="ml-1 text-base text-mb-body">gün</span>
        </Tile>
        <Tile index={3} icon={Clock3} label="En verimli saat" note={weekTotal && best.minutes ? `En iyi gün ${weekdayShort.format(best.date)}` : 'Veri bekleniyor'}>
          {weekTotal ? `${String(peakHour).padStart(2, '0')}:00` : '—'}
        </Tile>
      </dl>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Rise delay={0.15}>
          <Card className="h-full p-5 md:p-6">
            <CardTitle aside="Günlük odak süresi">Son 7 gün</CardTitle>
            <WeekChart days={days} />
          </Card>
        </Rise>
        <Rise delay={0.22}>
          <Card className="h-full p-5 md:p-6">
            <CardTitle aside="Son 7 gün">Saatlere göre</CardTitle>
            <HourStrip hours={hours} />
          </Card>
        </Rise>
      </div>

      <StudyInsights />
    </AppPage>
  );
}

function Tile({ index, icon: Icon, label, note, children }: { index: number; icon: typeof Sun; label: string; note: string; children: React.ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 + index * 0.06, ease: EASE_OUT }}
      className="rounded-[18px] border border-mb-line/70 bg-mb-card p-4 shadow-mb-card"
    >
      <dt className="flex items-center gap-2 text-[13px] text-mb-body">
        <Icon className="h-4 w-4 text-mb-action" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-2 font-mb-display text-[1.75rem] font-light leading-none tracking-[-0.03em] tabular-nums text-mb-ink">{children}</dd>
      <dd className="mt-1.5 text-[13px] text-mb-body">{note}</dd>
    </m.div>
  );
}

/** Tek seri çubuk grafik: çubuklar sırayla yükselir; bugün koyu yeşil, diğer günler açık. */
function WeekChart({ days }: { days: { date: Date; minutes: number; isToday: boolean }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const top = niceCeiling(Math.max(30, ...days.map((day) => day.minutes)));
  const ticks = [top, top / 2, 0];

  return (
    <div className="mt-5 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2">
      <div className="relative h-52" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} className="absolute right-0 -translate-y-1/2 text-xs tabular-nums text-mb-body" style={{ top: `${100 - (tick / top) * 100}%` }}>
            {tick ? formatMinutes(tick) : '0'}
          </span>
        ))}
      </div>
      <div className="relative h-52" onMouseLeave={() => setHovered(null)}>
        {ticks.map((tick) => (
          <span key={tick} className="absolute inset-x-0 border-t border-mb-line" style={{ top: `${100 - (tick / top) * 100}%` }} aria-hidden="true" />
        ))}
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
                  className="flex h-full w-full items-end justify-center rounded-[8px] focus-visible:outline-2 focus-visible:outline-mb-action"
                >
                  <m.span
                    className={`block w-3/5 max-w-10 rounded-t-[8px] ${day.minutes ? (day.isToday ? 'bg-mb-action' : 'bg-mb-action/45') : 'bg-transparent'} ${hovered === index ? 'brightness-110' : ''}`}
                    initial={{ height: '0%' }}
                    animate={{ height: `${Math.max(day.minutes ? 2 : 0, height)}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.06, ease: EASE_OUT }}
                  />
                </button>
                {hovered === index ? (
                  <span role="tooltip" className="pointer-events-none absolute z-10 mb-1 whitespace-nowrap rounded-[8px] border border-mb-line bg-mb-card px-2 py-1 text-xs text-mb-ink shadow-mb-raised" style={{ bottom: `${Math.min(height, 88)}%` }}>
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
          <li key={index} className={day.isToday ? 'font-medium text-mb-ink' : 'text-mb-body'}>
            {day.isToday ? 'Bugün' : weekdayShort.format(day.date)}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 24 saatlik şerit: tek renkli (yeşil) ölçek, en yoğun saate göre; kareler dalga gibi belirir. */
function HourStrip({ hours }: { hours: number[] }) {
  const max = Math.max(...hours);
  const level = (value: number) => {
    if (!value || !max) return 'bg-mb-surface';
    const ratio = value / max;
    if (ratio > 0.75) return 'bg-mb-action';
    if (ratio > 0.5) return 'bg-mb-action/70';
    if (ratio > 0.25) return 'bg-mb-action/45';
    return 'bg-mb-action/20';
  };
  if (!max) return <p className="py-10 text-center text-[15px] text-mb-body">Bir odak oturumu tamamladığında saatlerin burada belirir.</p>;

  return (
    <div className="mt-5">
      <ol className="grid grid-cols-12 gap-1" aria-label="Saatlere göre odak süresi">
        {hours.map((value, hour) => {
          const label = `${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00: ${value ? formatMinutes(value) : 'odak yok'}`;
          return (
            <li key={hour} title={label} aria-label={label} className="text-center">
              <m.span
                className={`block h-9 rounded-[6px] ${level(value)}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.3 + hour * 0.02, ease: EASE_OUT }}
              />
              <span className="mt-1 block text-[11px] tabular-nums text-mb-body" aria-hidden="true">{String(hour).padStart(2, '0')}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-mb-body">Koyu kareler en çok odaklandığın saatler.</p>
    </div>
  );
}

/** Eksen üst sınırı: 30 dakikanın katlarına yuvarlanır. */
function niceCeiling(value: number) {
  return Math.ceil(value / 30) * 30;
}
