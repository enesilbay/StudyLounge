import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle, Clock, Play, Pause, Settings, Focus, AlertCircle, MessageSquare, Send, Volume2, Paperclip, FileText, Download } from 'lucide-react';
import { getSocket, disconnectSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { api, assetUrl } from '../lib/api';
import AvatarWithFrame from '../components/UI/AvatarWithFrame';

interface ChatMessage {
  id: number;
  text: string;
  user?: {
    id: number;
    fullName: string;
    avatarUrl?: string;
    activeProfileFrame?: string;
    isPremium?: boolean;
  };
  fileUrl?: string;
  fileName?: string;
  type?: string;
  createdAt: string;
  // Socket'ten gelen ham veri:
  fullName?: string;
  senderName?: string;
  isPremium?: boolean;
}

export default function FocusRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Core Focus States
  const [isFocused, setIsFocused] = useState(false);
  const [pomodoroSec, setPomodoroSec] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [warning, setWarning] = useState('');

  // Socket & Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio Mixer States
  const [volumes, setVolumes] = useState({ rain: 0, library: 0, fire: 0 });
  const audioRefs = {
    rain: useRef<HTMLAudioElement | null>(null),
    library: useRef<HTMLAudioElement | null>(null),
    fire: useRef<HTMLAudioElement | null>(null),
  };

  const timerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages, isChatOpen]);

  // Fetch chat history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/messages/${roomId}`);
        setMessages(res.data);
      } catch (err) {
        console.error('Mesaj gecmisi alinamadi', err);
      }
    };
    fetchHistory();
  }, [roomId]);

  // Initialize Socket
  useEffect(() => {
    const socket = getSocket();
    
    socket.emit('join_lobby', { roomName: roomId, fullName: user?.fullName || 'Anonim' });

    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on('nudge_received', (data) => alert(`${data.senderName} seni dürtüyor!`));
    socket.on('duel_received', (data) => {
      if (window.confirm(`${data.challengerName} sana ${data.betAmount} puanlık düello teklif etti! Kabul ediyor musun?`)) {
        socket.emit('accept_duel', { duelId: data.duelId });
      }
    });

    return () => {
      disconnectSocket();
    };
  }, [roomId, user]);

  // Tab change detection (Sensor logic)
  useEffect(() => {
    const socket = getSocket();

    const handleVisibilityChange = () => {
      if (document.hidden && isFocused) {
        setIsFocused(false);
        setIsRunning(false);
        setWarning('Başka bir sekmeye geçtiğin için odaklanman bozuldu!');
        socket.emit('update_presence', { isAtDesk: false, roomName: roomId });
      }
    };

    const handleBlur = () => {
      if (isFocused) {
        setIsFocused(false);
        setIsRunning(false);
        setWarning('Pencere odağını kaybettiğin için odaklanman bozuldu!');
        socket.emit('update_presence', { isAtDesk: false, roomName: roomId });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isFocused, roomId]);

  // Pomodoro logic
  useEffect(() => {
    if (isRunning && isFocused) {
      timerRef.current = window.setInterval(() => {
        setPomodoroSec((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsFocused(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isFocused]);

  // Audio Sync
  useEffect(() => {
    const shouldPlay = isFocused && isRunning;
    Object.entries(volumes).forEach(([key, vol]) => {
      const audio = audioRefs[key as keyof typeof audioRefs].current;
      if (audio) {
        audio.volume = vol;
        if (shouldPlay && vol > 0) {
          audio.play().catch(() => {});
        } else {
          audio.pause();
        }
      }
    });
  }, [isFocused, isRunning, volumes]);

  const toggleFocus = () => {
    const socket = getSocket();
    if (!isFocused) {
      setWarning('');
      setIsFocused(true);
      setIsRunning(true);
      socket.emit('update_presence', { isAtDesk: true, roomName: roomId });
    } else {
      setIsFocused(false);
      setIsRunning(false);
      socket.emit('update_presence', { isAtDesk: false, roomName: roomId });
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    getSocket().emit('send_message', { 
      fullName: user?.fullName, 
      roomName: roomId, 
      text: inputText,
      isPremium: user?.isPremium,
      user: user // socket payload
    });
    setInputText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB altında olmalıdır.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomName', roomId || '');

    try {
      setIsUploading(true);
      await api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // The backend creates the message and probably broadcasts it, or we may need to reload
      // But typically backend's message service should broadcast the new message. Wait, let's assume it broadcasts.
      // If not, we can trigger a refetch, but let's rely on socket for now.
    } catch (error) {
      console.error(error);
      alert('Dosya yüklenirken hata oluştu.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 overflow-hidden pb-10">
      
      {/* Hidden Audio Elements */}
      <audio ref={audioRefs.rain} loop src="https://cdn.freesound.org/previews/531/531947_10915663-lq.mp3" />
      <audio ref={audioRefs.library} loop src="https://cdn.freesound.org/previews/415/415516_5121236-lq.mp3" />
      <audio ref={audioRefs.fire} loop src="https://cdn.freesound.org/previews/411/411088_5121236-lq.mp3" />

      {/* Main Focus Area */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto overflow-y-auto pr-2 pb-20">
        <header className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate('/app/lobbies')}
            className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-textDark" />
          </button>
          <div className="text-center">
            <span className="text-xs font-bold text-accent bg-lightAmber px-2 py-1 rounded-md">ODAK ODASI</span>
            <h1 className="text-xl font-black text-textDark mt-1">{roomId}</h1>
          </div>
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-10 h-10 rounded-full bg-softIndigo border border-primary/20 flex items-center justify-center text-primary relative md:hidden"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-danger rounded-full" />
          </button>
        </header>

        {warning && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-softDanger border border-danger text-danger p-4 rounded-xl mb-6 flex items-center gap-3 font-bold shadow-sm"
          >
            <AlertCircle className="w-5 h-5" />
            {warning}
          </motion.div>
        )}

        <div className={`p-6 rounded-[24px] border-2 transition-all duration-300 flex items-center gap-5 mb-8 ${
          isFocused ? 'bg-softSuccess border-success' : 'bg-white border-border shadow-sm'
        }`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isFocused ? 'bg-success text-white' : 'bg-gray-100 text-textMuted'
          }`}>
            {isFocused ? <CheckCircle className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
          </div>
          <div>
            <h2 className={`text-xl font-black ${isFocused ? 'text-success' : 'text-textDark'}`}>
              {isFocused ? 'Odaklanıyor' : 'Bekleniyor...'}
            </h2>
            <p className={isFocused ? 'text-success/80 font-medium' : 'text-textMuted'}>
              {isFocused ? 'Sekmeyi değiştirme!' : 'Odaklanmayı başlatmak için tıkla.'}
            </p>
          </div>
        </div>

        <button
          onClick={toggleFocus}
          className={`w-full py-5 rounded-2xl font-bold text-lg text-white shadow-lg transition-all flex items-center justify-center gap-3 mb-8 ${
            isFocused ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-secondary'
          }`}
        >
          <Focus className="w-6 h-6" />
          {isFocused ? 'Odaklanmayı Durdur' : 'Odaklanmayı Başlat'}
        </button>

        <div className="bg-white rounded-[24px] p-8 border border-border shadow-sm flex flex-col items-center flex-1 justify-center mb-8">
          <h3 className="text-textMuted font-bold text-sm tracking-widest mb-8">POMODORO SAYACI</h3>
          <div className={`w-64 h-64 rounded-full border-8 flex items-center justify-center mb-8 transition-colors ${
            isRunning ? 'border-primary shadow-[0_0_40px_rgba(26,35,126,0.2)]' : 'border-gray-100'
          }`}>
            <span className="text-6xl font-black text-textDark font-mono tracking-tighter">
              {pad(Math.floor(pomodoroSec / 60))}:{pad(pomodoroSec % 60)}
            </span>
          </div>
          <div className="flex gap-4">
            <button className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 text-textMuted">
              <Settings className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setIsRunning(!isRunning)}
              disabled={!isFocused}
              className={`w-20 h-14 rounded-2xl flex items-center justify-center transition-colors text-white ${
                !isFocused ? 'bg-gray-200 cursor-not-allowed' : isRunning ? 'bg-gray-300' : 'bg-primary'
              }`}
            >
              {isRunning ? <Pause className="w-6 h-6 text-textDark" /> : <Play className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Audio Mixer */}
        <div className="bg-white p-6 rounded-[24px] border border-border shadow-sm">
          <h3 className="font-bold text-textDark mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" /> Ses Mikseri
          </h3>
          <div className="space-y-4">
            {Object.keys(volumes).map((key) => (
               <div key={key} className="flex items-center gap-4">
                 <span className="w-20 text-sm font-bold text-textMuted capitalize">{key}</span>
                 <input 
                   type="range" 
                   min="0" max="1" step="0.1" 
                   value={volumes[key as keyof typeof volumes]}
                   onChange={(e) => setVolumes(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                   className="flex-1 accent-primary"
                 />
               </div>
            ))}
          </div>
        </div>

        {/* Room Participants */}
        <div className="bg-white p-6 rounded-[24px] border border-border shadow-sm mb-8">
          <h3 className="font-bold text-textDark mb-4">Odaktakiler</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[...new Set(messages.map(m => m.user?.id || m.fullName).filter(Boolean))].map((identifier, idx) => {
              const userMsg = messages.find(m => m.user?.id === identifier || m.fullName === identifier);
              const name = userMsg?.user?.fullName || userMsg?.fullName || 'Anonim';
              const avatar = userMsg?.user?.avatarUrl ? assetUrl(userMsg.user.avatarUrl) : null;
              const frame = userMsg?.user?.activeProfileFrame;
              
              return (
                <div key={idx} className="flex flex-col items-center flex-shrink-0 w-20 cursor-pointer hover:opacity-80 transition-opacity">
                  <AvatarWithFrame size={56} uri={avatar} name={name} frameId={frame} />
                  <span className="text-xs font-bold text-textDark mt-2 truncate w-full text-center">{name}</span>
                  <span className="text-[10px] text-textMuted flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-success" /> Masa Başında
                  </span>
                </div>
              );
            })}
            {messages.length === 0 && (
              <div className="text-sm text-textMuted w-full text-center py-4">
                Henüz kimse yok.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <AnimatePresence>
        {(isChatOpen || window.innerWidth > 768) && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="w-96 bg-white border border-border rounded-[24px] shadow-sm flex flex-col overflow-hidden hidden md:flex"
          >
            <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-textDark flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Oda Sohbeti
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {messages.map((msg, i) => {
                const isMe = msg.user?.id === user?.id || msg.fullName === user?.fullName;
                const senderName = msg.user?.fullName || msg.fullName || msg.senderName || 'Anonim';
                const senderAvatar = msg.user?.avatarUrl ? assetUrl(msg.user.avatarUrl) : null;
                const senderFrame = msg.user?.activeProfileFrame;
                
                return (
                  <div key={i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <AvatarWithFrame 
                      size={36} 
                      uri={senderAvatar} 
                      name={senderName} 
                      frameId={senderFrame} 
                    />
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      <span className="text-[10px] font-bold text-textMuted mb-1 mx-1">{senderName}</span>
                      
                      {msg.type === 'image' && msg.fileUrl && (
                        <a href={assetUrl(msg.fileUrl) || '#'} target="_blank" rel="noreferrer" className="block mb-1">
                          <img src={assetUrl(msg.fileUrl) || ''} alt="Attachment" className="max-w-full rounded-xl border border-border object-cover max-h-40" />
                        </a>
                      )}
                      
                      {msg.type === 'file' && msg.fileUrl && (
                        <a href={assetUrl(msg.fileUrl) || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-100 p-3 rounded-xl border border-border mb-1 hover:bg-gray-200 transition">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-sm font-bold text-textDark flex-1 truncate">{msg.fileName || 'Dosya'}</span>
                          <Download className="w-4 h-4 text-textMuted" />
                        </a>
                      )}

                      {msg.text && (
                        <div className={`px-4 py-2.5 rounded-2xl ${
                          isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-gray-100 text-textDark rounded-tl-sm'
                        }`}>
                          <p className="text-sm">{msg.text}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 border-t border-border bg-white flex items-center gap-2">
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*,.pdf,.doc,.docx"
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-10 h-10 flex-shrink-0 bg-gray-50 text-textMuted rounded-xl flex items-center justify-center hover:bg-gray-100 border border-border transition-colors"
                title="Dosya veya Resim Yükle"
              >
                {isUploading ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Mesaj yaz..."
                className="flex-1 bg-gray-50 border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors text-sm"
              />
              <button type="submit" disabled={!inputText.trim() && !isUploading} className="w-10 h-10 flex-shrink-0 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-secondary disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
