import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarCheck, Clock3, Flame, TrendingUp } from 'lucide-react';
import { IconTile, PageHeader, Pill, Surface } from '../components/ui';
import { api } from '../lib/api';
import { unwrapData } from '../lib/apiResponses';
import type { DailyAnalytics } from '../lib/types';
import { useAuthStore } from '../store/authStore';

const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const [records, setRecords] = useState<DailyAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadAnalytics() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await api.get<DailyAnalytics[]>(`/users/analytics/${user.id}`);
        if (!ignore) setRecords(unwrapData<DailyAnalytics[]>(response.data));
      } catch {
        if (!ignore) setRecords([]);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadAnalytics();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  const weeklyFocus = useMemo(() => buildWeeklyFocus(records), [records]);
  const heatmap = useMemo(() => buildHeatmap(records), [records]);
  const maxFocus = Math.max(1, ...weeklyFocus);
  const total = weeklyFocus.reduce((sum, value) => sum + value, 0);
  const bestDayIndex = weeklyFocus.reduce((best, value, index) => (value > weeklyFocus[best] ? index : best), 0);
  const bestHour = heatmap.reduce((best, value, index) => (value > heatmap[best] ? index : best), 0);

  return (
    <div>
      <PageHeader
        eyebrow="PRO panel"
        title="Analitik"
        description="Haftalık odak, verimli saatler ve çalışma düzeni gerçek analitik kayıtlarından okunur."
        action={<Pill tone={user?.isPremium ? 'accent' : 'primary'}>{user?.isPremium ? 'Premium aktif' : 'Standart'}</Pill>}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric icon={Flame} label="Bu hafta" value={`${total} dk`} tone="danger" />
        <Metric icon={Clock3} label="En verimli saat" value={`${String(bestHour).padStart(2, '0')}:00`} tone="info" />
        <Metric icon={CalendarCheck} label="En iyi gün" value={days[bestDayIndex]} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Surface className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-textDark">Haftalık odaklanma</h2>
              <p className="text-sm font-semibold text-textMuted">Dakika bazlı son 7 gün</p>
            </div>
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex h-64 items-end gap-3 rounded-xl bg-background p-4">
            {weeklyFocus.map((value, index) => {
              const height = value ? Math.max(10, (value / maxFocus) * 100) : 5;
              return (
                <div key={days[index]} className="flex h-full flex-1 flex-col justify-end gap-3">
                  <div className="flex flex-1 items-end rounded-lg bg-white/70">
                    <div
                      className={`w-full rounded-t-lg ${value ? 'bg-gradient-to-t from-primary to-electric' : 'bg-primary/5'}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-textDark">{value}</p>
                    <p className="text-sm font-bold text-textMuted">{days[index]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Surface>

        <Surface className="p-4">
          <IconTile icon={TrendingUp} tone="accent" />
          <h2 className="mt-4 text-xl font-black text-textDark">{total ? 'Canlı ilerleme' : 'Veri bekleniyor'}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-textMuted">
            {total
              ? 'Odak oturumları tamamlandıkça bu panel günlük kayıtlarla güncellenir.'
              : 'Henüz analitik kaydı yok. Bir odak oturumu tamamlandığında grafikler dolmaya başlayacak.'}
          </p>
          <div className="mt-4 rounded-xl border border-accent/20 bg-accent/10 p-4">
            <p className="text-sm font-bold text-accentDark">Verim notu</p>
            <p className="mt-1 text-sm font-semibold text-textDark">
              {isLoading ? 'Analitik veriler yükleniyor.' : total ? 'En yoğun saatlerini ısı haritasından takip edebilirsin.' : 'İlk çalışma verini bekliyoruz.'}
            </p>
          </div>
        </Surface>
      </div>

      <Surface className="mt-4 p-4">
        <h2 className="text-lg font-black text-textDark">Verimli saatler</h2>
        <div className="mt-4 grid grid-cols-6 gap-2 md:grid-cols-12">
          {heatmap.map((value, index) => (
            <div key={index} className="text-center">
              <div
                className="h-10 rounded-xl border"
                style={{
                  backgroundColor: value ? `rgba(255, 193, 7, ${0.14 + Math.min(value, 100) / 150})` : 'rgba(26, 35, 126, 0.04)',
                  borderColor: value ? 'rgba(255, 193, 7, 0.5)' : 'rgba(221, 227, 238, 0.9)',
                }}
              />
              <p className="mt-1 text-sm font-bold text-textMuted">{String(index).padStart(2, '0')}</p>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function buildWeeklyFocus(records: DailyAnalytics[]) {
  const today = new Date();
  const slots = Array<number>(7).fill(0);
  const dateToIndex = new Map<string, number>();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    dateToIndex.set(date.toISOString().slice(0, 10), 6 - offset);
  }

  records.forEach((record) => {
    const index = dateToIndex.get(record.date);
    if (index !== undefined) slots[index] = record.focusMinutes ?? 0;
  });

  return slots;
}

function buildHeatmap(records: DailyAnalytics[]) {
  return records.reduce(
    (hours, record) => {
      record.hourlyDistribution?.forEach((value, index) => {
        hours[index] += value;
      });
      return hours;
    },
    Array<number>(24).fill(0),
  );
}

function Metric({ icon, label, value, tone }: { icon: typeof Flame; label: string; value: string; tone: 'danger' | 'info' | 'success' }) {
  return (
    <Surface className="p-4">
      <IconTile icon={icon} tone={tone} />
      <p className="mt-3 text-xl font-black text-textDark">{value}</p>
      <p className="text-sm font-bold text-textMuted">{label}</p>
    </Surface>
  );
}
