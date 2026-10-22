import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { api } from '../../lib/api';
import { lastDays } from '../../lib/analytics';
import type { DayValue } from '../../lib/analytics';
import { formatMinutes } from '../../lib/study';
import type { StudySummary } from '../../lib/study';
import { IconHeading, Skeleton } from '../app/Kit';

const dayShort = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });
const dayLong = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Profildeki küçük haftalık özet: 7 çubuk ve toplam; ayrıntı Analitik sayfasında. */
export function WeekMini() {
  const [days, setDays] = useState<DayValue[] | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .get<StudySummary>('/study/summary?days=7')
      .then((response) => !ignore && setDays(lastDays(response.data.daily, 7)))
      .catch(() => !ignore && setDays(lastDays([], 7)));
    return () => {
      ignore = true;
    };
  }, []);

  const total = days?.reduce((sum, day) => sum + day.minutes, 0) ?? 0;
  const max = Math.max(1, ...(days ?? []).map((day) => day.minutes));

  return (
    <div className="flex h-full flex-col">
      <IconHeading
        icon={BarChart3}
        tile="bg-mb-tile-7"
        title="Son 7 gün"
        text={days ? (total ? `Toplam ${formatMinutes(total)}` : 'Bu hafta henüz odak yok') : 'Yükleniyor…'}
        aside={
          <Link to="/app/analytics" className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1.5 text-sm font-medium text-mb-action-ink transition hover:bg-mb-surface">
            Analitik <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      {days ? (
        <ol className="mt-5 grid flex-1 grid-cols-7 items-end gap-2" aria-label="Son 7 günün odak süreleri">
          {days.map((day, index) => {
            const isToday = index === days.length - 1;
            return (
              <li key={day.key} className="flex h-full min-h-28 flex-col items-center justify-end gap-1.5" title={`${dayLong.format(day.date)}: ${day.minutes ? formatMinutes(day.minutes) : 'odak yok'}`}>
                <span className="sr-only">{`${dayLong.format(day.date)}: ${day.minutes ? formatMinutes(day.minutes) : 'odak yok'}`}</span>
                <span className="relative flex w-full flex-1 items-end justify-center rounded-[8px] bg-mb-surface" aria-hidden="true">
                  <m.span
                    className={`block w-full rounded-[8px] bg-gradient-to-t from-mb-action to-mb-action-2 ${isToday ? '' : 'opacity-80'}`}
                    initial={{ height: '0%' }}
                    animate={{ height: `${day.minutes ? Math.max(8, (day.minutes / max) * 100) : 0}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
                <span className={`text-xs ${isToday ? 'font-medium text-mb-ink' : 'text-mb-body'}`} aria-hidden="true">
                  {dayShort.format(day.date)}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <Skeleton className="mt-5 h-32 w-full rounded-[12px]" />
      )}
    </div>
  );
}
