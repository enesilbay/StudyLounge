import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, History, Monitor, Smartphone } from 'lucide-react';
import { api } from '../../lib/api';
import { dotClassFor, formatMinutes } from '../../lib/study';
import type { StudySession, StudySummary } from '../../lib/study';
import { Surface } from '../ui';

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

  if (failed) return <Surface className="mt-4 p-4 text-[15px] text-textMuted">Oturum verileri şu an yüklenemedi.</Surface>;
  if (!summary) return null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SubjectBreakdown summary={summary} />
      <MonthCalendar summary={summary} />
      <div className="xl:col-span-2">
        <SessionHistory sessions={sessions} />
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof BookOpen; title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-textDark">{title}</h2>
        <p className="text-sm text-textMuted">{subtitle}</p>
      </div>
      <Icon className="h-5 w-5 shrink-0 text-primary" />
    </div>
  );
}

/** Ders başına süre: her satırda ad ve süre yazılı, renk yalnızca eşlik eder. */
function SubjectBreakdown({ summary }: { summary: StudySummary }) {
  const rows = summary.bySubject;
  const max = Math.max(1, ...rows.map((row) => row.minutes));
  const total = rows.reduce((sum, row) => sum + row.minutes, 0);

  return (
    <Surface className="p-4">
      <SectionTitle icon={BookOpen} title="Ders dağılımı" subtitle={`Son ${summary.days} gün, ${summary.sessionCount} oturum`} />
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-textMuted">Odadan bir ders seçip odaklandığında dağılım burada görünür.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const share = total ? Math.round((row.minutes / total) * 100) : 0;
            const label = row.name ?? 'Derssiz';
            return (
              <li key={row.subjectId ?? 'none'} title={`${label}: ${formatMinutes(row.minutes)} (%${share})`}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-textDark">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.subjectId ? dotClassFor(row.color) : 'bg-border'}`} aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-textMuted">
                    {formatMinutes(row.minutes)} · %{share}
                  </span>
                </div>
                <div className="h-2 rounded bg-sunken">
                  <div className={`h-2 rounded ${row.subjectId ? dotClassFor(row.color) : 'bg-border'}`} style={{ width: `${Math.max(2, (row.minutes / max) * 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Surface>
  );
}

/** Tek renkli (turkuaz) ölçek; boş gün yüzey renginde kalır. */
const LEVELS = [
  { min: 120, cls: 'bg-primary', label: '2 sa+' },
  { min: 60, cls: 'bg-primary/70', label: '1–2 sa' },
  { min: 30, cls: 'bg-primary/45', label: '30–59 dk' },
  { min: 1, cls: 'bg-primary/20', label: '1–29 dk' },
];

function levelFor(minutes: number) {
  return LEVELS.find((level) => minutes >= level.min)?.cls ?? 'bg-sunken';
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
    <Surface className="p-4">
      <SectionTitle icon={CalendarDays} title="Son 30 gün" subtitle={`${activeDays} gün odaklandın`} />
      <div className="grid grid-cols-10 gap-1.5" role="list" aria-label="Son 30 günün odak süreleri">
        {days.map((day) => (
          <div
            key={day.key}
            role="listitem"
            title={`${formatter.format(day.date)}: ${day.minutes ? formatMinutes(day.minutes) : 'odak yok'}`}
            aria-label={`${formatter.format(day.date)}: ${day.minutes ? formatMinutes(day.minutes) : 'odak yok'}`}
            className={`aspect-square rounded ${levelFor(day.minutes)} ${day.key === today.toISOString().slice(0, 10) ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface' : ''}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-textMuted">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-sunken" aria-hidden="true" /> Yok
        </span>
        {[...LEVELS].reverse().map((level) => (
          <span key={level.label} className="flex items-center gap-1">
            <span className={`h-3 w-3 rounded ${level.cls}`} aria-hidden="true" /> {level.label}
          </span>
        ))}
      </div>
    </Surface>
  );
}

function SessionHistory({ sessions }: { sessions: StudySession[] }) {
  const formatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const visible = sessions.slice(0, 20);

  return (
    <Surface className="p-4">
      <SectionTitle icon={History} title="Oturum geçmişi" subtitle="Son 20 odak oturumun" />
      {visible.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-textMuted">Henüz kayıtlı oturum yok. Bir odadan odaklandığında burada listelenir.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-border text-sm text-textMuted">
                <th className="py-2 pr-3 font-semibold">Başlangıç</th>
                <th className="py-2 pr-3 font-semibold">Süre</th>
                <th className="py-2 pr-3 font-semibold">Ders</th>
                <th className="py-2 pr-3 font-semibold">Oda</th>
                <th className="py-2 font-semibold">Cihaz</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((session) => (
                <tr key={session.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 text-textDark">{formatter.format(new Date(session.startedAt))}</td>
                  <td className="py-2 pr-3 font-mono text-sm tabular-nums text-textDark">
                    {formatMinutes(session.minutes)}
                    {session.creditedMinutes > session.minutes ? <span className="ml-1 text-xs text-accentDark">×2</span> : null}
                  </td>
                  <td className="py-2 pr-3">
                    {session.subject ? (
                      <span className="flex items-center gap-2 text-textDark">
                        <span className={`h-2.5 w-2.5 rounded-full ${dotClassFor(session.subject.color)}`} aria-hidden="true" />
                        {session.subject.name}
                      </span>
                    ) : (
                      <span className="text-textMuted">Derssiz</span>
                    )}
                  </td>
                  <td className="max-w-48 truncate py-2 pr-3 text-textMuted">{session.roomName ?? '—'}</td>
                  <td className="py-2 text-textMuted">
                    {session.source === 'web' ? (
                      <span className="inline-flex items-center gap-1"><Monitor className="h-4 w-4" /> Web</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Smartphone className="h-4 w-4" /> Telefon</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Surface>
  );
}
