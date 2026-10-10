import { useState } from 'react';
import type { AdminOverview, TrendSeries } from '../../lib/admin';
import { TREND_SERIES, formatMinutes, numberFormatter, parseDay } from '../../lib/admin';
import { Pill } from '../ui';

const dayShort = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
const dayLong = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
const percent = new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits: 0 });

/* ───────────────────────── Günlük eğilim ───────────────────────── */

const formatSeries = (series: TrendSeries, value: number) => (series === 'focusMinutes' ? formatMinutes(value) : `${numberFormatter.format(value)} kişi`);

/** Eksen üst sınırı: dakikada 30'un, kişide 2'nin/10'un katı (yarısı da tam sayı olsun). */
function niceTop(series: TrendSeries, max: number) {
  if (series === 'focusMinutes') return Math.max(30, Math.ceil(max / 30) * 30);
  if (max <= 10) return Math.max(2, Math.ceil(max / 2) * 2);
  return Math.ceil(max / 10) * 10;
}

/** Tek seri çubuk grafik. 90 güne kadar ince çubuklar; üzerine gelince gün ve değer görünür. */
export function TrendChart({ daily, series }: { daily: AdminOverview['daily']; series: TrendSeries }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const values = daily.map((day) => day[series]);
  const top = niceTop(series, Math.max(0, ...values));
  const ticks = [top, top / 2, 0];
  const gap = daily.length > 45 ? 'gap-px' : daily.length > 10 ? 'gap-1' : 'gap-2';
  const label = TREND_SERIES.find((item) => item.key === series)?.label ?? '';
  const middle = Math.floor((daily.length - 1) / 2);

  return (
    <div>
      <div className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-x-2">
        <div className="relative h-56" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2 text-xs tabular-nums text-textMuted" style={{ top: `${100 - (tick / top) * 100}%` }}>
              {tick === 0 ? '0' : series === 'focusMinutes' ? formatMinutes(tick) : numberFormatter.format(tick)}
            </span>
          ))}
        </div>
        <div className="relative h-56" onMouseLeave={() => setHovered(null)} aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="absolute inset-x-0 border-t border-border" style={{ top: `${100 - (tick / top) * 100}%` }} />
          ))}
          <div className={`absolute inset-0 flex items-end ${gap}`}>
            {daily.map((day, index) => {
              const value = values[index];
              const height = (value / top) * 100;
              return (
                <div key={day.date} className="relative flex h-full min-w-0 flex-1 items-end justify-center" onMouseEnter={() => setHovered(index)}>
                  <span
                    className={`block w-full max-w-10 rounded-t-sm ${value ? 'bg-primary' : 'bg-transparent'} ${hovered === index ? 'opacity-75' : ''}`}
                    style={{ height: `${value ? Math.max(1.5, height) : 0}%` }}
                  />
                  {hovered === index ? (
                    <span
                      className={`pointer-events-none absolute z-10 mb-1.5 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs text-textDark shadow ${index > daily.length * 0.7 ? 'right-0' : index < daily.length * 0.3 ? 'left-0' : ''}`}
                      style={{ bottom: `${Math.min(height, 86)}%` }}
                    >
                      <span className="font-semibold">{dayLong.format(parseDay(day.date))}</span>
                      <span className="block tabular-nums text-textMuted">{formatSeries(series, value)}</span>
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <span />
        <div className="mt-2 flex justify-between text-xs tabular-nums text-textMuted" aria-hidden="true">
          <span>{daily[0] ? dayShort.format(parseDay(daily[0].date)) : ''}</span>
          {daily.length > 10 && daily[middle] ? <span>{dayShort.format(parseDay(daily[middle].date))}</span> : null}
          <span className="font-semibold text-textDark">Bugün</span>
        </div>
      </div>

      <table className="sr-only">
        <caption>{label}, günlük</caption>
        <thead>
          <tr>
            <th scope="col">Gün</th>
            <th scope="col">{label}</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((day, index) => (
            <tr key={day.date}>
              <th scope="row">{dayLong.format(parseDay(day.date))}</th>
              <td>{formatSeries(series, values[index])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────────────────── Onboarding hunisi ───────────────────────── */

/** "Masanı hazırla" adımları: dönemde kayıt olanların her adıma ulaşma oranı. */
export function OnboardingFunnel({ funnel }: { funnel: AdminOverview['funnel'] }) {
  const steps = [
    { label: 'Kayıt oldu', value: funnel.registered },
    { label: 'Ders ekledi', value: funnel.addedSubject },
    { label: 'Hedef seçti', value: funnel.setGoal },
    { label: 'İlk odak oturumu', value: funnel.firstFocus },
  ];
  if (!funnel.registered) {
    return <p className="py-8 text-center text-[15px] text-textMuted">Bu dönemde kayıt olan yok.</p>;
  }

  // En büyük kayıp: bir önceki adıma göre en çok kişinin düştüğü adım.
  let worst = -1;
  let worstDrop = 0;
  steps.forEach((step, index) => {
    if (index === 0) return;
    const drop = steps[index - 1].value - step.value;
    if (drop > worstDrop) {
      worstDrop = drop;
      worst = index;
    }
  });

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => {
        const ratio = step.value / funnel.registered;
        return (
          <li key={step.label}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="flex items-center gap-2 text-[15px] font-semibold text-textDark">
                {step.label}
                {index === worst ? <Pill tone="danger">En büyük kayıp: {numberFormatter.format(worstDrop)} kişi</Pill> : null}
              </span>
              <span className="text-sm tabular-nums text-textMuted">
                <span className="font-semibold text-textDark">{numberFormatter.format(step.value)}</span>
                {index > 0 ? ` · ${percent.format(ratio)}` : ''}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────────────────── Elde tutma ───────────────────────── */

const SMALL_SAMPLE = 20;

export function Retention({ retention }: { retention: AdminOverview['retention'] }) {
  const smallest = Math.min(...retention.filter((row) => row.eligible > 0).map((row) => row.eligible));
  return (
    <div>
      <dl className="grid grid-cols-3 gap-3">
        {retention.map((row) => (
          <div key={row.day} className="rounded-lg bg-sunken px-3 py-3">
            <dt className="text-sm font-semibold text-textMuted">{row.day}. gün</dt>
            {row.eligible ? (
              <>
                <dd className="mt-1 font-display text-3xl tabular-nums text-textDark">{percent.format(row.retained / row.eligible)}</dd>
                <dd className="mt-0.5 text-sm tabular-nums text-textMuted">
                  {numberFormatter.format(row.retained)} / {numberFormatter.format(row.eligible)} kişi
                </dd>
              </>
            ) : (
              <>
                <dd className="mt-1 font-display text-3xl text-textMuted">—</dd>
                <dd className="mt-0.5 text-sm text-textMuted">Henüz ölçülemez</dd>
              </>
            )}
          </div>
        ))}
      </dl>
      {Number.isFinite(smallest) && smallest < SMALL_SAMPLE ? (
        <p className="mt-3 text-sm text-textMuted">Örneklem küçük ({numberFormatter.format(smallest)} kişi); oranlar kullanıcı sayısı arttıkça anlam kazanır.</p>
      ) : null}
    </div>
  );
}

/* ───────────────────────── Yoğun saatler ───────────────────────── */

const WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const WEEKDAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

const LEVELS = ['bg-sunken', 'bg-primary/20', 'bg-primary/45', 'bg-primary/70', 'bg-primary'];

function levelOf(value: number, max: number) {
  if (!value || !max) return 0;
  const ratio = value / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

/** Haftanın günü × saat; tek renkli (turkuaz) yoğunluk ölçeği, en yoğun hücreye göre. */
export function Heatmap({ cells }: { cells: AdminOverview['heatmap'] }) {
  const grid = new Map(cells.map((cell) => [`${cell.dow}-${cell.hour}`, cell.minutes]));
  const max = Math.max(0, ...cells.map((cell) => cell.minutes));
  if (!max) {
    return <p className="py-8 text-center text-[15px] text-textMuted">Bu dönemde odak oturumu yok.</p>;
  }
  const peak = cells.reduce((best, cell) => (cell.minutes > best.minutes ? cell : best), cells[0]);

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[640px]" role="img" aria-label={`En yoğun zaman: ${WEEKDAYS[peak.dow - 1]} ${hourLabel(peak.hour)}, ${formatMinutes(peak.minutes)}`}>
          <div className="grid grid-cols-[2.75rem_repeat(24,minmax(0,1fr))] gap-[3px]">
            {WEEKDAYS.map((day, dayIndex) => (
              <div key={day} className="contents">
                <span className="self-center text-xs font-semibold text-textMuted" aria-hidden="true">{WEEKDAYS_SHORT[dayIndex]}</span>
                {Array.from({ length: 24 }, (_, hour) => {
                  const minutes = grid.get(`${dayIndex + 1}-${hour}`) ?? 0;
                  return (
                    <span
                      key={hour}
                      title={`${day} ${hourLabel(hour)}–${hourLabel((hour + 1) % 24)}: ${minutes ? formatMinutes(minutes) : 'odak yok'}`}
                      className={`block h-6 rounded-[3px] ${LEVELS[levelOf(minutes, max)]}`}
                    />
                  );
                })}
              </div>
            ))}
            <span />
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={hour} className="pt-1 text-[11px] tabular-nums text-textMuted" aria-hidden="true">
                {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-textMuted">
        <p>
          En yoğun: <span className="font-semibold text-textDark">{WEEKDAYS[peak.dow - 1]} {hourLabel(peak.hour)}</span> ({formatMinutes(peak.minutes)})
        </p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span>Az</span>
          {LEVELS.map((level) => (
            <span key={level} className={`h-3.5 w-3.5 rounded-[3px] ${level}`} />
          ))}
          <span>Çok</span>
        </div>
      </div>
    </div>
  );
}
