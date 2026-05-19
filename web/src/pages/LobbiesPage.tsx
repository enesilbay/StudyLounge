import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Crown, ChevronRight, Lock } from 'lucide-react';

const mockRooms = [
  { id: '1', name: 'Sabahçılar', category: 'Sessiz Oda', isElite: false, activeUsers: 12, maxUsers: 20 },
  { id: '2', name: 'YKS 2026', category: 'Sohbetli Oda', isElite: false, activeUsers: 45, maxUsers: 50 },
  { id: '3', name: 'Tıpçılar', category: 'Derin Odak', isElite: true, activeUsers: 5, maxUsers: 10 },
  { id: '4', name: 'Yazılımcılar', category: 'Pomodoro', isElite: false, activeUsers: 28, maxUsers: 30 },
];

export default function LobbiesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'classic' | 'elite'>('classic');

  const filteredRooms = mockRooms.filter((r) => r.isElite === (activeTab === 'elite'));

  const joinRoom = (roomId: string) => {
    navigate(`/app/focus/${roomId}`);
  };

  return (
    <div className="pb-20 md:pb-0">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-textDark mb-2">Çalışma Odaları</h1>
        <p className="text-textMuted font-medium">Sana uygun bir oda seç ve hemen odaklanmaya başla.</p>
      </header>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-border mb-8 max-w-sm">
        <button
          onClick={() => setActiveTab('classic')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'classic' ? 'bg-softIndigo text-primary shadow-sm' : 'text-textMuted hover:text-textDark'
          }`}
        >
          Klasik Odalar
        </button>
        <button
          onClick={() => setActiveTab('elite')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'elite' ? 'bg-lightAmber text-accent shadow-sm' : 'text-textMuted hover:text-textDark'
          }`}
        >
          <Crown className="w-4 h-4" />
          Elite Odalar
        </button>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredRooms.map((room, idx) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-6 rounded-[24px] border flex flex-col justify-between hover:shadow-md transition-all cursor-pointer bg-white ${
              room.isElite ? 'border-accent' : 'border-border'
            }`}
            onClick={() => joinRoom(room.id)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${
                  room.isElite ? 'bg-lightAmber text-accent' : 'bg-gray-100 text-textMuted'
                }`}>
                  {room.category}
                </span>
                <h3 className="text-xl font-black text-textDark">{room.name}</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-softSuccess text-success px-3 py-1.5 rounded-xl text-sm font-bold">
                <Users className="w-4 h-4" />
                {room.activeUsers}/{room.maxUsers}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <span className="text-sm font-bold text-textMuted flex items-center gap-2">
                {room.isElite ? <><Crown className="w-4 h-4 text-accent"/> x2 Puan Çarpanı</> : 'Standart Puan'}
              </span>
              <button className="w-10 h-10 rounded-full bg-softIndigo text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5 ml-0.5" />
              </button>
            </div>
          </motion.div>
        ))}

        {filteredRooms.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-textMuted" />
            </div>
            <h3 className="text-lg font-bold text-textDark mb-1">Oda Bulunamadı</h3>
            <p className="text-textMuted text-sm">Şu anda bu kategoride aktif bir oda yok.</p>
          </div>
        )}
      </div>
    </div>
  );
}
