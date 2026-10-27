import { useState } from 'react';
import { m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { groupByDay, ISTANBUL_TZ, localKey } from '../../lib/analytics';
import { formatMinutes } from '../../lib/study';
import type { StudySession } from '../../lib/study';
import { ghostButton } from '../app/Kit';

const time = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: ISTANBUL_TZ });
const dayTitle = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ISTANBUL_TZ });

function dayLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  if (localKey(date) === localKey(today)) return 'Bugün';
  if (localKey(date) === localKey(yesterday)) return 'Dün';
  return dayTitle.format(date);
}

/** Oturumlar güne göre gruplanır; her oturumun çubuğu dönemin en uzun oturumuna göre uzar ve dersin renginde. */
export function SessionTimeline({ sessions }: { sessions: StudySession[] }) {
  const [visibleDays, setVisibleDays] = useState(4);
  const groups = groupByDay(sessions);
  const longest = Math.max(1, ...sessions.map((session) => session.minutes));
  const shown = groups.slice(0, visibleDays);

  return (
    <div className="mt-4">
      <ol className="space-y-5">
        {shown.map((group, groupIndex) => {
          const total = group.items.reduce((sum, session) => sum + session.minutes, 0);
          return (
            <li key={group.key}>
              <div className="flex items-baseline justify-between gap-3 border-b border-mb-line/70 pb-1.5">
                <h3 className="text-sm font-medium capitalize text-mb-ink">{dayLabel(group.date)}</h3>
                <span className="text-xs tabular-nums text-mb-body">
                  {group.items.length} oturum · {formatMinutes(total)}
                </span>
              </div>
              <ul className="mt-1">
                {group.items.map((session, index) => {
                  const color = session.subject ? `var(--sl-subj-${session.subject.color})` : 'var(--color-mb-line)';
                  return (
                    <m.li
                      key={session.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 + Math.min(groupIndex * 4 + index, 16) * 0.03 }}
                      className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-1.5 py-2 transition-colors hover:bg-mb-surface/70 sm:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,10rem)_auto]"
                    >
                      <span className="text-[13px] tabular-nums text-mb-body">
                        {time.format(new Date(session.startedAt))}
                        <span className="hidden sm:inline">–{time.format(new Date(session.endedAt))}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                          <span className={`truncate text-[15px] ${session.subject ? 'font-medium text-mb-ink' : 'text-mb-body'}`}>{session.subject?.name ?? 'Derssiz'}</span>
                        </span>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-mb-surface" aria-hidden="true">
                          <m.span
                            className="block h-full rounded-full"
                            style={{ backgroundColor: color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(4, (session.minutes / longest) * 100)}%` }}
                            transition={{ duration: 0.7, delay: 0.2 + Math.min(groupIndex * 4 + index, 16) * 0.03, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </span>
                      </span>
                      <span className="hidden min-w-0 truncate text-sm text-mb-body sm:block" title={session.roomName ?? undefined}>
                        {session.roomName ?? '—'}
                      </span>
                      <span className="flex items-center justify-end gap-2 text-sm tabular-nums text-mb-ink">
                        {session.creditedMinutes > session.minutes ? (
                          <span className="rounded-[6px] bg-mb-tile-5 px-1.5 text-xs font-medium text-mb-ink" title="Elite odada iki kat puan">×2</span>
                        ) : null}
                        <span className="font-medium">{formatMinutes(session.minutes)}</span>
                      </span>
                    </m.li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
      {groups.length > visibleDays ? (
        <button type="button" onClick={() => setVisibleDays((count) => count + 7)} className={`${ghostButton} mt-3 w-full`}>
          <ChevronDown className="h-4 w-4" />
          Daha eski günleri göster
        </button>
      ) : null}
    </div>
  );
}
