import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle, Clock, Play, Pause, Settings, Focus, AlertCircle, MessageSquare, Send, Volume2, Shield, Bell } from 'lucide-react';
import { getSocket, disconnectSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';

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
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [roomUsers, setRoomUsers] = useState<any[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Audio Mixer States
  const [volumes, setVolumes] = useState({ rain: 0, library: 0, fire: 0 });
  const audioRefs = {
    rain: useRef<HTMLAudioElement | null>(null),
    library: useRef<HTMLAudioElement | null>(null),
    fire: useRef<HTMLAudioElement | null>(null),
  };

  const timerRef = useRef<number | null>(null);

  // Initialize Socket
  useEffect(() => {
    const socket = getSocket();
    
    socket.emit('join_lobby', { roomName: roomId, fullName: user?.fullName || 'Anonim' });

    socket.on('room_users', (users) => setRoomUsers(users));
    socket.on('receive_message', (msg) => setMessages((prev) => [...prev, msg]));
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
      isPremium: user?.isPremium 
    });
    setInputText('');
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
      </div>

      {/* Chat Sidebar */}
      <AnimatePresence>
        {(isChatOpen || window.innerWidth > 768) && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="w-80 bg-white border border-border rounded-[24px] shadow-sm flex flex-col overflow-hidden hidden md:flex"
          >
            <div className="p-4 border-b border-border bg-gray-50">
              <h3 className="font-bold text-textDark flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Oda Sohbeti
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.fullName === user?.fullName ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] font-bold text-textMuted mb-1 ml-1">{msg.fullName}</span>
                  <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                    msg.fullName === user?.fullName ? 'bg-primary text-white rounded-br-sm' : 'bg-gray-100 text-textDark rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="p-3 border-t border-border bg-white flex gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Mesaj yaz..."
                className="flex-1 bg-gray-50 border border-border rounded-xl px-4 outline-none focus:border-primary transition-colors text-sm"
              />
              <button type="submit" className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-secondary">
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
