import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { BarChart3, BookOpen, CalendarDays, Clock3, Flame, History, Snowflake, Sun, Timer, TrendingDown, TrendingUp, Waves } from 'lucide-react';
import { api } from '../lib/api';
import { bestSlot, calendarWeeks, changePercent, ISTANBUL_TZ, lastDays, longestRun, peakHour, periodStart, periodTotals, rhythmGrid, WEEKDAYS } from '../lib/analytics';
import { formatMinutes } from '../lib/study';
import type { StudySession, StudySummary } from '../lib/study';
import { AppPage, Card, CountUp, EmptyState, ErrorState, IconHeading, Rise, SegmentedTabs, Skeleton, TileStat, actionButton } from '../components/app/Kit';
import { Notice } from '../components/ui';
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
const shortDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: ISTANBUL_TZ });
/** Sunucu 1000 oturumdan fazlasını kesip `X-Truncated: true` başlığı ekler. */
const SESSION_LIMIT = 1000;

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
  // İki istekten biri düşebilir: eksik olan `null` kalır, diğeri gösterilir. `period` verinin hangi döneme ait olduğunu söyler.
  const [current, setCurrent] = useState<{ period: Period; summary: StudySummary | null; sessions: StudySession[] | null; truncated: boolean } | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const days = Number(period);

  useEffect(() => {
    let ignore = false;
    api
      .get<StudySummary>(`/study/summary?days=${HISTORY_DAYS}`)
      .then((response) => !ignore && setHistory(response.data))
      .catch(() => !ignore && setHistoryFailed(true));
    return () => {
      ignore = true;
    };
  }, [attempt]);

  useEffect(() => {
    let ignore = false;
    // Dönem değişince eski dönemin verisi `current.period` denetimiyle gizlenir; yeni başlıkla eski veri görünmez.
    const from = periodStart(days).toISOString();
    Promise.allSettled([api.get<StudySummary>(`/study/summary?days=${days}`), api.get<StudySession[]>(`/study/sessions?from=${encodeURIComponent(from)}`)]).then(([summary, sessions]) => {
      if (ignore) return;
      setCurrent({
        period,
        summary: summary.status === 'fulfilled' ? summary.value.data : null,
        sessions: sessions.status === 'fulfilled' ? sessions.value.data : null,
        truncated: sessions.status === 'fulfilled' && (String(sessions.value.headers?.['x-truncated']) === 'true' || sessions.value.data.length >= SESSION_LIMIT),
      });
    });
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

  const everythingFailed = current !== null && current.period === period && !current.summary && !current.sessions;
  if (historyFailed || everythingFailed) {
    return (
      <AppPage title="Analitik" actions={header}>
        <Card className="mt-6">
          <ErrorState
            title="Analitik yüklenemedi"
            text="Bağlantını kontrol edip tekrar dene."
            onRetry={() => {
              setHistoryFailed(false);
              setHistory(null);
              setCurrent(null);
              setAttempt((value) => value + 1);
            }}
          />
        </Card>
      </AppPage>
    );
  }

  if (!history || !current || current.period !== period) {
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

  const { summary, truncated } = current;
  const sessions = current.sessions ?? [];
  const partial = !current.summary || !current.sessions;
  const noData = !partial && daily.every((day) => !day.minutes) && sessions.length === 0;
  const asDuration = (value: number) => formatMinutes(Math.round(value));

  return (
    <AppPage title="Analitik" description="Ne kadar, ne zaman ve hangi derse odaklandığın." actions={header}>
      {partial ? (
        <div className="mb-4">
          <Notice tone="danger">
            {!summary ? 'Ders dağılımı yüklenemedi.' : 'Oturum ayrıntıları yüklenemedi.'} Diğer bölümler gösteriliyor.{' '}
            <button type="button" className="font-medium underline underline-offset-2" onClick={() => setAttempt((value) => value + 1)}>
              Yeniden dene
            </button>
          </Notice>
        </div>
      ) : null}
      {truncated ? (
        <div className="mb-4">
          <Notice tone="info">Yalnızca son {SESSION_LIMIT} oturum gösteriliyor; ritim ve oturum listesi bu sınıra göre hesaplanır.</Notice>
        </div>
      ) : null}
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
            sessionCount={summary?.sessionCount ?? sessions.length}
            series={view.range.map((day) => day.minutes)}
          />

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <TileStat index={0} tile="bg-mb-tile-5" icon={Sun} label="Bugün" note={todayNote(view.today, view.yesterday)}>
              <CountUp value={view.today} format={asDuration} />
            </TileStat>
            <TileStat
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
            </TileStat>
            <TileStat
              index={2}
              tile="bg-mb-tile-2"
              icon={Timer}
              label="En uzun oturum"
              note={view.longest ? `${shortDate.format(new Date(view.longest.startedAt))}${view.longest.subject ? ` · ${view.longest.subject.name}` : ''}` : 'Bu dönemde oturum yok'}
            >
              {view.longest ? <CountUp value={view.longest.minutes} format={asDuration} /> : '—'}
            </TileStat>
            <TileStat
              index={3}
              tile="bg-mb-tile-4"
              icon={Clock3}
              label="En verimli zamanın"
              note={view.peak !== null ? `En yoğun saat ${String(view.peak).padStart(2, '0')}:00` : 'Veri bekleniyor'}
            >
              <span className="text-[1.35rem] leading-tight">{view.slot ? `${WEEKDAYS[view.slot.weekday]} ${view.slot.part.label}` : '—'}</span>
            </TileStat>
          </dl>

          <Rise delay={0.15}>
            <Card className="p-5 md:p-6">
              <IconHeading icon={BarChart3} tile="bg-mb-tile-1" title="Günlük odak" text={`Son ${days} gün · ${view.activeDays} gün odaklandın${view.run > 1 ? ` · en uzun ${view.run} gün aralıksız` : ''}`} />
              <DailyChart days={view.range} />
            </Card>
          </Rise>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Rise delay={0.2}>
              <Card className="h-full p-5 md:p-6">
                <IconHeading icon={BookOpen} tile="bg-mb-tile-3" title="Ders dağılımı" text={summary ? `Son ${days} gün · ${summary.sessionCount} oturum` : `Son ${days} gün`} />
                {!summary ? (
                  <p className="py-10 text-center text-[15px] text-mb-body">Ders dağılımı şu an yüklenemedi.</p>
                ) : summary.bySubject.length ? (
                  <SubjectDonut rows={summary.bySubject} />
                ) : (
                  <p className="py-10 text-center text-[15px] text-mb-body">Odada bir ders seçip odaklandığında dağılım burada görünür.</p>
                )}
              </Card>
            </Rise>
            <Rise delay={0.26}>
              <Card className="h-full p-5 md:p-6">
                <IconHeading
                  icon={Waves}
                  tile="bg-mb-tile-7"
                  title="Çalışma ritmin"
                  text={view.slot ? `En çok ${WEEKDAYS[view.slot.weekday].toLocaleLowerCase('tr-TR')} ${view.slot.part.label}ları odaklanıyorsun` : `Son ${days} gün, gün ve saate göre`}
                />
                {!current.sessions ? (
                  <p className="py-10 text-center text-[15px] text-mb-body">Oturum ayrıntıları yüklenemedi.</p>
                ) : sessions.length ? (
                  <RhythmMap grid={view.grid} />
                ) : (
                  <p className="py-10 text-center text-[15px] text-mb-body">Oturum tamamladıkça ritmin burada oluşur.</p>
                )}
              </Card>
            </Rise>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <Rise delay={0.3}>
              <Card className="p-5 md:p-6">
                <IconHeading icon={CalendarDays} tile="bg-mb-tile-8" title="Son 12 hafta" text={`${view.weeks.flat().filter((cell) => cell.minutes > 0).length} gün odaklandın`} />
                <CalendarMap weeks={view.weeks} />
              </Card>
            </Rise>
            <Rise delay={0.34}>
              <Card className="p-5 md:p-6">
                <IconHeading icon={History} tile="bg-mb-tile-6" title="Oturumların" text={`Son ${days} gün · güne göre`} />
                {!current.sessions ? (
                  <p className="py-10 text-center text-[15px] text-mb-body">Oturum ayrıntıları yüklenemedi.</p>
                ) : sessions.length ? (
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
