import React from 'react';
import { Trophy, Medal, Star } from 'lucide-react';

export default function LeaderboardPage() {
  const users = [
    { name: 'Ahmet Y.', score: 3200, rank: 1 },
    { name: 'Ayşe K.', score: 2850, rank: 2 },
    { name: 'Enes', score: 1450, rank: 3 },
    { name: 'Mehmet', score: 900, rank: 4 },
  ];

  return (
    <div className="pb-20 md:pb-0">
      <header className="mb-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-lightAmber rounded-full flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-3xl font-black text-textDark mb-2">Liderlik Tablosu</h1>
        <p className="text-textMuted font-medium">Bu haftanın en çok odaklanan öğrencileri.</p>
      </header>

      <div className="bg-white rounded-[24px] border border-border shadow-sm overflow-hidden">
        {users.map((user, idx) => (
          <div key={idx} className={`flex items-center justify-between p-4 px-6 border-b border-border last:border-0 ${user.rank === 3 ? 'bg-softIndigo/30' : ''}`}>
            <div className="flex items-center gap-4">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                user.rank === 1 ? 'bg-accent text-white' : 
                user.rank === 2 ? 'bg-gray-300 text-white' :
                user.rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-textMuted'
              }`}>
                {user.rank}
              </span>
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <span className="font-bold text-textDark text-lg">{user.name}</span>
            </div>
            <div className="font-black text-primary">
              {user.score} <span className="text-xs text-textMuted font-medium">PUAN</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
