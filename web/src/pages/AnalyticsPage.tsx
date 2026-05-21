import { useState, useEffect } from 'react';
import { BarChart as BarChartIcon, Activity, Clock, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface DailyAnalytics {
  id: number;
  date: string;
  focusMinutes: number;
  hourlyDistribution: number[];
}

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DailyAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/users/analytics/me');
        setData(res.data);
      } catch (err) {
        console.error('Analitik verileri yüklenemedi', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const totalWeeklyMinutes = data.reduce((acc, curr) => acc + curr.focusMinutes, 0);
  const weeklyHours = Math.floor(totalWeeklyMinutes / 60);

  return (
    <div className="pb-20 md:pb-0">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-textDark mb-2">İstatistikler</h1>
          <p className="text-textMuted font-medium">Çalışma verimini ve geçmiş performansını incele.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-[24px] border border-border flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-softIndigo rounded-full flex items-center justify-center text-primary">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-textMuted font-bold text-sm">Haftalık Odak</p>
                <p className="text-2xl font-black text-textDark">{weeklyHours} Saat</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-[24px] border border-border flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-softSuccess rounded-full flex items-center justify-center text-success">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-textMuted font-bold text-sm">En İyi Seri (Genel)</p>
                <p className="text-2xl font-black text-textDark">{user?.bestStreak || 0} Gün</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[24px] border border-border flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-lightAmber rounded-full flex items-center justify-center text-accent">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-textMuted font-bold text-sm">Mevcut Seri</p>
                <p className="text-2xl font-black text-textDark">{user?.currentStreak || 0} Gün</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[24px] border border-border shadow-sm flex flex-col items-center justify-center min-h-[300px]">
            {data.length === 0 ? (
              <>
                <BarChartIcon className="w-16 h-16 text-gray-200 mb-4" />
                <h3 className="font-bold text-textDark">Henüz Veri Yok</h3>
                <p className="text-textMuted text-sm mt-1">Odaklanmaya başladığında grafiklerin burada görünecek.</p>
              </>
            ) : (
              <div className="w-full h-64 flex items-end justify-between gap-2 px-4">
                {data.map((d, idx) => {
                  const maxMinutes = Math.max(...data.map(item => item.focusMinutes), 1); // min 1 to avoid division by zero
                  const heightPercentage = (d.focusMinutes / maxMinutes) * 100;
                  const dateObj = new Date(d.date);
                  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
                  
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 group">
                      <div className="relative w-full flex justify-center h-full items-end pb-2">
                        <div 
                          className="w-full max-w-[40px] bg-primary rounded-t-lg transition-all group-hover:bg-accent" 
                          style={{ height: `${Math.max(heightPercentage, 2)}%` }}
                        ></div>
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-textDark text-white text-xs py-1 px-2 rounded font-bold whitespace-nowrap z-10">
                          {d.focusMinutes} dk
                        </div>
                      </div>
                      <span className="text-xs font-bold text-textMuted mt-2">
                        {days[dateObj.getDay()]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
