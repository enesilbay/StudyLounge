import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, History, Monitor, Smartphone } from 'lucide-react';
import { api } from '../../lib/api';
import { dotClassFor, formatMinutes } from '../../lib/study';
import type { StudySession, StudySummary } from '../../lib/study';
import { m } from 'framer-motion';
import { Card, Rise } from '../app/Kit';

const DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Analitik sayfası: ders dağılımı, 30 günlük takvim ve oturum geçmişi. */
export default function StudyInsights() {
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    Promise.all([api.get<StudySummary>(`/study/summary?days=${DAYS}`), api.get<StudySession[]>('/study/sessions')])
      .then(([summaryResponse, sessionsResponse]) => {
        if (ignore) return;
        setSummary(summaryResponse.data);
        setSessions(sessionsResponse.data);
      })
      .catch(() => !ignore && setFailed(true));
    return () => {
      ignore = true;
    };
  }, []);

  if (failed) return <Card className="mt-4 p-4 text-[15px] text-mb-body">Oturum verileri şu an yüklenemedi.</Card>;
  if (!summary) return null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Rise delay={0.3}>
        <SubjectBreakdown summary={summary} />
      </Rise>
      <Rise delay={0.36}>
        <MonthCalendar summary={summary} />
      </Rise>
      <Rise delay={0.42} className="xl:col-span-2">
        <SessionHistory sessions={sessions} />
      </Rise>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof BookOpen; title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-mb-display text-lg font-medium tracking-[-0.02em] text-mb-ink">{title}</h2>
        <p className="text-sm text-mb-body">{subtitle}</p>
      </div>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-mb-tint text-mb-action">
        <Icon className="h-4 w-4" />
      </span>
    </div>
  );
}

/** Ders başına süre: her satırda ad ve süre yazılı, renk yalnızca eşlik eder. */
function SubjectBreakdown({ summary }: { summary: StudySummary }) {
  const rows = summary.bySubject;
  const max = Math.max(1, ...rows.map((row) => row.minutes));
  const total = rows.reduce((sum, row) => sum + row.minutes, 0);

  return (
    <Card className="h-full p-5 md:p-6">
      <SectionTitle icon={BookOpen} title="Ders dağılımı" subtitle={`Son ${summary.days} gün, ${summary.sessionCount} oturum`} />
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-mb-body">Odadan bir ders seçip odaklandığında dağılım burada görünür.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => {
            const share = total ? Math.round((row.minutes / total) * 100) : 0;
            const label = row.name ?? 'Derssiz';
            return (
              <li key={row.subjectId ?? 'none'} title={`${label}: ${formatMinutes(row.minutes)} (%${share})`}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-mb-ink">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.subjectId ? dotClassFor(row.color) : 'bg-mb-line'}`} aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-mb-body">
                    {formatMinutes(row.minutes)} · %{share}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-mb-surface">
                  <m.div
                    className={`h-2 rounded-full ${row.subjectId ? dotClassFor(row.color) : 'bg-mb-line'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(2, (row.minutes / max) * 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.45 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Tek renkli (yeşil) ölçek; boş gün yüzey renginde kalır. */
const LEVELS = [
  { min: 120, cls: 'bg-mb-action', label: '2 sa+' },
  { min: 60, cls: 'bg-mb-action/70', label: '1–2 sa' },
  { min: 30, cls: 'bg-mb-action/45', label: '30–59 dk' },
  { min: 1, cls: 'bg-mb-action/20', label: '1–29 dk' },
];

function levelFor(minutes: number) {
  return LEVELS.find((level) => minutes >= level.min)?.cls ?? 'bg-mb-surface';
}

function MonthCalendar({ summary }: { summary: StudySummary }) {
  const byDate = new Map(summary.daily.map((day) => [day.date, day.minutes]));
  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, index) => {
    const date = new Date(today.getTime() - (DAYS - 1 - index) * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    return { key, date, minutes: byDate.get(key) ?? 0 };
  });
  const activeDays = days.filter((day) => day.minutes > 0).length;
  const formatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });

  return (
    <Card className="h-full p-5 md:p-6">
      <SectionTitle icon={CalendarDays} title="Son 30 gün" subtitle={`${activeDays} gün odaklandın`} />
      <div className="grid grid-cols-10 gap-1.5" role="list" aria-label="Son 30 günün odak süreleri">
        {days.map((day, index) => (
          <m.div
            key={day.key}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.45 + (index % 10) * 0.03 + Math.floor(index / 10) * 0.08 }}
            role="listitem"
            title={`${formatter.format(day.date)}: ${day.minutes ? formatMinutes(day.minutes) : 'odak yok'}`}
            aria-label={`${formatter.format(day.date)}: ${day.minutes ? formatMinutes(day.minutes) : 'odak yok'}`}
            className={`aspect-square rounded-[6px] ${levelFor(day.minutes)} ${day.key === today.toISOString().slice(0, 10) ? 'ring-2 ring-mb-ink ring-offset-2 ring-offset-mb-card' : ''}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mb-body">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-mb-surface" aria-hidden="true" /> Yok
        </span>
        {[...LEVELS].reverse().map((level) => (
          <span key={level.label} className="flex items-center gap-1">
            <span className={`h-3 w-3 rounded ${level.cls}`} aria-hidden="true" /> {level.label}
          </span>
        ))}
      </div>
    </Card>
  );
}

function SessionHistory({ sessions }: { sessions: StudySession[] }) {
  const formatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const visible = sessions.slice(0, 20);

  return (
    <Card className="p-5 md:p-6">
      <SectionTitle icon={History} title="Oturum geçmişi" subtitle="Son 20 odak oturumun" />
      {visible.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-mb-body">Henüz kayıtlı oturum yok. Bir odadan odaklandığında burada listelenir.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-mb-line text-[13px] text-mb-body">
                <th className="py-2 pr-3 font-medium">Başlangıç</th>
                <th className="py-2 pr-3 font-medium">Süre</th>
                <th className="py-2 pr-3 font-medium">Ders</th>
                <th className="py-2 pr-3 font-medium">Oda</th>
                <th className="py-2 font-medium">Cihaz</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((session, index) => (
                <m.tr
                  key={session.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + Math.min(index, 12) * 0.03 }}
                  className="border-b border-mb-line/60 transition-colors last:border-0 hover:bg-mb-surface/60"
                >
                  <td className="py-2.5 pr-3 text-mb-ink">{formatter.format(new Date(session.startedAt))}</td>
                  <td className="py-2.5 pr-3 text-sm tabular-nums text-mb-ink">
                    {formatMinutes(session.minutes)}
                    {session.creditedMinutes > session.minutes ? <span className="ml-1 rounded-[4px] bg-mb-tint px-1 text-xs text-mb-action">×2</span> : null}
                  </td>
                  <td className="py-2.5 pr-3">
                    {session.subject ? (
                      <span className="flex items-center gap-2 text-mb-ink">
                        <span className={`h-2.5 w-2.5 rounded-full ${dotClassFor(session.subject.color)}`} aria-hidden="true" />
                        {session.subject.name}
                      </span>
                    ) : (
                      <span className="text-mb-body">Derssiz</span>
                    )}
                  </td>
                  <td className="max-w-48 truncate py-2.5 pr-3 text-mb-body">{session.roomName ?? '—'}</td>
                  <td className="py-2.5 text-mb-body">
                    {session.source === 'web' ? (
                      <span className="inline-flex items-center gap-1"><Monitor className="h-4 w-4" /> Web</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Smartphone className="h-4 w-4" /> Telefon</span>
                    )}
                  </td>
                </m.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
