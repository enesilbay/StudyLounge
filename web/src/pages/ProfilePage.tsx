import React from 'react';
import { User, Award, Shield, Settings } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div>
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-textDark mb-2">Profilin</h1>
          <p className="text-textMuted font-medium">Gelişimini ve istatistiklerini buradan takip edebilirsin.</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-textMuted hover:bg-gray-50">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <div className="bg-white rounded-[24px] p-8 border border-border shadow-sm flex flex-col items-center mb-8">
        <div className="w-32 h-32 rounded-full bg-softIndigo border-4 border-primary p-2 mb-4 relative">
          <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-textMuted" />
          </div>
          <div className="absolute bottom-0 right-0 bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-white font-bold">
            12
          </div>
        </div>
        <h2 className="text-2xl font-black text-textDark mb-1">Enes</h2>
        <p className="text-textMuted font-medium flex items-center gap-2">
          <Award className="w-4 h-4 text-accent" /> Çırak Öğrenci
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[24px] border border-border shadow-sm">
          <h3 className="text-textMuted font-bold mb-2">Toplam Odak</h3>
          <p className="text-3xl font-black text-primary">120 sa</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-border shadow-sm">
          <h3 className="text-textMuted font-bold mb-2">Odak Puanı</h3>
          <p className="text-3xl font-black text-accent">1,450</p>
        </div>
      </div>
    </div>
  );
}
