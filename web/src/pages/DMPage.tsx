import React, { useState } from 'react';
import { Send, Search, User } from 'lucide-react';

export default function DMPage() {
  const [activeChat, setActiveChat] = useState<number | null>(null);

  const friends = [
    { id: 1, name: 'Ayşe K.', lastMessage: 'Yarın kütüphaneye gidelim mi?', time: '10:42' },
    { id: 2, name: 'Mehmet', lastMessage: 'Harika odaklandık bugün.', time: 'Dün' },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 overflow-hidden pb-10">
      <div className={`w-80 bg-white border border-border rounded-[24px] shadow-sm flex flex-col overflow-hidden ${activeChat ? 'hidden md:flex' : 'flex flex-1 md:flex-none'}`}>
        <div className="p-4 border-b border-border bg-gray-50">
          <h3 className="font-bold text-textDark text-lg">Mesajlar</h3>
          <div className="mt-4 relative">
            <Search className="w-4 h-4 text-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Arkadaş ara..." className="w-full bg-white border border-border rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary transition-colors" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {friends.map((friend) => (
            <button 
              key={friend.id}
              onClick={() => setActiveChat(friend.id)}
              className={`w-full flex items-center gap-4 p-4 border-b border-border transition-colors hover:bg-gray-50 text-left ${activeChat === friend.id ? 'bg-softIndigo' : ''}`}
            >
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-textMuted" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-textDark truncate">{friend.name}</h4>
                  <span className="text-xs text-textMuted flex-shrink-0">{friend.time}</span>
                </div>
                <p className="text-sm text-textMuted truncate">{friend.lastMessage}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`flex-1 bg-white border border-border rounded-[24px] shadow-sm flex flex-col overflow-hidden ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-softIndigo rounded-full flex items-center justify-center mb-4">
              <Send className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-textDark mb-2">Mesajlaşmaya Başla</h3>
            <p className="text-textMuted">Sol taraftan bir arkadaşını seçerek sohbet edebilirsin.</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border bg-gray-50 flex items-center gap-4">
              <button className="md:hidden" onClick={() => setActiveChat(null)}>Geri</button>
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-textMuted" />
              </div>
              <h3 className="font-bold text-textDark text-lg">{friends.find(f => f.id === activeChat)?.name}</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-background">
              {/* Chat messages would go here */}
            </div>
            <div className="p-3 border-t border-border bg-white flex gap-2">
              <input type="text" placeholder="Mesaj yaz..." className="flex-1 bg-gray-50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors text-sm" />
              <button className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-secondary">
                <Send className="w-5 h-5 ml-1" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
