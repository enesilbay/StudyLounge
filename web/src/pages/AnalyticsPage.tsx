import React from 'react';
import { BarChart, Activity, Clock, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="pb-20 md:pb-0">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-textDark mb-2">İstatistikler</h1>
          <p className="text-textMuted font-medium">Çalışma verimini ve geçmiş performansını incele.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-[24px] border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-softIndigo rounded-full flex items-center justify-center text-primary">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-textMuted font-bold text-sm">Haftalık Odak</p>
            <p className="text-2xl font-black text-textDark">18 Saat</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[24px] border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-softSuccess rounded-full flex items-center justify-center text-success">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-textMuted font-bold text-sm">Kesintisiz Rekor</p>
            <p className="text-2xl font-black text-textDark">120 Dk</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-lightAmber rounded-full flex items-center justify-center text-accent">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-textMuted font-bold text-sm">Verim Artışı</p>
            <p className="text-2xl font-black text-textDark">%15</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[24px] border border-border shadow-sm flex flex-col items-center justify-center min-h-[300px]">
        <BarChart className="w-16 h-16 text-gray-200 mb-4" />
        <h3 className="font-bold text-textDark">Grafik Yükleniyor...</h3>
        <p className="text-textMuted text-sm mt-1">Haftalık performans grafiğin hazırlanıyor.</p>
      </div>
    </div>
  );
}
