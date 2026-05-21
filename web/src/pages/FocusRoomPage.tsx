import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  FileImage,
  FileText,
  Headphones,
  Pause,
  Play,
  Send,
  ShieldCheck,
  Swords,
  TimerReset,
  UsersRound,
  Volume2,
} from 'lucide-react';
import { Avatar, IconTile, PageHeader, Pill, Surface } from '../components/ui';
import { api, assetUrl } from '../lib/api';
import { getApiErrorMessage, unwrapData } from '../lib/apiResponses';
import { getSocket } from '../lib/socket';
import type { DuelRequest, DuelResult, Lobby, Message, RoomUser } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import fireSound from '../assets/sounds/fire.mp3';
import librarySound from '../assets/sounds/library.mp3';
import natureSound from '../assets/sounds/nature.mp3';
import rainSound from '../assets/sounds/rain.mp3';

const durationOptions = [
  { label: '15 dk', seconds: 15 * 60 },
  { label: '25 dk', seconds: 25 * 60 },
  { label: '45 dk', seconds: 45 * 60 },
  { label: '60 dk', seconds: 60 * 60 },
];

const soundTracks = [
  { key: 'library', name: 'Kütüphane', src: librarySound, defaultVolume: 65 },
  { key: 'rain', name: 'Yağmur', src: rainSound, defaultVolume: 35 },
  { key: 'nature', name: 'Doğa', src: natureSound, defaultVolume: 20 },
  { key: 'fire', name: 'Ateş', src: fireSound, defaultVolume: 0 },
];

type VolumeMap = Record<string, number>;

export default function FocusRoomPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [volumes, setVolumes] = useState<VolumeMap>(() =>
    Object.fromEntries(soundTracks.map((track) => [track.key, track.defaultVolume])),
  );
  const [chatText, setChatText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDuel, setPendingDuel] = useState<DuelRequest | null>(null);
  const [activeDuel, setActiveDuel] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadLobbies() {
      try {
        const response = await api.get<Lobby[]>('/lobbies');
        if (!ignore) setLobbies(unwrapData<Lobby[]>(response.data));
      } catch {
        if (!ignore) setLobbies([]);
      }
    }
    void loadLobbies();
    return () => {
      ignore = true;
    };
  }, []);

  const lobby = useMemo(() => lobbies.find((item) => String(item.id) === String(roomId)), [lobbies, roomId]);

  useEffect(() => {
    let ignore = false;
    async function loadMessages() {
      if (!lobby?.name) return;
      try {
        const response = await api.get<Message[]>(`/messages/${encodeURIComponent(lobby.name)}`);
        if (!ignore) setMessages(unwrapData<Message[]>(response.data));
      } catch {
        if (!ignore) setMessages([]);
      }
    }
    void loadMessages();
    return () => {
      ignore = true;
    };
  }, [lobby?.name]);

  useEffect(() => {
    if (!lobby?.name || !user) return;

    const socket = getSocket();
    const roomName = lobby.name;

    const handleRoomUsers = (users: RoomUser[]) => setRoomUsers(users);
    const handleReceiveMessage = (message: Message) => {
      setMessages((current) => {
        const normalized = normalizeSocketMessage(message, roomName);
        const exists = current.some((item) => messageIdentity(item) === messageIdentity(normalized));
        return exists ? current : [...current, normalized];
      });
    };
    const handleNudge = (payload: { senderName: string; message?: string }) => {
      setNotice(payload.message ?? `${payload.senderName} seni çalışmaya davet ediyor.`);
    };
    const handleDuelReceived = (payload: DuelRequest) => setPendingDuel(payload);
    const handleDuelStarted = (payload: { opponentName?: string; betAmount: number }) => {
      setPendingDuel(null);
      setActiveDuel(`${payload.opponentName ?? 'Rakip'} ile ${payload.betAmount} puanlık düello başladı.`);
      void refreshUser();
    };
    const handleDuelEnded = (payload: DuelResult) => {
      setActiveDuel(null);
      setNotice(payload.winner ? `Düelloyu kazandın. ${payload.betAmount * 2} puan kasana eklendi.` : `Düelloyu kaybettin. ${payload.opponentName ?? 'Rakibin'} kazandı.`);
      void refreshUser();
    };
    const handleSocketError = (payload: { message?: string }) => {
      setError(payload.message ?? 'Socket işlemi tamamlanamadı.');
    };
    const handleJoinError = (payload: { message?: string }) => {
      setError(payload.message ?? 'Odaya katılım reddedildi.');
    };

    socket.emit('join_lobby', { roomName, maxUsers: lobby.maxUsers });
    socket.on('room_users', handleRoomUsers);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('nudge_received', handleNudge);
    socket.on('duel_received', handleDuelReceived);
    socket.on('duel_started', handleDuelStarted);
    socket.on('duel_ended', handleDuelEnded);
    socket.on('error', handleSocketError);
    socket.on('join_lobby_error', handleJoinError);

    return () => {
      socket.emit('update_presence', { isAtDesk: false, roomName });
      socket.off('room_users', handleRoomUsers);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('nudge_received', handleNudge);
      socket.off('duel_received', handleDuelReceived);
      socket.off('duel_started', handleDuelStarted);
      socket.off('duel_ended', handleDuelEnded);
      socket.off('error', handleSocketError);
      socket.off('join_lobby_error', handleJoinError);
      pauseAmbient();
    };
  }, [lobby?.maxUsers, lobby?.name, refreshUser, user]);

  useEffect(() => {
    soundTracks.forEach((track) => {
      const audio = audioRefs.current[track.key];
      if (!audio) return;
      audio.loop = true;
      audio.volume = Math.max(0, Math.min(1, (volumes[track.key] ?? 0) / 100));
    });
  }, [volumes]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          if (lobby?.name) {
            getSocket().emit('update_presence', { isAtDesk: false, roomName: lobby.name });
          }
          setRunning(false);
          pauseAmbient();
          setNotice('Pomodoro tamamlandı.');
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lobby?.name, running]);

  const focusedUsers = roomUsers.filter((roomUser) => roomUser.isAtDesk);

  const startFocus = () => {
    if (!lobby?.name) return;
    setError(null);
    if (remainingSeconds <= 0) {
      setRemainingSeconds(selectedDuration);
    }
    playAmbient();
    setRunning(true);
    getSocket().emit('update_presence', { isAtDesk: true, roomName: lobby.name });
  };

  const stopFocus = () => {
    if (!lobby?.name) return;
    setRunning(false);
    pauseAmbient();
    getSocket().emit('update_presence', { isAtDesk: false, roomName: lobby.name });
  };

  const selectDuration = (seconds: number) => {
    setSelectedDuration(seconds);
    setRemainingSeconds(seconds);
    if (running && lobby?.name) {
      setRunning(false);
      pauseAmbient();
      getSocket().emit('update_presence', { isAtDesk: false, roomName: lobby.name });
    }
  };

  const playAmbient = () => {
    soundTracks.forEach((track) => {
      const audio = audioRefs.current[track.key];
      if (!audio || (volumes[track.key] ?? 0) <= 0) return;
      audio.play().catch(() => {
        setError('Tarayıcı sesi başlatamadı. Bir kez daha Başlat düğmesine basmayı dene.');
      });
    });
  };

  const pauseAmbient = () => {
    Object.values(audioRefs.current).forEach((audio) => audio?.pause());
  };

  const handleSend = () => {
    if (!chatText.trim() || !lobby?.name) return;
    getSocket().emit('send_message', { roomName: lobby.name, text: chatText.trim(), type: 'text' });
    setChatText('');
  };

  const uploadFile = async (file: File, type: 'file' | 'image') => {
    if (!lobby?.name) return;
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomName', lobby.name);

    try {
      const response = await api.post<Message>('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const savedMessage = unwrapData<Message>(response.data);
      setMessages((current) => (current.some((item) => messageIdentity(item) === messageIdentity(savedMessage)) ? current : [...current, savedMessage]));
      getSocket().emit('send_message', {
        roomName: lobby.name,
        text: savedMessage.text,
        type: savedMessage.type ?? type,
        fileUrl: savedMessage.fileUrl,
      });
      setNotice(type === 'image' ? 'Fotoğraf odaya eklendi.' : 'Dosya odaya eklendi.');
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError));
    } finally {
      if (type === 'image' && imageInputRef.current) imageInputRef.current.value = '';
      if (type === 'file' && fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const nudgeUser = (targetUserId: number) => {
    if (!lobby?.name) return;
    getSocket().emit('nudge_friend', { targetUserId, roomName: lobby.name });
    setNotice('Çalışma daveti gönderildi.');
  };

  const challengeUser = (targetUserId: number) => {
    if (!lobby?.name) return;
    getSocket().emit('challenge_duel', { targetUserId, roomName: lobby.name, betAmount: 10 });
  };

  const acceptDuel = () => {
    if (!pendingDuel) return;
    getSocket().emit('accept_duel', { duelId: pendingDuel.duelId });
  };

  return (
    <div>
      <PageHeader
        eyebrow={lobby?.isPremiumOnly ? 'Elite oda' : 'Odak odası'}
        title={lobby?.name ?? 'Çalışma Odası'}
        description={lobby?.description ?? 'Oda bilgileri backend üzerinden yükleniyor.'}
        action={
          <button onClick={() => navigate('/app/lobbies')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-base font-black text-textDark">
            <ArrowLeft className="h-4 w-4" />
            Lobiler
          </button>
        }
      />

      {error ? <Surface className="mb-4 p-4 text-base font-bold text-danger">{error}</Surface> : null}
      {notice ? <Surface className="mb-4 p-4 text-base font-bold text-primary">{notice}</Surface> : null}
      {pendingDuel ? (
        <Surface className="mb-4 flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <p className="text-base font-bold text-textDark">
            {pendingDuel.challengerName} seni {pendingDuel.betAmount} puanlık düelloya çağırdı.
          </p>
          <button onClick={acceptDuel} className="rounded-xl bg-danger px-4 py-2 text-base font-black text-white">
            Kabul Et
          </button>
        </Surface>
      ) : null}
      {activeDuel ? <Surface className="mb-4 p-4 text-base font-bold text-danger">{activeDuel}</Surface> : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <Surface className={`p-5 ${running ? 'border-success bg-softSuccess' : ''}`}>
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <IconTile icon={ShieldCheck} tone={running ? 'success' : 'primary'} />
                <div>
                  <h2 className="text-xl font-black text-textDark">{running ? 'Odak modu aktif' : 'Odak beklemede'}</h2>
                  <p className="text-base font-semibold text-textMuted">
                    Başlatınca pomodoro sayacı, oda presence durumu ve odak sesleri birlikte çalışır.
                  </p>
                </div>
              </div>
              <button
                onClick={running ? stopFocus : startFocus}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-black text-white ${
                  running ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-secondary'
                }`}
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? 'Durdur' : 'Başlat'}
              </button>
            </div>
          </Surface>

          <Surface className="p-7">
            <div className="flex flex-col items-center text-center">
              <Pill tone="primary">
                <TimerReset className="h-3 w-3" />
                Pomodoro
              </Pill>
              <div className="mt-7 grid h-64 w-64 place-items-center rounded-full border-8 border-primary bg-background shadow-sm">
                <span className="font-mono text-6xl font-black text-textDark">{formatDuration(remainingSeconds)}</span>
              </div>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                {durationOptions.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => selectDuration(item.seconds)}
                    className={`rounded-xl border px-4 py-2 text-base font-black ${
                      selectedDuration === item.seconds ? 'border-primary bg-softIndigo text-primary' : 'border-border bg-white text-textMuted hover:bg-softIndigo hover:text-primary'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </Surface>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Surface className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconTile icon={Headphones} tone="accent" />
                  <h2 className="text-lg font-black text-textDark">Ses Mikseri</h2>
                </div>
                <Pill tone="accent">{user?.equippedSoundPack ?? 'classic'}</Pill>
              </div>
              <div className="space-y-4">
                {soundTracks.map((sound) => (
                  <div key={sound.key}>
                    <audio ref={(element) => { audioRefs.current[sound.key] = element; }} src={sound.src} preload="auto" loop />
                    <div className="mb-2 flex justify-between text-base font-bold">
                      <span className="flex items-center gap-2 text-textDark">
                        <Volume2 className="h-4 w-4 text-primary" />
                        {sound.name}
                      </span>
                      <span className="text-textMuted">{volumes[sound.key] ?? 0}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volumes[sound.key] ?? 0}
                      onChange={(event) => setVolumes((current) => ({ ...current, [sound.key]: Number(event.target.value) }))}
                      className="h-2 w-full accent-primary"
                    />
                  </div>
                ))}
              </div>
            </Surface>

            <Surface className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <IconTile icon={UsersRound} tone="success" />
                <h2 className="text-lg font-black text-textDark">Oda özeti</h2>
              </div>
              <div className="space-y-3">
                <Info label="Odakta" value={`${focusedUsers.length} kişi`} />
                <Info label="Odada" value={`${roomUsers.length} kişi`} />
                <Info label="Kapasite" value={`${lobby?.maxUsers ?? 50} kişi`} />
              </div>
            </Surface>
          </div>

          <Surface className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <IconTile icon={UsersRound} tone="primary" />
              <h2 className="text-lg font-black text-textDark">Odadakiler</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {roomUsers.map((roomUser) => (
                <div key={roomUser.userId} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={roomUser.fullName}
                      image={roomUser.avatarUrl}
                      frame={roomUser.equippedProfileFrame ?? undefined}
                      size="sm"
                      premium={roomUser.isPremium}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-textDark">{roomUser.fullName}</p>
                      <p className="text-base font-bold text-textMuted">{roomUser.isAtDesk ? 'Odakta' : 'Beklemede'}</p>
                    </div>
                  </div>
                  {roomUser.userId !== user?.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => nudgeUser(roomUser.userId)} className="grid h-9 w-9 place-items-center rounded-xl bg-lightAmber text-accent" title="Dürt">
                        <Bell className="h-4 w-4" />
                      </button>
                      <button onClick={() => challengeUser(roomUser.userId)} className="grid h-9 w-9 place-items-center rounded-xl bg-softDanger text-danger" title="Düello">
                        <Swords className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {roomUsers.length === 0 ? <p className="text-base font-bold text-textMuted">Socket bağlantısı bekleniyor.</p> : null}
            </div>
          </Surface>
        </div>

        <Surface className="flex min-h-[640px] flex-col overflow-hidden">
          <div className="border-b border-border p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-textDark">Oda Sohbeti</h2>
              <Pill tone="success">{messages.length} mesaj</Pill>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background text-base font-black text-textMuted"
              >
                <FileImage className="h-4 w-4" />
                Fotoğraf Ekle
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background text-base font-black text-textMuted"
              >
                <FileText className="h-4 w-4" />
                Dosya Ekle
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0], 'image')} />
              <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0], 'file')} />
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-background p-4">
            {messages.map((message, index) => {
              const senderId = message.user?.id ?? message.userId;
              const mine = senderId === user?.id;
              const fileHref = assetUrl(message.fileUrl);
              const imageMessage = isImageMessage(message);
              return (
                <div key={message.id ?? `${message.text}-${index}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${mine ? 'bg-primary text-white' : 'border border-border bg-white text-textDark'}`}>
                    {!mine ? <p className="mb-1 text-base font-black text-accent">{message.user?.fullName ?? message.fullName ?? 'Öğrenci'}</p> : null}
                    {fileHref && imageMessage ? (
                      <a href={fileHref} target="_blank" rel="noreferrer" className="block">
                        <img src={fileHref} alt={message.text} className="mb-2 max-h-64 rounded-xl object-cover" />
                      </a>
                    ) : null}
                    {fileHref && !imageMessage ? (
                      <a href={fileHref} target="_blank" rel="noreferrer" className="mb-2 block font-black underline">
                        {message.text}
                      </a>
                    ) : null}
                    {!fileHref ? <p className="text-base font-semibold leading-6">{message.text}</p> : null}
                    <p className={`mt-1 text-base font-bold ${mine ? 'text-white/70' : 'text-textMuted'}`}>{formatTime(message.createdAt ?? message.timestamp)}</p>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 ? <p className="rounded-xl bg-white p-4 text-base font-bold text-textMuted">Bu odada henüz mesaj yok.</p> : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
            className="border-t border-border bg-white p-4"
          >
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => nudgeNearestUser(roomUsers, user?.id, nudgeUser)} className="grid h-11 w-11 place-items-center rounded-xl bg-lightAmber text-accent">
                <Bell className="h-4 w-4" />
              </button>
              <input
                value={chatText}
                onChange={(event) => setChatText(event.target.value)}
                placeholder="Mesaj yaz..."
                className="min-h-11 flex-1 rounded-xl border border-border bg-background px-4 text-base font-semibold outline-none focus:border-primary"
              />
              <button disabled={!chatText.trim()} className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white disabled:cursor-not-allowed disabled:opacity-60">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </Surface>
      </div>
    </div>
  );
}

function normalizeSocketMessage(message: Message, roomName: string): Message {
  return {
    ...message,
    id: message.id ?? Date.now(),
    roomName,
    createdAt: message.createdAt ?? message.timestamp ?? new Date().toISOString(),
    user: message.user ?? (message.userId ? { id: message.userId, fullName: message.fullName ?? 'Öğrenci', email: '', username: '' } : undefined),
  };
}

function messageIdentity(message: Message) {
  if (message.id) return `id:${message.id}`;
  if (message.fileUrl) return `file:${message.fileUrl}`;
  return `${message.user?.id ?? message.userId ?? 'anon'}:${message.text}:${message.createdAt ?? message.timestamp ?? ''}`;
}

function isImageMessage(message: Message) {
  if (message.type === 'image') return true;
  return /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(message.fileUrl ?? '');
}

function nudgeNearestUser(roomUsers: RoomUser[], currentUserId: number | undefined, nudgeUser: (targetUserId: number) => void) {
  const target = roomUsers.find((roomUser) => roomUser.userId !== currentUserId);
  if (target) nudgeUser(target.userId);
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-base font-black text-textDark">{value}</p>
      <p className="text-base font-bold text-textMuted">{label}</p>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatTime(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
