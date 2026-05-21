import { useState, useEffect, useRef } from 'react';
import { Send, Search } from 'lucide-react';
import { api, assetUrl } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import AvatarWithFrame from '../components/UI/AvatarWithFrame';

interface Friend {
  id: number;
  fullName: string;
  avatarUrl?: string;
  equippedProfileFrame?: string;
}

interface DirectMessage {
  id: number;
  senderId: number;
  receiverId: number;
  text: string;
  createdAt: string;
}

export default function DMPage() {
  const { user } = useAuthStore();
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await api.get('/users/friends/me');
        setFriends(res.data);
      } catch (err) {
        console.error('Arkadaş listesi alınamadı', err);
      }
    };
    fetchFriends();
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/dm/${activeChat}`);
        setMessages(res.data);
      } catch (err) {
        console.error('Mesajlar alınamadı', err);
      }
    };
    fetchMessages();
  }, [activeChat]);

  useEffect(() => {
    const socket = getSocket();
    
    const handleReceiveDm = (msg: DirectMessage) => {
      if (
        (activeChat && msg.senderId === activeChat && msg.receiverId === user?.id) ||
        (activeChat && msg.senderId === user?.id && msg.receiverId === activeChat)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('receive_dm', handleReceiveDm);
    
    return () => {
      socket.off('receive_dm', handleReceiveDm);
    };
  }, [activeChat, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !activeChat) return;
    
    const socket = getSocket();
    socket.emit('send_dm', { targetUserId: activeChat, text: newMessage });
    setNewMessage('');
  };

  const activeFriend = friends.find(f => f.id === activeChat);

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
          {friends.length === 0 ? (
            <p className="text-center text-textMuted p-4 text-sm">Henüz arkadaşın yok.</p>
          ) : (
            friends.map((friend) => (
              <button 
                key={friend.id}
                onClick={() => setActiveChat(friend.id)}
                className={`w-full flex items-center gap-4 p-4 border-b border-border transition-colors hover:bg-gray-50 text-left ${activeChat === friend.id ? 'bg-softIndigo' : ''}`}
              >
                <AvatarWithFrame 
                  size={48} 
                  uri={friend.avatarUrl ? assetUrl(friend.avatarUrl) : null} 
                  name={friend.fullName} 
                  frameId={friend.equippedProfileFrame} 
                />
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-textDark truncate">{friend.fullName}</h4>
                  </div>
                </div>
              </button>
            ))
          )}
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
              <button className="md:hidden text-primary font-bold" onClick={() => setActiveChat(null)}>Geri</button>
              <AvatarWithFrame 
                size={40} 
                uri={activeFriend?.avatarUrl ? assetUrl(activeFriend.avatarUrl) : null} 
                name={activeFriend?.fullName || ''} 
                frameId={activeFriend?.equippedProfileFrame} 
              />
              <h3 className="font-bold text-textDark text-lg">{activeFriend?.fullName}</h3>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto bg-background flex flex-col gap-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                      isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-white border border-border text-textDark rounded-tl-sm shadow-sm'
                    }`}>
                      <p className="text-sm break-words">{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-textMuted mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-3 border-t border-border bg-white flex gap-2">
              <input 
                type="text" 
                placeholder="Mesaj yaz..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-gray-50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors text-sm" 
              />
              <button 
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
