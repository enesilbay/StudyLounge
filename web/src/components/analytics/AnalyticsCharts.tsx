import { useState } from 'react';
import { m } from 'framer-motion';
import { formatMinutes } from '../../lib/study';
import type { StudySummary } from '../../lib/study';
import { WEEKDAYS } from '../../lib/analytics';
import type { DayValue, calendarWeeks } from '../../lib/analytics';

/*
 * Analitik grafikleri. Büyüklük tek renk (yeşil) ölçekle, dersler kendi renkleriyle gösterilir;
 * sayılar ve etiketler her zaman yazı renginde kalır. Her grafikte üstüne gelince değer görünür.
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const dayShort = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });
const dayLong = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
const dayMonth = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
const monthShort = new Intl.DateTimeFormat('tr-TR', { month: 'short' });

/** Sıfırdan büyük dakikaları dört kademeye ayırır (en yoğun değere göre). */
function intensity(value: number, max: number) {
  if (!value || !max) return 'bg-mb-surface';
  const ratio = value / max;
  if (ratio > 0.75) return 'bg-mb-action';
  if (ratio > 0.5) return 'bg-mb-action/70';
  if (ratio > 0.25) return 'bg-mb-action/45';
  return 'bg-mb-action/20';
}

function IntensityLegend() {
  return (
    <span className="flex items-center gap-1 text-xs text-mb-body" aria-hidden="true">
      Az
      {['bg-mb-surface', 'bg-mb-action/20', 'bg-mb-action/45', 'bg-mb-action/70', 'bg-mb-action'].map((cls) => (
        <span key={cls} className={`h-3 w-3 rounded-[3px] ${cls}`} />
      ))}
      Çok
    </span>
  );
}

/* ───────────────────────── Günlük odak ───────────────────────── */

/** Eksen üst sınırı: 30 dakikanın katları. */
function niceCeiling(value: number) {
  return Math.ceil(value / 30) * 30;
}

export function DailyChart({ days }: { days: DayValue[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const top = niceCeiling(Math.max(30, ...days.map((day) => day.minutes)));
  const active = days.filter((day) => day.minutes > 0);
  const average = active.length ? days.reduce((sum, day) => sum + day.minutes, 0) / days.length : 0;
  const bestIndex = days.reduce((best, day, index) => (day.minutes > days[best].minutes ? index : best), 0);
  const count = days.length;
  const gap = count <= 7 ? 'gap-2 sm:gap-3' : count <= 30 ? 'gap-[3px]' : 'gap-px';
  const labelEvery = count <= 7 ? 1 : count <= 30 ? 5 : 15;
  const lastIndex = count - 1;

  return (
    <div className="mt-6 grid grid-cols-[3.75rem_minmax(0,1fr)] gap-x-2">
      <div className="relative h-56" aria-hidden="true">
        {[top, top / 2, 0].map((tick) => (
          <span key={tick} className="absolute right-0 -translate-y-1/2 whitespace-nowrap text-xs tabular-nums text-mb-body" style={{ top: `${100 - (tick / top) * 100}%` }}>
            {tick ? formatMinutes(tick) : '0'}
          </span>
        ))}
      </div>
      <div className="relative h-56" onMouseLeave={() => setHovered(null)}>
        {[top, top / 2, 0].map((tick) => (
          <span key={tick} className="absolute inset-x-0 border-t border-mb-line/70" style={{ top: `${100 - (tick / top) * 100}%` }} aria-hidden="true" />
        ))}
        {average > 0 ? (
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-[1] border-t-2 border-dashed border-mb-ink/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            style={{ top: `${100 - (average / top) * 100}%` }}
          >
            <span className="absolute -top-3 right-0 rounded-full bg-mb-ink px-2 py-0.5 text-[11px] font-medium text-mb-bg">ort. {formatMinutes(Math.round(average))}</span>
          </m.div>
        ) : null}
        <ol className={`absolute inset-0 grid ${gap}`} style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }} aria-label="Günlük odak süreleri">
          {days.map((day, index) => {
            const height = (day.minutes / top) * 100;
            const isToday = index === lastIndex;
            const label = `${dayLong.format(day.date)}: ${day.minutes ? formatMinutes(day.minutes) : 'odak yok'}`;
            return (
              <li key={day.key} className="relative flex items-end justify-center">
                <button
                  type="button"
                  aria-label={label}
                  onMouseEnter={() => setHovered(index)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  className="flex h-full w-full items-end justify-center rounded-[6px] focus-visible:outline-2 focus-visible:outline-mb-action"
                >
                  <m.span
                    className={`block w-full rounded-t-[4px] bg-gradient-to-t from-mb-action to-mb-action-2 ${count <= 7 ? 'max-w-12' : ''} ${
                      isToday || hovered === index ? '' : 'opacity-80'
                    } ${day.minutes ? '' : 'invisible'}`}
                    initial={{ height: '0%' }}
                    animate={{ height: `${Math.max(day.minutes ? 2 : 0, height)}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + Math.min(index, 30) * (count <= 7 ? 0.06 : 0.015), ease: EASE_OUT }}
                  />
                </button>
                {/* Yalnızca en iyi gün doğrudan etiketlenir. */}
                {index === bestIndex && day.minutes && hovered === null ? (
                  <span className="pointer-events-none absolute z-[2] mb-1 whitespace-nowrap text-xs font-medium tabular-nums text-mb-ink" style={{ bottom: `${Math.min(height, 90)}%` }}>
                    {formatMinutes(day.minutes)}
                  </span>
                ) : null}
                {hovered === index ? (
                  <span
                    role="tooltip"
                    className={`pointer-events-none absolute z-10 mb-2 whitespace-nowrap rounded-[10px] bg-mb-ink px-2.5 py-1.5 text-xs text-mb-bg shadow-mb-raised ${
                      index < count / 4 ? 'left-0' : index > (count * 3) / 4 ? 'right-0' : ''
                    }`}
                    style={{ bottom: `${Math.min(height, 82)}%` }}
                  >
                    <span className="block font-medium">{day.minutes ? formatMinutes(day.minutes) : 'Odak yok'}</span>
                    <span className="opacity-75">{dayLong.format(day.date)}</span>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
      <span />
      <ol className={`mt-2 grid ${gap} text-xs`} style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }} aria-hidden="true">
        {days.map((day, index) => {
          const show = count <= 7 || index === lastIndex || (index % labelEvery === 0 && lastIndex - index >= labelEvery / 2);
          return (
            <li key={day.key} className={`relative h-4 ${index === lastIndex ? 'font-medium text-mb-ink' : 'text-mb-body'}`}>
              {show ? (
                <span className={`absolute top-0 whitespace-nowrap ${count <= 7 ? 'inset-x-0 text-center' : index === lastIndex ? 'right-0' : 'left-0'}`}>
                  {index === lastIndex ? 'Bugün' : count <= 7 ? dayShort.format(day.date) : dayMonth.format(day.date)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ───────────────────────── Ders dağılımı ───────────────────────── */

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SubjectDonut({ rows }: { rows: StudySummary['bySubject'] }) {
  const [active, setActive] = useState<number | null>(null);
  const total = rows.reduce((sum, row) => sum + row.minutes, 0);
  const gapLength = rows.length > 1 ? 2.5 : 0;
  const lengths = rows.map((row) => (total ? (row.minutes / total) * CIRCUMFERENCE : 0));
  const segments = rows.map((row, index) => ({
    row,
    index,
    start: lengths.slice(0, index).reduce((sum, length) => sum + length, 0),
    length: Math.max(0, lengths[index] - gapLength),
  }));
  const focus = active !== null ? rows[active] : null;
  const colorOf = (row: StudySummary['bySubject'][number]) => (row.subjectId ? `var(--sl-subj-${row.color ?? 'blue'})` : 'var(--color-mb-line)');

  return (
    <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-48 w-48 shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" role="img" aria-label="Derslere göre odak süresi">
          <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="var(--color-mb-surface)" strokeWidth="16" />
          {segments.map(({ row, index, start, length }) => (
            <m.circle
              key={row.subjectId ?? 'none'}
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke={colorOf(row)}
              strokeWidth={active === index ? 20 : 16}
              strokeDasharray={`${length} ${CIRCUMFERENCE}`}
              initial={{ strokeDashoffset: -start + length, opacity: 0 }}
              animate={{ strokeDashoffset: -start, opacity: active === null || active === index ? 1 : 0.3 }}
              transition={{ duration: 0.9, delay: 0.2 + index * 0.08, ease: EASE_OUT }}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              className="cursor-pointer transition-[stroke-width]"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-mb-display text-lg font-medium tabular-nums tracking-[-0.02em] text-mb-ink">{formatMinutes(focus ? focus.minutes : total)}</p>
            <p className="max-w-24 truncate text-xs text-mb-body">{focus ? focus.name ?? 'Derssiz' : 'toplam'}</p>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1" aria-label="Ders listesi">
        {rows.map((row, index) => {
          const share = total ? Math.round((row.minutes / total) * 100) : 0;
          return (
            <li
              key={row.subjectId ?? 'none'}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              className={`flex items-center gap-3 rounded-[10px] px-2.5 py-2 transition-colors ${active === index ? 'bg-mb-surface' : ''}`}
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorOf(row) }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-mb-ink">{row.name ?? 'Derssiz'}</span>
              <span className="shrink-0 text-sm tabular-nums text-mb-body">{formatMinutes(row.minutes)}</span>
              <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-mb-ink">%{share}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────────────────────── Haftalık ritim ───────────────────────── */

const WEEKDAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export function RhythmMap({ grid }: { grid: number[][] }) {
  const [hovered, setHovered] = useState<{ day: number; hour: number } | null>(null);
  const max = Math.max(...grid.flat());
  const caption = hovered
    ? `${WEEKDAYS[hovered.day]} ${String(hovered.hour).padStart(2, '0')}:00–${String((hovered.hour + 1) % 24).padStart(2, '0')}:00 · ${
        grid[hovered.day][hovered.hour] >= 1 ? formatMinutes(Math.round(grid[hovered.day][hovered.hour])) : 'odak yok'
      }`
    : 'Bir kareye gel; o saatte ne kadar çalıştığını gör.';

  return (
    <div className="mt-5">
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 gap-y-[3px]" onMouseLeave={() => setHovered(null)}>
        {grid.map((hours, day) => (
          <div key={day} className="contents">
            <span className="self-center text-xs text-mb-body">{WEEKDAY_SHORT[day]}</span>
            <ol className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }} aria-label={`${WEEKDAYS[day]} saatleri`}>
              {hours.map((value, hour) => (
                <m.li
                  key={hour}
                  aria-label={`${WEEKDAYS[day]} ${String(hour).padStart(2, '0')}:00: ${value >= 1 ? formatMinutes(Math.round(value)) : 'odak yok'}`}
                  onMouseEnter={() => setHovered({ day, hour })}
                  className={`aspect-square rounded-[3px] ${intensity(value, max)} ${hovered?.day === day && hovered.hour === hour ? 'ring-2 ring-mb-ink' : ''}`}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.25 + hour * 0.015 + day * 0.03 }}
                />
              ))}
            </ol>
          </div>
        ))}
        <span />
        <div className="relative mt-1 h-4 text-[11px] text-mb-body" aria-hidden="true">
          {[0, 6, 12, 18].map((hour) => (
            <span key={hour} className="absolute" style={{ left: `${(hour / 24) * 100}%` }}>
              {String(hour).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-mb-body" aria-live="polite">{caption}</p>
        <IntensityLegend />
      </div>
    </div>
  );
}

/* ───────────────────────── Takvim ───────────────────────── */

export function CalendarMap({ weeks }: { weeks: ReturnType<typeof calendarWeeks> }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const cells = weeks.flat();
  const max = Math.max(...cells.map((cell) => cell.minutes));
  const hoveredCell = cells.find((cell) => cell.key === hovered);

  return (
    <div className="mt-5">
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2">
        <span />
        <div className="relative mb-1 h-4 text-[11px] text-mb-body" aria-hidden="true">
          {weeks.map((week, index) =>
            index === 0 || week[0].date.getMonth() !== weeks[index - 1][0].date.getMonth() ? (
              <span key={week[0].key} className="absolute" style={{ left: `${(index / weeks.length) * 100}%` }}>
                {monthShort.format(week[0].date)}
              </span>
            ) : null,
          )}
        </div>
        <div className="grid grid-rows-7 gap-[3px]" aria-hidden="true">
          {WEEKDAY_SHORT.map((day, index) => (
            <span key={day} className={`self-center text-xs text-mb-body ${index % 2 ? 'invisible' : ''}`}>
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-[3px]" role="list" aria-label="Son haftaların odak takvimi" onMouseLeave={() => setHovered(null)}>
          {weeks.map((week, weekIndex) =>
            week.map((cell) => (
              <m.span
                key={cell.key}
                role="listitem"
                aria-label={cell.future ? undefined : `${dayLong.format(cell.date)}: ${cell.minutes ? formatMinutes(cell.minutes) : 'odak yok'}`}
                aria-hidden={cell.future || undefined}
                onMouseEnter={() => !cell.future && setHovered(cell.key)}
                className={`aspect-square rounded-[3px] ${cell.future ? 'opacity-0' : intensity(cell.minutes, max)} ${
                  cell.today ? 'ring-2 ring-mb-ink ring-offset-1 ring-offset-mb-card' : hovered === cell.key ? 'ring-2 ring-mb-ink/60' : ''
                }`}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: cell.future ? 0 : 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + weekIndex * 0.03 }}
              />
            )),
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-mb-body" aria-live="polite">
          {hoveredCell ? `${dayLong.format(hoveredCell.date)} · ${hoveredCell.minutes ? formatMinutes(hoveredCell.minutes) : 'odak yok'}` : 'Çerçeveli kare bugün.'}
        </p>
        <IntensityLegend />
      </div>
    </div>
  );
}
