import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiResponses';
import { Notice, StateBlock, Surface } from '../ui';

interface DailyPoint {
  date: string;
  newUsers: number;
  focusUsers: number;
  focusMinutes: number;
}

interface AdminOverview {
  users: { total: number; today: number; week: number; month: number };
  activeUsers: { today: number; week: number };
  focusMinutes: { total: number; today: number; week: number };
  rooms: { open: number; people: number };
  openReports: number;
  openFeedback: number;
  daily: DailyPoint[];
}

const numberFormatter = new Intl.NumberFormat('tr-TR');
const dayFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${numberFormatter.format(minutes)} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${numberFormatter.format(hours)} sa ${rest} dk` : `${numberFormatter.format(hours)} sa`;
}

/** Yönetici: kullanıcı, odak ve oda sayıları ile son 30 günün grafikleri. */
export function OverviewPanel() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AdminOverview>('/admin/overview')
      .then((response) => {
        if (!cancelled) setData(response.data);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(loadError));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!data) return <StateBlock loading title="Genel bakış yükleniyor" />;

  return (
    <div className="space-y-6">
      <section aria-label="Özet sayılar" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Toplam kullanıcı" value={numberFormatter.format(data.users.total)} hint={`Bugün +${data.users.today} · hafta +${data.users.week} · ay +${data.users.month}`} />
        <Stat label="Bugün odaklanan" value={numberFormatter.format(data.activeUsers.today)} hint={`Son 7 günde ${numberFormatter.format(data.activeUsers.week)} kişi`} />
        <Stat label="Toplam odak süresi" value={formatMinutes(data.focusMinutes.total)} hint={`Bugün ${formatMinutes(data.focusMinutes.today)} · hafta ${formatMinutes(data.focusMinutes.week)}`} />
        <Stat label="Açık oda" value={numberFormatter.format(data.rooms.open)} hint={`Şu an odalarda ${numberFormatter.format(data.rooms.people)} kişi`} />
        <Stat label="Açık şikayet" value={numberFormatter.format(data.openReports)} tone={data.openReports > 0 ? 'attention' : 'normal'} />
        <Stat label="Açık geri bildirim" value={numberFormatter.format(data.openFeedback)} tone={data.openFeedback > 0 ? 'attention' : 'normal'} />
      </section>

      <Surface className="p-4">
        <BarChart title="Yeni kullanıcı" unit="kişi" points={data.daily.map((d) => ({ date: d.date, value: d.newUsers }))} />
      </Surface>
      <Surface className="p-4">
        <BarChart title="Odaklanan kullanıcı" unit="kişi" points={data.daily.map((d) => ({ date: d.date, value: d.focusUsers }))} />
      </Surface>
      <Surface className="p-4">
        <BarChart title="Odak süresi" unit="dk" points={data.daily.map((d) => ({ date: d.date, value: d.focusMinutes }))} format={formatMinutes} />
      </Surface>
      <p className="text-sm text-textMuted">
        "Odaklanan kullanıcı", o gün en az bir odak oturumu bitiren kişidir. Giriş yapıp odaklanmayanlar sayılmaz. Günler Türkiye saatine göredir.
      </p>
    </div>
  );
}

function Stat({ label, value, hint, tone = 'normal' }: { label: string; value: string; hint?: string; tone?: 'normal' | 'attention' }) {
  return (
    <Surface className="p-4">
      <p className="text-sm font-semibold text-textMuted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone === 'attention' ? 'text-accentDark' : 'text-textDark'}`}>{value}</p>
      {hint ? <p className="mt-1 text-sm text-textMuted">{hint}</p> : null}
    </Surface>
  );
}

/** Bağımlılıksız çubuk grafik: her çubuğun üstüne gelince ya da odaklanınca değeri görünür. */
function BarChart({
  title,
  unit,
  points,
  format = (value: number) => numberFormatter.format(value),
}: {
  title: string;
  unit: string;
  points: { date: string; value: number }[];
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold text-textDark">{title}</span>
        <span className="text-sm text-textMuted">Son {points.length} gün · toplam {format(total)}</span>
      </figcaption>
      <div className="flex h-32 items-end gap-1" role="img" aria-label={`${title}: son ${points.length} günde toplam ${format(total)} ${unit}`}>
        {points.map((point) => (
          <div
            key={point.date}
            title={`${dayFormatter.format(new Date(`${point.date}T12:00:00`))}: ${format(point.value)}`}
            className="flex h-full min-w-0 flex-1 items-end"
          >
            <div className="w-full rounded-t bg-primary" style={{ height: point.value === 0 ? '2px' : `${Math.max(4, (point.value / max) * 100)}%`, opacity: point.value === 0 ? 0.3 : 1 }} />
          </div>
        ))}
      </div>
      {first && last ? (
        <div className="mt-1 flex justify-between text-xs text-textMuted">
          <span>{dayFormatter.format(new Date(`${first.date}T12:00:00`))}</span>
          <span>{dayFormatter.format(new Date(`${last.date}T12:00:00`))}</span>
        </div>
      ) : null}
    </figure>
  );
}
