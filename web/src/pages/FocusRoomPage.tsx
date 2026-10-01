import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Coffee,
  Crown,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  Paperclip,
  ImagePlus,
  Send,
  Video,
} from 'lucide-react';
import { Button, LampMark, Notice } from '../components/ui';
import { DeskTile, type DeskPerson } from '../components/room/DeskTile';
import { AudioSink, VideoView } from '../components/room/MediaViews';
import { api, assetUrl } from '../lib/api';
import { getApiErrorMessage, unwrapData } from '../lib/apiResponses';
import { getSocket } from '../lib/socket';
import { useRoomCall } from '../lib/rtc/useRoomCall';
import type { DuelRequest, DuelResult, Lobby, Message, RoomUser } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import fireSound from '../assets/sounds/fire.mp3';
import librarySound from '../assets/sounds/library.mp3';
import natureSound from '../assets/sounds/nature.mp3';
import rainSound from '../assets/sounds/rain.mp3';

const durationOptions = [15, 25, 45, 60].map((minutes) => ({ label: `${minutes} dk`, seconds: minutes * 60 }));

const soundTracks = [
  { key: 'forest', name: 'Orman', src: natureSound, defaultVolume: 65 },
  { key: 'fire', name: 'Şömine', src: fireSound, defaultVolume: 35 },
  { key: 'rain', name: 'Yağmur', src: rainSound, defaultVolume: 20 },
  { key: 'library', name: 'Kütüphane', src: librarySound, defaultVolume: 0 },
  { key: 'deepfocus', name: 'Derin odak', src: natureSound, defaultVolume: 0 },
];

// Web'de sensör yok: sekme bu süreden uzun gizli kalırsa odak duraklatılır.
const HIDDEN_TAB_GRACE_MS = 60_000;

type VolumeMap = Record<string, number>;
type SideTab = 'chat' | 'sound';

export default function FocusRoomPage() {
  const { roomId } = useParams();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [lobbiesLoaded, setLobbiesLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [volumes, setVolumes] = useState<VolumeMap>(() => Object.fromEntries(soundTracks.map((track) => [track.key, track.defaultVolume])));
  const [chatText, setChatText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDuel, setPendingDuel] = useState<DuelRequest | null>(null);
  const [activeDuel, setActiveDuel] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<SideTab>('chat');
  const [pinnedSharer, setPinnedSharer] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .get<Lobby[]>('/lobbies')
      .then((response) => !ignore && setLobbies(unwrapData<Lobby[]>(response.data)))
      .catch(() => !ignore && setLobbies([]))
      .finally(() => !ignore && setLobbiesLoaded(true));
    return () => {
      ignore = true;
    };
  }, []);

  const lobby = useMemo(() => lobbies.find((item) => String(item.id) === String(roomId)), [lobbies, roomId]);
  const roomName = lobby?.name ?? null;
  const videoRoom = Boolean(lobby?.allowVideo);
  const joinedLobby = Boolean(user && roomUsers.some((roomUser) => roomUser.userId === user.id));

  const call = useRoomCall({ roomName, selfId: user?.id ?? null, enabled: videoRoom && joinedLobby });

  useEffect(() => {
    let ignore = false;
    if (!roomName) return;
    api
      .get<Message[]>(`/messages/${encodeURIComponent(roomName)}`)
      .then((response) => !ignore && setMessages(unwrapData<Message[]>(response.data)))
      .catch(() => !ignore && setMessages([]));
    return () => {
      ignore = true;
    };
  }, [roomName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sideTab]);

  const pauseAmbient = useCallback(() => {
    Object.values(audioRefs.current).forEach((audio) => audio?.pause());
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!roomName || !userId) return;

    const socket = getSocket();

    const handleRoomUsers = (users: RoomUser[]) => setRoomUsers(users);
    const handleReceiveMessage = (message: Message) => {
      if (message.roomName && message.roomName !== roomName) return;
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
      setActiveDuel(`${payload.opponentName ?? 'Rakibinle'} ${payload.betAmount} puanlık düello başladı. Odaktan ilk çıkan kaybeder.`);
      void refreshUser();
    };
    const handleDuelEnded = (payload: DuelResult) => {
      setActiveDuel(null);
      setNotice(payload.winner ? `Düelloyu kazandın, ${payload.betAmount * 2} puan hesabına eklendi.` : `Düelloyu ${payload.opponentName ?? 'rakibin'} kazandı.`);
      void refreshUser();
    };
    const handleSocketError = (payload: { message?: string }) => setError(payload.message ?? 'İşlem tamamlanamadı.');
    const handleJoinError = (payload: { message?: string }) => setError(payload.message ?? 'Odaya katılamadın.');

    // Bağlantı koparsa masa listesi boşaltılır (arama da kapanır); geri gelince odaya yeniden katılınır.
    const handleDisconnect = () => {
      setRoomUsers([]);
      setRunning(false);
      pauseAmbient();
    };
    const handleReconnect = () => socket.emit('join_lobby', { roomName, maxUsers: lobby?.maxUsers });

    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleReconnect);
    socket.on('room_users', handleRoomUsers);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('nudge_received', handleNudge);
    socket.on('duel_received', handleDuelReceived);
    socket.on('duel_started', handleDuelStarted);
    socket.on('duel_ended', handleDuelEnded);
    socket.on('error', handleSocketError);
    socket.on('join_lobby_error', handleJoinError);
    socket.emit('join_lobby', { roomName, maxUsers: lobby?.maxUsers });

    return () => {
      socket.emit('update_presence', { isAtDesk: false, roomName });
      socket.emit('leave_lobby');
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleReconnect);
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
  }, [lobby?.maxUsers, roomName, userId, refreshUser, pauseAmbient]);

  useEffect(() => {
    soundTracks.forEach((track) => {
      const audio = audioRefs.current[track.key];
      if (!audio) return;
      audio.loop = true;
      audio.volume = Math.max(0, Math.min(1, (volumes[track.key] ?? 0) / 100));
    });
  }, [volumes]);

  const playAmbient = () => {
    soundTracks.forEach((track) => {
      const audio = audioRefs.current[track.key];
      if (!audio || (volumes[track.key] ?? 0) <= 0) return;
      audio.play().catch(() => setError('Tarayıcı ortam sesini başlatamadı. Odaklanmayı durdurup tekrar başlat.'));
    });
  };

  const stopFocus = useCallback(
    (message?: string) => {
      if (!roomName) return;
      setRunning(false);
      pauseAmbient();
      getSocket().emit('update_presence', { isAtDesk: false, roomName });
      if (message) setNotice(message);
    },
    [pauseAmbient, roomName],
  );

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (running && remainingSeconds === 0) stopFocus('Seans tamamlandı. Kısa bir mola ver.');
  }, [remainingSeconds, running, stopFocus]);

  // Sekme uzun süre gizli kalırsa odak duraklatılır (web için sensör yerine).
  useEffect(() => {
    if (!running) return;
    let timeout: number | undefined;
    const onVisibility = () => {
      window.clearTimeout(timeout);
      if (document.hidden) {
        timeout = window.setTimeout(() => stopFocus('Sekmeden bir dakikadan uzun ayrıldığın için odak duraklatıldı.'), HIDDEN_TAB_GRACE_MS);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [running, stopFocus]);

  const startFocus = () => {
    if (!roomName) return;
    setError(null);
    if (remainingSeconds <= 0) setRemainingSeconds(selectedDuration);
    playAmbient();
    setRunning(true);
    getSocket().emit('update_presence', { isAtDesk: true, roomName });
  };

  const selectDuration = (seconds: number) => {
    setSelectedDuration(seconds);
    setRemainingSeconds(seconds);
    if (running) stopFocus();
  };

  const handleSend = () => {
    if (!chatText.trim() || !roomName) return;
    getSocket().emit('send_message', { roomName, text: chatText.trim(), type: 'text' });
    setChatText('');
  };

  const uploadFile = async (file: File, type: 'file' | 'image') => {
    if (!roomName) return;
    setError(null);
    const formData = new FormData();
    formData.append('roomName', roomName);
    formData.append('file', file);

    try {
      const response = await api.post<Message>('/messages/upload', formData);
      const savedMessage = unwrapData<Message>(response.data);
      setMessages((current) => (current.some((item) => messageIdentity(item) === messageIdentity(savedMessage)) ? current : [...current, savedMessage]));
      getSocket().emit('send_message', { roomName, text: savedMessage.text, type: savedMessage.type ?? type, fileUrl: savedMessage.fileUrl });
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError));
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const nudgeUser = (targetUserId: number, name: string) => {
    if (!roomName) return;
    getSocket().emit('nudge_friend', { targetUserId, roomName });
    setNotice(`${name} kişisine çalışma daveti gönderildi.`);
  };

  const challengeUser = (targetUserId: number, name: string) => {
    if (!roomName) return;
    getSocket().emit('challenge_duel', { targetUserId, roomName, betAmount: 10 });
    setNotice(`${name} kişisine 10 puanlık düello daveti gönderildi.`);
  };

  const acceptDuel = () => {
    if (!pendingDuel) return;
    getSocket().emit('accept_duel', { duelId: pendingDuel.duelId });
  };

  /* ── Masa listesi: önce sen, sonra odaklananlar ── */
  // Uzak medya her değiştiğinde useRoomCall yeniden render tetikler; bu listeler her render'da hesaplanır.
  const people: DeskPerson[] = (() => {
    const list: DeskPerson[] = [];
    if (user) {
      list.push({
        userId: user.id,
        name: user.fullName,
        avatarUrl: assetUrl(user.avatarUrl),
        frame: user.equippedProfileFrame,
        isPremium: user.isPremium,
        isAtDesk: running,
        isSelf: true,
        inCall: call.joined,
        micOn: call.media.mic,
        sharing: call.media.screen,
        cameraStream: call.cameraStream,
      });
    }
    roomUsers
      .filter((roomUser) => roomUser.userId !== user?.id)
      .sort((a, b) => Number(b.isAtDesk) - Number(a.isAtDesk))
      .forEach((roomUser) => {
        const remote = call.remote(roomUser.userId);
        list.push({
          userId: roomUser.userId,
          name: roomUser.fullName,
          avatarUrl: assetUrl(roomUser.avatarUrl),
          frame: roomUser.equippedProfileFrame,
          isPremium: roomUser.isPremium,
          isAtDesk: roomUser.isAtDesk,
          isSelf: false,
          inCall: Boolean(roomUser.isInCall),
          micOn: Boolean(roomUser.isMicOn),
          sharing: Boolean(roomUser.isScreenSharing),
          cameraStream: roomUser.isCameraOn || roomUser.isMicOn ? remote?.camera ?? null : null,
        });
      });
    return list;
  })();

  const sharers = (() => {
    const list: Array<{ userId: number; name: string; stream: MediaStream }> = [];
    if (call.media.screen && call.screenStream && user) list.push({ userId: user.id, name: 'Senin ekranın', stream: call.screenStream });
    roomUsers.forEach((roomUser) => {
      if (roomUser.userId === user?.id || !roomUser.isScreenSharing) return;
      const screen = call.remote(roomUser.userId)?.screen;
      if (screen) list.push({ userId: roomUser.userId, name: `${roomUser.fullName} ekranı`, stream: screen });
    });
    return list;
  })();

  const stage = sharers.find((sharer) => sharer.userId === pinnedSharer) ?? sharers[0] ?? null;
  const focusedCount = people.filter((person) => person.isAtDesk).length;

  if (lobbiesLoaded && !lobby) {
    return (
      <div className="py-16 text-center">
        <LampMark lit={false} className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-3xl">Bu oda artık yok</h1>
        <p className="mt-2 text-textMuted">Odalar 24 saat sonra kapanır. Başka bir odaya katılabilir ya da yenisini kurabilirsin.</p>
        <Link to="/app/lobbies" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-onPrimary">
          Odalara dön
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col">
      {/* Başlık */}
      <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Link to="/app/lobbies" className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-textMuted hover:text-textDark">
            <ArrowLeft className="h-4 w-4" />
            Odalar
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="truncate text-3xl md:text-4xl">{lobby?.name ?? 'Oda yükleniyor'}</h1>
            {lobby?.isPremiumOnly ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-lightAmber px-2 py-0.5 text-sm font-semibold text-accentDark">
                <Crown className="h-3.5 w-3.5" /> Elite, süre 2 kat sayılır
              </span>
            ) : null}
            {videoRoom ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-softIndigo px-2 py-0.5 text-sm font-semibold text-primary">
                <Video className="h-3.5 w-3.5" /> Kameralı oda
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[15px] text-textMuted">
            {people.length} kişi masada, {focusedCount === 0 ? 'şu an kimse odaklanmıyor' : `${focusedCount} kişinin lambası yanıyor`}
          </p>
        </div>

        <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 md:w-auto md:justify-start">
          <div>
            <p className="font-mono text-4xl font-semibold tabular-nums leading-none text-textDark" aria-live="off">
              {formatDuration(remainingSeconds)}
            </p>
            <div className="mt-2 flex gap-1" role="group" aria-label="Seans süresi">
              {durationOptions.map((item) => (
                <button
                  key={item.seconds}
                  type="button"
                  onClick={() => selectDuration(item.seconds)}
                  aria-pressed={selectedDuration === item.seconds}
                  className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold transition ${
                    selectedDuration === item.seconds ? 'bg-lightAmber text-accentDark' : 'text-textMuted hover:text-textDark'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <Button variant={running ? 'secondary' : 'lamp'} size="lg" icon={running ? Coffee : undefined} onClick={() => (running ? stopFocus() : startFocus())} disabled={!roomName} className="shrink-0">
            {running ? 'Mola ver' : (
              <>
                <LampMark className="h-5 w-5" />
                Odaklan
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Bildirimler */}
      <div className="mb-4 space-y-2 empty:hidden">
        {error ? <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice> : null}
        {call.error ? <Notice tone="danger" onDismiss={call.clearError}>{call.error}</Notice> : null}
        {notice ? <Notice tone="info" onDismiss={() => setNotice(null)}>{notice}</Notice> : null}
        {activeDuel ? <Notice tone="accent">{activeDuel}</Notice> : null}
        {pendingDuel ? (
          <Notice tone="accent" onDismiss={() => setPendingDuel(null)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{pendingDuel.challengerName} seni {pendingDuel.betAmount} puanlık düelloya çağırıyor.</span>
              <Button size="sm" variant="lamp" onClick={acceptDuel}>Kabul et</Button>
            </div>
          </Notice>
        ) : null}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Masalar + sahne */}
        <section aria-label="Masalar" className="flex min-w-0 flex-col gap-4">
          {stage ? (
            <div className="flex flex-col gap-3">
              <div className="relative overflow-hidden rounded-xl border border-border bg-black">
                <div className="aspect-video">
                  <VideoView stream={stage.stream} fit="contain" label={stage.name} />
                </div>
                <p className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-sm font-semibold text-white">{stage.name}</p>
              </div>
              {sharers.length > 1 ? (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Paylaşılan ekranlar">
                  {sharers.map((sharer) => (
                    <button
                      key={sharer.userId}
                      type="button"
                      onClick={() => setPinnedSharer(sharer.userId)}
                      aria-pressed={stage.userId === sharer.userId}
                      className={`rounded-md border px-2.5 py-1 text-sm font-semibold ${stage.userId === sharer.userId ? 'border-accent text-textDark' : 'border-border text-textMuted'}`}
                    >
                      {sharer.name}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-3 overflow-x-auto pb-1">
                {people.map((person) => (
                  <DeskTile key={person.userId} person={person} videoRoom compact />
                ))}
              </div>
            </div>
          ) : (
            <div className={`grid gap-3 ${videoRoom ? 'grid-cols-2 2xl:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 2xl:grid-cols-4'}`}>
              {people.map((person) => (
                <DeskTile
                  key={person.userId}
                  person={person}
                  videoRoom={videoRoom}
                  onNudge={() => nudgeUser(person.userId, person.name)}
                  onDuel={() => challengeUser(person.userId, person.name)}
                />
              ))}
              {people.length <= 1 ? (
                <div className="grid min-h-[148px] place-items-center rounded-xl border border-dashed border-border p-4 text-center text-[15px] text-textMuted">
                  Diğer masalar boş. Bir arkadaşını Arkadaşlar sayfasından davet edebilirsin.
                </div>
              ) : null}
            </div>
          )}

          {/* Uzak sesler */}
          {people.filter((person) => !person.isSelf).map((person) => (
            <AudioSink key={person.userId} stream={person.micOn ? person.cameraStream : null} />
          ))}

          {/* Medya kontrolleri */}
          {videoRoom ? (
            <div className="sticky bottom-20 z-10 mt-auto flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-surface/95 p-2 backdrop-blur lg:bottom-4">
              <MediaButton on={call.media.mic} onLabel="Mikrofonu kapat" offLabel="Mikrofonu aç" OnIcon={Mic} OffIcon={MicOff} onClick={call.toggleMic} disabled={!call.joined || call.busy} />
              <MediaButton on={call.media.camera} onLabel="Kamerayı kapat" offLabel="Kamerayı aç" OnIcon={Camera} OffIcon={CameraOff} onClick={call.toggleCamera} disabled={!call.joined || call.busy} />
              <MediaButton on={call.media.screen} onLabel="Paylaşımı durdur" offLabel="Ekranını paylaş" OnIcon={MonitorX} OffIcon={MonitorUp} onClick={call.toggleScreen} disabled={!call.joined || call.busy} invert />
              <p className="w-full text-center text-xs text-textMuted sm:ml-2 sm:w-auto sm:text-left">
                {call.joined ? 'Kamera ve mikrofon sen açana kadar kapalı kalır.' : 'Görüntülü bağlantı hazırlanıyor…'}
              </p>
            </div>
          ) : null}
        </section>

        {/* Yan panel */}
        <aside className="sl-panel flex h-[560px] flex-col overflow-hidden xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
          <div className="flex border-b border-border" role="tablist" aria-label="Oda paneli">
            {(
              [
                ['chat', `Sohbet${messages.length ? ` (${messages.length})` : ''}`],
                ['sound', 'Ortam sesi'],
              ] as Array<[SideTab, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={sideTab === key}
                onClick={() => setSideTab(key)}
                className={`flex-1 border-b-2 px-4 py-3 text-[15px] font-semibold transition ${sideTab === key ? 'border-accent text-textDark' : 'border-transparent text-textMuted hover:text-textDark'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={`flex min-h-0 flex-1 flex-col ${sideTab === 'chat' ? '' : 'hidden'}`}>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message, index) => {
                const senderId = message.user?.id ?? message.userId;
                const mine = senderId === user?.id;
                const fileHref = assetUrl(message.fileUrl);
                const imageMessage = isImageMessage(message);
                return (
                  <div key={message.id ?? `${message.text}-${index}`} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    {!mine ? <p className="mb-0.5 px-1 text-xs font-semibold text-accentDark">{message.user?.fullName ?? message.fullName ?? 'Öğrenci'}</p> : null}
                    <div className={`max-w-[88%] rounded-xl px-3 py-2 ${mine ? 'rounded-br-sm bg-primary text-onPrimary' : 'rounded-bl-sm bg-sunken text-textDark'}`}>
                      {fileHref && imageMessage ? (
                        <a href={fileHref} target="_blank" rel="noreferrer" className="block">
                          <img src={fileHref} alt={message.text} className="mb-1 max-h-56 rounded-lg object-cover" />
                        </a>
                      ) : null}
                      {fileHref && !imageMessage ? (
                        <a href={fileHref} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-semibold underline underline-offset-2">
                          <Paperclip className="h-4 w-4 shrink-0" />
                          {message.text}
                        </a>
                      ) : null}
                      {!fileHref ? <p className="whitespace-pre-wrap break-words text-[15px] leading-6">{message.text}</p> : null}
                    </div>
                    <p className="mt-0.5 px-1 text-[11px] text-textMuted">{formatTime(message.createdAt ?? message.timestamp)}</p>
                  </div>
                );
              })}
              {messages.length === 0 ? <p className="pt-8 text-center text-[15px] text-textMuted">Sohbet sessiz. Bir merhaba yaz ya da çalıştığın notu paylaş.</p> : null}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1 border-t border-border p-2"
            >
              <button type="button" onClick={() => imageInputRef.current?.click()} title="Fotoğraf ekle" aria-label="Fotoğraf ekle" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-textMuted hover:bg-sunken hover:text-textDark">
                <ImagePlus className="h-[18px] w-[18px]" />
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} title="Dosya ekle" aria-label="Dosya ekle" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-textMuted hover:bg-sunken hover:text-textDark">
                <Paperclip className="h-[18px] w-[18px]" />
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0], 'image')} />
              <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0], 'file')} />
              <input
                value={chatText}
                onChange={(event) => setChatText(event.target.value)}
                placeholder="Mesaj yaz"
                aria-label="Mesaj"
                className="min-h-10 min-w-0 flex-1 rounded-lg bg-sunken px-3 text-[15px] outline-none focus:ring-1 focus:ring-accent"
              />
              <button disabled={!chatText.trim()} aria-label="Gönder" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-onPrimary disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className={`flex-1 space-y-5 overflow-y-auto p-5 ${sideTab === 'sound' ? '' : 'hidden'}`}>
            <p className="text-[15px] text-textMuted">Sesler odaklanmaya başladığında çalar, molada susar.</p>
            {soundTracks.map((sound) => (
              <div key={sound.key}>
                <audio ref={(element) => { audioRefs.current[sound.key] = element; }} src={sound.src} preload="auto" loop />
                <div className="mb-1.5 flex justify-between text-[15px]">
                  <label htmlFor={`vol-${sound.key}`} className="font-semibold text-textDark">{sound.name}</label>
                  <span className="font-mono text-sm tabular-nums text-textMuted">{volumes[sound.key] ?? 0}</span>
                </div>
                <input
                  id={`vol-${sound.key}`}
                  type="range"
                  min={0}
                  max={100}
                  value={volumes[sound.key] ?? 0}
                  onChange={(event) => setVolumes((current) => ({ ...current, [sound.key]: Number(event.target.value) }))}
                  className="h-2 w-full"
                />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MediaButton({
  on,
  onLabel,
  offLabel,
  OnIcon,
  OffIcon,
  onClick,
  disabled,
  invert = false,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  OnIcon: typeof Mic;
  OffIcon: typeof Mic;
  onClick: () => void;
  disabled?: boolean;
  invert?: boolean;
}) {
  const Icon = on ? OnIcon : OffIcon;
  // Kamera/mikrofon: açıkken dolu yeşil. Ekran paylaşımı: açıkken lamba rengiyle vurgulanır.
  const style = on
    ? invert
      ? 'bg-accent text-background hover:brightness-110'
      : 'bg-primary text-onPrimary hover:bg-secondary'
    : invert
      ? 'border border-border bg-surface text-textDark hover:bg-sunken'
      : 'bg-sunken text-textMuted hover:text-textDark';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      title={on ? onLabel : offLabel}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3.5 text-[15px] font-semibold transition disabled:opacity-50 ${style}`}
    >
      <Icon className="h-[18px] w-[18px]" />
      <span className="hidden sm:inline">{on ? onLabel : offLabel}</span>
    </button>
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

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatTime(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
