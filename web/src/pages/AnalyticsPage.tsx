import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, BookOpen, CalendarDays, Clock3, Flame, History, Snowflake, Sun, Timer, TrendingDown, TrendingUp, Waves } from 'lucide-react';
import { api } from '../lib/api';
import { bestSlot, calendarWeeks, changePercent, lastDays, longestRun, peakHour, periodTotals, rhythmGrid, WEEKDAYS } from '../lib/analytics';
import { formatMinutes } from '../lib/study';
import type { StudySession, StudySummary } from '../lib/study';
import { AppPage, Card, CountUp, EmptyState, ErrorState, Rise, SegmentedTabs, Skeleton, actionButton } from '../components/app/Kit';
import { CalendarMap, DailyChart, RhythmMap, SubjectDonut } from '../components/analytics/AnalyticsCharts';
import { SessionTimeline } from '../components/analytics/SessionTimeline';
import { useAuthStore } from '../store/authStore';

type Period = '7' | '30' | '90';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7', label: '7 gün' },
  { value: '30', label: '30 gün' },
  { value: '90', label: '90 gün' },
];

/** Takvim 12 hafta, dönem karşılaştırması en fazla 2 × 90 gün ister; uzun özet bir kez alınır. */
const HISTORY_DAYS = 180;
const CALENDAR_WEEKS = 12;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const shortDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });

function readPeriod(): Period {
  try {
    const stored = localStorage.getItem('analitik_donem');
    return stored === '7' || stored === '30' || stored === '90' ? stored : '30';
  } catch {
    return '30';
  }
}

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState<Period>(readPeriod);
  const [history, setHistory] = useState<StudySummary | null>(null);
  const [current, setCurrent] = useState<{ period: Period; summary: StudySummary; sessions: StudySession[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const days = Number(period);

  useEffect(() => {
    let ignore = false;
    api
      .get<StudySummary>(`/study/summary?days=${HISTORY_DAYS}`)
      .then((response) => !ignore && setHistory(response.data))
      .catch(() => !ignore && setFailed(true));
    return () => {
      ignore = true;
    };
  }, [attempt]);

  useEffect(() => {
    let ignore = false;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    Promise.all([api.get<StudySummary>(`/study/summary?days=${days}`), api.get<StudySession[]>(`/study/sessions?from=${encodeURIComponent(from)}`)])
      .then(([summary, sessions]) => !ignore && setCurrent({ period, summary: summary.data, sessions: sessions.data }))
      .catch(() => !ignore && setFailed(true));
    return () => {
      ignore = true;
    };
  }, [period, days, attempt]);

  const choosePeriod = (next: Period) => {
    setPeriod(next);
    try {
      localStorage.setItem('analitik_donem', next);
    } catch {
      /* tercih hatırlanamazsa varsayılan kullanılır */
    }
  };

  const daily = useMemo(() => history?.daily ?? [], [history]);
  const view = useMemo(() => {
    const sessions = current?.sessions ?? [];
    const range = lastDays(daily, days);
    const totals = periodTotals(daily, days);
    const grid = rhythmGrid(sessions);
    const longest = sessions.reduce<StudySession | null>((best, session) => (!best || session.minutes > best.minutes ? session : best), null);
    return {
      range,
      totals,
      change: changePercent(totals.current, totals.previous),
      activeDays: range.filter((day) => day.minutes > 0).length,
      run: longestRun(range),
      grid,
      slot: bestSlot(grid),
      peak: peakHour(grid),
      longest,
      today: range[range.length - 1]?.minutes ?? 0,
      yesterday: range[range.length - 2]?.minutes ?? 0,
      weeks: calendarWeeks(daily, CALENDAR_WEEKS),
    };
  }, [current, daily, days]);

  const header = (
    <div className="w-full sm:w-72">
      <SegmentedTabs label="Dönem" value={period} onChange={choosePeriod} options={PERIODS} />
    </div>
  );

  if (failed) {
    return (
      <AppPage title="Analitik" actions={header}>
        <Card className="mt-6">
          <ErrorState
            title="Analitik yüklenemedi"
            text="Bağlantını kontrol edip tekrar dene."
            onRetry={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          />
        </Card>
      </AppPage>
    );
  }

  if (!history || !current) {
    return (
      <AppPage title="Analitik" description="Ne kadar, ne zaman ve hangi derse odaklandığın." actions={header}>
        <div className="space-y-4" aria-label="Analitik yükleniyor">
          <Skeleton className="h-52 rounded-[24px]" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-32 rounded-[18px]" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-[18px]" />
        </div>
      </AppPage>
    );
  }

  const { summary, sessions } = current;
  const noData = daily.every((day) => !day.minutes) && sessions.length === 0;
  const asDuration = (value: number) => formatMinutes(Math.round(value));

  return (
    <AppPage title="Analitik" description="Ne kadar, ne zaman ve hangi derse odaklandığın." actions={header}>
      {noData ? (
        <Card className="mt-2">
          <EmptyState
            icon={BarChart3}
            title="Henüz odak kaydın yok"
            text="Bir odaya girip lambanı yaktığında süren, saatlerin ve derslerin burada belirir."
            action={
              <Link to="/app" className={actionButton}>
                Odalara git
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Hero
            days={days}
            total={view.totals.current}
            change={view.change}
            previous={view.totals.previous}
            activeDays={view.activeDays}
            average={view.totals.current / days}
            sessionCount={summary.sessionCount}
            series={view.range.map((day) => day.minutes)}
          />

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile index={0} tile="bg-mb-tile-5" icon={Sun} label="Bugün" note={todayNote(view.today, view.yesterday)}>
              <CountUp value={view.today} format={asDuration} />
            </StatTile>
            <StatTile
              index={1}
              tile="bg-mb-tile-6"
              icon={Flame}
              label="Seri"
              note={
                <span className="inline-flex items-center gap-1.5">
                  En uzun {user?.bestStreak ?? 0} gün
                  {user?.streakFreezes ? (
                    <span className="inline-flex items-center gap-0.5" title={`${user.streakFreezes} seri koruma`}>
                      · <Snowflake className="h-3.5 w-3.5" aria-hidden="true" /> {user.streakFreezes}
                    </span>
                  ) : null}
                </span>
              }
            >
              <CountUp value={user?.currentStreak ?? 0} />
              <span className="ml-1 text-base text-mb-ink/70">gün</span>
            </StatTile>
            <StatTile
              index={2}
              tile="bg-mb-tile-2"
              icon={Timer}
              label="En uzun oturum"
              note={view.longest ? `${shortDate.format(new Date(view.longest.startedAt))}${view.longest.subject ? ` · ${view.longest.subject.name}` : ''}` : 'Bu dönemde oturum yok'}
            >
              {view.longest ? <CountUp value={view.longest.minutes} format={asDuration} /> : '—'}
            </StatTile>
            <StatTile
              index={3}
              tile="bg-mb-tile-4"
              icon={Clock3}
              label="En verimli zamanın"
              note={view.peak !== null ? `En yoğun saat ${String(view.peak).padStart(2, '0')}:00` : 'Veri bekleniyor'}
            >
              <span className="text-[1.35rem] leading-tight">{view.slot ? `${WEEKDAYS[view.slot.weekday]} ${view.slot.part.label}` : '—'}</span>
            </StatTile>
          </dl>

          <Rise delay={0.15}>
            <Card className="p-5 md:p-6">
              <SectionHead icon={BarChart3} tile="bg-mb-tile-1" title="Günlük odak" text={`Son ${days} gün · ${view.activeDays} gün odaklandın${view.run > 1 ? ` · en uzun ${view.run} gün aralıksız` : ''}`} />
              <DailyChart days={view.range} />
            </Card>
          </Rise>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Rise delay={0.2}>
              <Card className="h-full p-5 md:p-6">
                <SectionHead icon={BookOpen} tile="bg-mb-tile-3" title="Ders dağılımı" text={`Son ${days} gün · ${summary.sessionCount} oturum`} />
                {summary.bySubject.length ? (
                  <SubjectDonut rows={summary.bySubject} />
                ) : (
                  <p className="py-10 text-center text-[15px] text-mb-body">Odada bir ders seçip odaklandığında dağılım burada görünür.</p>
                )}
              </Card>
            </Rise>
            <Rise delay={0.26}>
              <Card className="h-full p-5 md:p-6">
                <SectionHead
                  icon={Waves}
                  tile="bg-mb-tile-7"
                  title="Çalışma ritmin"
                  text={view.slot ? `En çok ${WEEKDAYS[view.slot.weekday].toLocaleLowerCase('tr-TR')} ${view.slot.part.label}ları odaklanıyorsun` : `Son ${days} gün, gün ve saate göre`}
                />
                {sessions.length ? <RhythmMap grid={view.grid} /> : <p className="py-10 text-center text-[15px] text-mb-body">Oturum tamamladıkça ritmin burada oluşur.</p>}
              </Card>
            </Rise>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <Rise delay={0.3}>
              <Card className="p-5 md:p-6">
                <SectionHead icon={CalendarDays} tile="bg-mb-tile-8" title="Son 12 hafta" text={`${view.weeks.flat().filter((cell) => cell.minutes > 0).length} gün odaklandın`} />
                <CalendarMap weeks={view.weeks} />
              </Card>
            </Rise>
            <Rise delay={0.34}>
              <Card className="p-5 md:p-6">
                <SectionHead icon={History} tile="bg-mb-tile-6" title="Oturumların" text={`Son ${days} gün · güne göre`} />
                {sessions.length ? (
                  <SessionTimeline sessions={sessions} />
                ) : (
                  <p className="py-10 text-center text-[15px] text-mb-body">Bu dönemde kayıtlı oturum yok.</p>
                )}
              </Card>
            </Rise>
          </div>
        </div>
      )}
    </AppPage>
  );
}

function todayNote(today: number, yesterday: number) {
  if (!today) return yesterday ? `Dün ${formatMinutes(yesterday)} odaklandın` : 'Henüz odak yok';
  if (!yesterday) return 'Dün odak yoktu';
  if (today === yesterday) return 'Dünle aynı';
  return today > yesterday ? `Dünden ${formatMinutes(today - yesterday)} fazla` : `Düne ${formatMinutes(yesterday - today)} kaldı`;
}

/* ───────────────────────── Özet bandı ───────────────────────── */

function Hero({
  days,
  total,
  change,
  previous,
  activeDays,
  average,
  sessionCount,
  series,
}: {
  days: number;
  total: number;
  change: number | null;
  previous: number;
  activeDays: number;
  average: number;
  sessionCount: number;
  series: number[];
}) {
  const TrendIcon = change !== null && change < 0 ? TrendingDown : TrendingUp;
  return (
    <Rise>
      <section className="relative overflow-hidden rounded-[24px] bg-mb-solid text-mb-on-solid shadow-mb-raised">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-mb-lamp opacity-20 blur-3xl" />
        <div className="relative grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:p-8">
          <div className="min-w-0">
            <p className="text-sm text-mb-on-solid/70">Son {days} günde toplam odak</p>
            <p className="mt-1 font-mb-display text-[2.75rem] font-light leading-none tracking-[-0.04em] tabular-nums md:text-[3.5rem]">
              <CountUp value={total} format={(value) => formatMinutes(Math.round(value))} />
            </p>
            <p className="mt-3">
              {!total ? (
                <span className="text-[13px] text-mb-on-solid/70">
                  Bu dönemde henüz odak yok{previous ? ` · önceki ${days} günde ${formatMinutes(previous)}` : ''}. Bir odaya girip lambanı yak.
                </span>
              ) : change !== null ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-mb-on-solid/10 px-3 py-1 text-[13px] font-medium">
                  <TrendIcon className="h-3.5 w-3.5 text-mb-lamp" aria-hidden="true" />
                  {change >= 0 ? `%${change} daha fazla` : `%${Math.abs(change)} daha az`}
                  <span className="font-normal text-mb-on-solid/70">önceki {days} güne göre</span>
                </span>
              ) : (
                <span className="text-[13px] text-mb-on-solid/70">Önceki {days} günde kayıt yok; karşılaştırma bir sonraki dönemde başlar.</span>
              )}
            </p>
            <Sparkline values={series} />
          </div>
          <dl className="grid grid-cols-3 gap-2 self-end md:w-[22rem]">
            <HeroStat label="Aktif gün" value={`${activeDays}/${days}`} />
            <HeroStat label="Günlük ort." value={formatMinutes(Math.round(average))} />
            <HeroStat label="Oturum" value={String(sessionCount)} />
          </dl>
        </div>
      </section>
    </Rise>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-mb-on-solid/10 px-2.5 py-3 sm:px-3">
      <dt className="text-xs text-mb-on-solid/70">{label}</dt>
      <dd className="mt-1 whitespace-nowrap font-mb-display text-[15px] font-medium tabular-nums sm:text-lg">{value}</dd>
    </div>
  );
}

/** Dönemin gidişatı: lamba renginde ince eğri; ayrıntı aşağıdaki grafikte. */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const width = 320;
  const height = 48;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => [index * step, height - 4 - (value / max) * (height - 8)] as const);
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="mt-5 h-12 w-full max-w-md" aria-hidden="true">
      <defs>
        <linearGradient id="analitik-egri" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-mb-lamp)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-mb-lamp)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <m.path d={area} fill="url(#analitik-egri)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }} />
      <m.path
        d={line}
        fill="none"
        stroke="var(--color-mb-lamp)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.3, ease: EASE_OUT }}
      />
    </svg>
  );
}

/* ───────────────────────── Parçalar ───────────────────────── */

function StatTile({ index, tile, icon: Icon, label, note, children }: { index: number; tile: string; icon: LucideIcon; label: string; note: ReactNode; children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.45, delay: 0.08 + index * 0.06, ease: EASE_OUT }}
      className={`rounded-[18px] p-4 shadow-mb-card ${tile}`}
    >
      <dt className="flex items-center gap-2 text-[13px] font-medium text-mb-ink/80">
        <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-mb-card/80 text-mb-ink">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {label}
      </dt>
      <dd className="mt-3 font-mb-display text-[1.75rem] font-light leading-none tracking-[-0.03em] tabular-nums text-mb-ink">{children}</dd>
      <dd className="mt-2 text-[13px] text-mb-ink/70">{note}</dd>
    </m.div>
  );
}

function SectionHead({ icon: Icon, tile, title, text }: { icon: LucideIcon; tile: string; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] text-mb-ink ${tile}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="font-mb-display text-lg font-medium tracking-[-0.02em] text-mb-ink">{title}</h2>
        <p className="text-sm text-mb-body">{text}</p>
      </div>
    </div>
  );
}
