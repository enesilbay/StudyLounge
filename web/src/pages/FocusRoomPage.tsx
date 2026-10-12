import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Camera,
  CameraOff,
  ChevronDown,
  Coffee,
  Crown,
  FileText,
  Flag,
  ImagePlus,
  ListChecks,
  Loader2,
  Lock,
  LogOut,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  MonitorX,
  Paperclip,
  Pause,
  PenLine,
  Play,
  Presentation,
  Send,
  Settings2,
  SlidersHorizontal,
  Square,
  Timer,
  Users,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import { Button, Notice } from '../components/ui';
import { LogoMark } from '../components/brand/Logo';
import { DeskTile, type DeskPerson } from '../components/room/DeskTile';
import { EmptySeat, TimerRing } from '../components/room/RoomScene';
import { LAMP_LIGHT, MIN_SEATS, SEAT_POSITIONS, TABLE_POSITION } from '../components/room/sceneLayout';
import { AudioSink, VideoView } from '../components/room/MediaViews';
import { api, assetUrl } from '../lib/api';
import { getApiErrorMessage, unwrapData } from '../lib/apiResponses';
import { getSocket } from '../lib/socket';
import { useRoomCall } from '../lib/rtc/useRoomCall';
import { useSpeaking } from '../lib/rtc/useSpeaking';
import { hasLiveVideo } from '../lib/rtc/media';
import { useRoomBoard } from '../lib/board/useRoomBoard';
import { isPdfUrl, MAX_PDF_BYTES } from '../lib/board/types';
import { playChime, useRoomTimer } from '../lib/roomTimer';
import type { DuelRequest, DuelResult, Lobby, Message, RoomUser } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import { useStudyStore } from '../store/studyStore';
import SubjectPicker from '../components/room/SubjectPicker';
import TasksPanel from '../components/room/TasksPanel';
import RoomSettingsModal from '../components/room/RoomSettingsModal';
import DeviceSettingsModal from '../components/room/DeviceSettingsModal';
import ReportDialog from '../components/social/ReportDialog';
import { ROOM_CATEGORIES } from '../lib/roomCategories';
import { useInboxStore } from '../store/inboxStore';
import fireSound from '../assets/sounds/fire.mp3';
import librarySound from '../assets/sounds/library.mp3';
import natureSound from '../assets/sounds/nature.mp3';
import rainSound from '../assets/sounds/rain.mp3';

// pdf.js büyük bir kütüphane; yalnızca odada tahta açıldığında yüklenir.
const PdfBoard = lazy(() => import('../components/room/PdfBoard').then((module) => ({ default: module.PdfBoard })));

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
type PanelKey = 'timer' | 'chat' | 'tasks' | 'sound';
type PanelState = Record<PanelKey, { open: boolean; collapsed: boolean }>;

/** Sağdaki paneller: hangisi açık, hangisi küçültülmüş. Tercih tarayıcıda hatırlanır. */
const PANELS_KEY = 'sl-oda-paneller';
const defaultPanels: PanelState = {
  timer: { open: true, collapsed: false },
  chat: { open: true, collapsed: false },
  tasks: { open: false, collapsed: false },
  sound: { open: false, collapsed: false },
};

function readPanels(): PanelState {
  try {
    const saved = JSON.parse(localStorage.getItem(PANELS_KEY) ?? 'null') as Partial<PanelState> | null;
    return saved ? { ...defaultPanels, ...saved } : defaultPanels;
  } catch {
    return defaultPanels;
  }
}

interface StageSource {
  key: string;
  label: string;
  kind: 'board' | 'screen' | 'camera';
  stream?: MediaStream;
  mirror?: boolean;
}

export default function FocusRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: number; fullName: string; messageId?: number; preview?: string } | null>(null);
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
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
  const [panels, setPanels] = useState<PanelState>(readPanels);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [stageFullscreen, setStageFullscreen] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);
  // Sahne kaynaklarının görünme sırası; en son başlayan paylaşım sahneye gelir.
  const [sourceOrder, setSourceOrder] = useState<string[]>([]);

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
  const isOwner = Boolean(lobby && user && lobby.ownerId === user.id);
  const updateLobby = (changes: Partial<Lobby>) =>
    setLobbies((current) => current.map((item) => (item.id === lobby?.id ? { ...item, ...changes } : item)));
  const joinedLobby = Boolean(user && roomUsers.some((roomUser) => roomUser.userId === user.id));

  const call = useRoomCall({ roomName, selfId: user?.id ?? null, enabled: videoRoom && joinedLobby });
  const board = useRoomBoard({ roomName, enabled: joinedLobby });
  const roomTimer = useRoomTimer({ roomName, enabled: joinedLobby });
  // Tahta açıkken ekran paylaşılmaz: tahta açılınca (kim açarsa açsın) kendi paylaşımın durur.
  const boardOpen = Boolean(board.board);
  const sharingScreen = call.media.screen;
  const toggleScreen = call.toggleScreen;
  useEffect(() => {
    if (boardOpen && sharingScreen) void toggleScreen();
  }, [boardOpen, sharingScreen, toggleScreen]);
  // Ortak sayaca katılan kişi odak aşamasında otomatik "odakta" sayılır.
  const [followShared, setFollowShared] = useState(false);
  // Katılım yalnızca sunucu sayacın bittiğini bildirince sona erer. Bağlantı kısa süre
  // koparsa sayaç bir an yok görünür; bu, kullanıcıyı ortak sayaçtan çıkarmamalı.
  const timerEnded = roomTimer.lastEvent && (roomTimer.lastEvent.action === 'stop' || !roomTimer.timer) ? roomTimer.lastEvent.at : null;
  const [handledTimerEnd, setHandledTimerEnd] = useState<number | null>(null);
  if (timerEnded !== handledTimerEnd) {
    setHandledTimerEnd(timerEnded);
    if (timerEnded) setFollowShared(false);
  }
  const sharedMode = followShared && Boolean(roomTimer.view);
  const sharedFocus = sharedMode && roomTimer.view?.phase === 'focus' && !roomTimer.view.paused;
  const focusing = sharedMode ? sharedFocus : running;

  // Odak oturumu seçili derse yazılır (oturum geçmişi ve analitik).
  const selectedSubjectId = useStudyStore((state) => state.selectedSubjectId);
  const deskPayload = useCallback(
    (isAtDesk: boolean) => (isAtDesk ? { isAtDesk, roomName, subjectId: selectedSubjectId, source: 'web' as const } : { isAtDesk, roomName }),
    [roomName, selectedSubjectId],
  );

  useEffect(() => {
    const onChange = () => setStageFullscreen(document.fullscreenElement === stageRef.current && stageRef.current !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

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
    // Yalnızca sohbet kutusu kayar; scrollIntoView tüm sayfayı kaydırıp tahtadaki çizimi bozuyordu.
    const list = messagesRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [messages, panels.chat.open, panels.chat.collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(PANELS_KEY, JSON.stringify(panels));
    } catch {
      // Depolama kapalıysa panel düzeni yalnızca bu oturumda kalır.
    }
  }, [panels]);

  const togglePanel = (key: PanelKey) => setPanels((current) => ({ ...current, [key]: { open: !current[key].open, collapsed: false } }));
  const collapsePanel = (key: PanelKey) => setPanels((current) => ({ ...current, [key]: { ...current[key], collapsed: !current[key].collapsed } }));
  const showPanel = (key: PanelKey) => setPanels((current) => ({ ...current, [key]: { open: true, collapsed: false } }));

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
    const handleDuelDeclined = () => setNotice('Düello davetin reddedildi.');
    const handleDuelExpired = () => setNotice('Düello davetin yanıtlanmadığı için düştü.');
    const handleSocketError = (payload: { message?: string }) => setError(payload.message ?? 'İşlem tamamlanamadı.');
    const handleJoinError = (payload: { message?: string }) => setError(payload.message ?? 'Odaya katılamadın.');
    // Oda sahibi çıkardıysa ya da odayı kapattıysa odalar sayfasına dönülür.
    const handleRemoved = (payload: { message?: string }) => {
      useInboxStore.getState().pushToast({ title: 'Odadan ayrıldın', body: payload.message ?? 'Oda kapandı.' });
      navigate('/app/lobbies', { replace: true });
    };
    const handleLobbyUpdated = (payload: { roomName?: string; isLocked?: boolean }) => {
      if (payload.roomName !== roomName) return;
      setLobbies((current) => current.map((item) => (item.name === roomName ? { ...item, isLocked: payload.isLocked } : item)));
    };
    const handleRoomNotice = (payload: { message?: string }) => payload.message && setNotice(payload.message);

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
    socket.on('duel_declined', handleDuelDeclined);
    socket.on('duel_expired', handleDuelExpired);
    socket.on('error', handleSocketError);
    socket.on('join_lobby_error', handleJoinError);
    socket.on('kicked', handleRemoved);
    socket.on('lobby_closed', handleRemoved);
    socket.on('lobby_updated', handleLobbyUpdated);
    socket.on('room_notice', handleRoomNotice);
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
      socket.off('duel_declined', handleDuelDeclined);
      socket.off('duel_expired', handleDuelExpired);
      socket.off('error', handleSocketError);
      socket.off('join_lobby_error', handleJoinError);
      socket.off('kicked', handleRemoved);
      socket.off('lobby_closed', handleRemoved);
      socket.off('lobby_updated', handleLobbyUpdated);
      socket.off('room_notice', handleRoomNotice);
      pauseAmbient();
    };
  }, [lobby?.maxUsers, roomName, userId, refreshUser, pauseAmbient, navigate]);

  useEffect(() => {
    soundTracks.forEach((track) => {
      const audio = audioRefs.current[track.key];
      if (!audio) return;
      audio.loop = true;
      audio.volume = Math.max(0, Math.min(1, (volumes[track.key] ?? 0) / 100));
    });
  }, [volumes]);

  const playAmbient = useCallback(() => {
    soundTracks.forEach((track) => {
      const audio = audioRefs.current[track.key];
      if (!audio || (volumes[track.key] ?? 0) <= 0) return;
      audio.play().catch(() => setError('Tarayıcı ortam sesini başlatamadı. Odaklanmayı durdurup tekrar başlat.'));
    });
  }, [volumes]);

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
    if (!running || sharedMode) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, sharedMode]);

  useEffect(() => {
    if (running && !sharedMode && remainingSeconds === 0) stopFocus('Seans tamamlandı. Kısa bir mola ver.');
  }, [remainingSeconds, running, sharedMode, stopFocus]);

  /* ── Ortak sayaç: masada olma bilgisini ve ortam sesini aşamaya göre eşitle ── */
  const sharedPresenceRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!roomName) return;
    if (!sharedMode) {
      // Sayaç başkası tarafından bitirildiyse ya da sayaçtan ayrıldıysan masadan kalkılır.
      if (sharedPresenceRef.current === true) {
        getSocket().emit('update_presence', { isAtDesk: false, roomName });
        pauseAmbient();
      }
      sharedPresenceRef.current = null;
      return;
    }
    if (sharedPresenceRef.current === sharedFocus) return;
    sharedPresenceRef.current = sharedFocus;
    getSocket().emit('update_presence', deskPayload(sharedFocus));
    if (sharedFocus) playAmbient();
    else pauseAmbient();
    // deskPayload bilerek bağımlılık değil: ders değişimi aşağıdaki effect'te ayrıca gönderilir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedMode, sharedFocus, roomName, playAmbient, pauseAmbient]);

  // Odaklanırken ders değişirse sunucu önceki oturumu kapatıp yenisini bu dersle başlatır.
  const lastSubjectRef = useRef(selectedSubjectId);
  useEffect(() => {
    if (lastSubjectRef.current === selectedSubjectId) return;
    lastSubjectRef.current = selectedSubjectId;
    if (focusing && roomName) getSocket().emit('update_presence', deskPayload(true));
  }, [selectedSubjectId, focusing, roomName, deskPayload]);

  // Aşama değişince (odak ↔ mola) katılanlara kısa bir zil çalar.
  const phaseKey = roomTimer.view && !roomTimer.view.paused ? `${roomTimer.view.round}:${roomTimer.view.phase}` : null;
  const lastPhaseKey = useRef<string | null>(null);
  useEffect(() => {
    const previous = lastPhaseKey.current;
    lastPhaseKey.current = phaseKey;
    if (!followShared || !previous || !phaseKey || previous === phaseKey) return;
    playChime(phaseKey.endsWith('break') ? 'break' : 'focus');
  }, [phaseKey, followShared]);

  const joinShared = () => {
    if (!roomName) return;
    setError(null);
    // Kişisel sayaç durur; bundan sonra odak/mola ortak sayaçtan gelir.
    setRunning(false);
    setFollowShared(true);
  };

  // Masadan kalkma ve ortam sesini durdurma yukarıdaki eşitleme effect'inde yapılır.
  const leaveShared = () => setFollowShared(false);

  const startShared = () => {
    roomTimer.start(Math.round(selectedDuration / 60));
    joinShared();
  };

  // Sekme uzun süre gizli kalırsa odak duraklatılır (web için sensör yerine).
  useEffect(() => {
    if (!focusing) return;
    let timeout: number | undefined;
    const onVisibility = () => {
      window.clearTimeout(timeout);
      if (document.hidden) {
        timeout = window.setTimeout(() => {
          const message = 'Sekmeden bir dakikadan uzun ayrıldığın için odak duraklatıldı.';
          if (sharedMode) {
            setFollowShared(false);
            pauseAmbient();
            if (roomName) getSocket().emit('update_presence', { isAtDesk: false, roomName });
            setNotice(`${message} Ortak sayaca yeniden katılabilirsin.`);
          } else {
            stopFocus(message);
          }
        }, HIDDEN_TAB_GRACE_MS);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [focusing, sharedMode, stopFocus, pauseAmbient, roomName]);

  const startFocus = () => {
    if (!roomName) return;
    setError(null);
    if (remainingSeconds <= 0) setRemainingSeconds(selectedDuration);
    playAmbient();
    setRunning(true);
    getSocket().emit('update_presence', deskPayload(true));
  };

  const selectDuration = (seconds: number) => {
    setSelectedDuration(seconds);
    setRemainingSeconds(seconds);
    if (running) stopFocus();
  };

  // Görev paneli: görevi odaya sohbet mesajı olarak paylaşır.
  const kickUser = (targetUserId: number) => getSocket().emit('kick_user', { targetUserId });

  const shareToRoom = (text: string) => {
    if (!roomName || !joinedLobby) return;
    getSocket().emit('send_message', { roomName, text, type: 'text' });
    showPanel('chat');
  };

  const handleSend = () => {
    if (!chatText.trim() || !roomName) return;
    getSocket().emit('send_message', { roomName, text: chatText.trim(), type: 'text' });
    setChatText('');
  };

  const uploadFile = async (file: File, type: 'file' | 'image'): Promise<Message | null> => {
    if (!roomName) return null;
    setError(null);
    const formData = new FormData();
    formData.append('roomName', roomName);
    formData.append('file', file);

    try {
      const response = await api.post<Message>('/messages/upload', formData);
      // Uç kaydedilen mesajı zarfsız döndürür; mesajdaki `user` alanı zarf sanılmasın.
      const body = response.data as Message | { data?: Message };
      const savedMessage = body && typeof body === 'object' && 'fileUrl' in body ? (body as Message) : unwrapData<Message>(body);
      setMessages((current) => (current.some((item) => messageIdentity(item) === messageIdentity(savedMessage)) ? current : [...current, savedMessage]));
      getSocket().emit('send_message', { roomName, text: savedMessage.text, type: savedMessage.type ?? type, fileUrl: savedMessage.fileUrl });
      return savedMessage;
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError));
      return null;
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // PDF önce sohbete dosya olarak yüklenir, sonra herkes için tahtada açılır.
  const openPdfFile = async (file: File) => {
    if (pdfInputRef.current) pdfInputRef.current.value = '';
    if (file.type !== 'application/pdf' && !/.pdf$/i.test(file.name)) {
      setError('Tahtada yalnızca PDF dosyaları açılabilir.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError('PDF en fazla 20 MB olabilir. Dosyayı küçültüp tekrar dene.');
      return;
    }
    setOpeningPdf(true);
    const saved = await uploadFile(file, 'file');
    setOpeningPdf(false);
    if (saved?.fileUrl) {
      board.open(saved.fileUrl, saved.text || file.name);
      setPinnedKey('board');
    }
  };

  // Kamerayı sahneye al; aynı karta tekrar tıklanınca sahneden indir.
  const toggleCameraPin = (personId: number) => {
    const key = `camera:${personId}`;
    setPinnedKey((current) => (current === key ? null : key));
  };

  const toggleStageFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => setError('Tarayıcı tam ekrana geçmeye izin vermedi.'));
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

  const declineDuel = () => {
    if (!pendingDuel) return;
    getSocket().emit('decline_duel', { duelId: pendingDuel.duelId });
    setPendingDuel(null);
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
        isAtDesk: focusing,
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
          quality: roomUser.isInCall ? remote?.quality ?? null : null,
        });
      });
    return list;
  })();

  // Konuşanı vurgula: mikrofonu açık herkesin ses seviyesi ölçülür.
  const speakingIds = useSpeaking(people.map((person) => ({ id: person.userId, stream: person.cameraStream, enabled: videoRoom && person.micOn })));

  /* ── Sahne: PDF tahtası, paylaşılan ekranlar ve büyütülen kamera ── */
  const autoSources: StageSource[] = [];
  if (board.board) autoSources.push({ key: 'board', label: board.board.fileName, kind: 'board' });
  if (call.media.screen && call.screenStream && user) autoSources.push({ key: `screen:${user.id}`, label: 'Senin ekranın', kind: 'screen', stream: call.screenStream });
  roomUsers.forEach((roomUser) => {
    if (roomUser.userId === user?.id || !roomUser.isScreenSharing) return;
    const screen = call.remote(roomUser.userId)?.screen;
    if (screen) autoSources.push({ key: `screen:${roomUser.userId}`, label: `${roomUser.fullName} ekranı`, kind: 'screen', stream: screen });
  });

  // Yeni başlayan paylaşım sahneye kendiliğinden gelir (Discord'daki gibi).
  const autoKeys = autoSources.map((source) => source.key);
  const nextOrder = [...sourceOrder.filter((key) => autoKeys.includes(key)), ...autoKeys.filter((key) => !sourceOrder.includes(key))];
  if (nextOrder.join('|') !== sourceOrder.join('|')) setSourceOrder(nextOrder);

  const pinnedCamera = pinnedKey?.startsWith('camera:') ? people.find((person) => `camera:${person.userId}` === pinnedKey) : undefined;
  const sources: StageSource[] =
    pinnedCamera && hasLiveVideo(pinnedCamera.cameraStream)
      ? [...autoSources, { key: pinnedKey!, label: pinnedCamera.isSelf ? 'Senin kameran' : `${pinnedCamera.name} kamerası`, kind: 'camera', stream: pinnedCamera.cameraStream!, mirror: pinnedCamera.isSelf }]
      : autoSources;
  const newest = autoSources.find((source) => source.key === nextOrder[nextOrder.length - 1]);
  const stage = sources.find((source) => source.key === pinnedKey) ?? newest ?? null;
  const stageCameraKey = stage?.kind === 'camera' ? stage.key : null;
  const focusedCount = people.filter((person) => person.isAtDesk).length;

  const leaveRoom = () => navigate('/app/lobbies');

  if (lobbiesLoaded && !lobby) {
    return (
      <div className="grid min-h-dvh place-items-center bg-mb-surface px-6 text-center">
        <div>
          <LogoMark className="mx-auto h-14 w-14 text-mb-body" beam={false} />
          <h1 className="mt-4 font-mb-display text-[1.75rem] font-light tracking-[-0.03em] text-mb-ink">Bu oda artık yok</h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-mb-body">Odalar 24 saat sonra kapanır. Başka bir odaya katılabilir ya da yenisini kurabilirsin.</p>
          <Link to="/app/lobbies" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-mb-action px-5 text-[15px] font-medium text-mb-on-action shadow-mb-press">
            Odalara dön
          </Link>
        </div>
      </div>
    );
  }

  const sharedView = roomTimer.view && roomTimer.timer ? roomTimer.view : null;
  const timerSeconds = sharedView ? sharedView.remainingSeconds : remainingSeconds;
  const timerLit = sharedView ? followShared && sharedView.phase === 'focus' && !sharedView.paused : running;
  const timerPhase = sharedView ? (sharedView.paused ? 'Duraklatıldı' : sharedView.phase === 'focus' ? 'Odak' : 'Mola') : running ? 'Odakta' : 'Hazır';
  // Ortak sayaç sahnenin ortasında; sağdaki rayda yalnızca sohbet, görevler ve ortam sesi var.
  const dockOpen = panels.chat.open || panels.tasks.open || panels.sound.open;
  const timerTotal = sharedView && roomTimer.timer ? (sharedView.phase === 'focus' ? roomTimer.timer.focusSeconds : roomTimer.timer.breakSeconds) : selectedDuration;
  const timerTitle = sharedView ? `Ortak sayaç · ${sharedView.round}. tur` : 'Sayaç';

  // Sayaç kontrolleri: ortak sayaç varsa duraklat/bitir/katıl, yoksa süre seçimi ve Odaklan.
  const timerControls = (
    <>
      {sharedView && roomTimer.timer ? (
        <>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-mb-body">
            <span className={`rounded-[6px] px-2 py-0.5 font-medium ${sharedView.paused ? 'bg-mb-surface text-mb-body' : sharedView.phase === 'focus' ? 'bg-lightAmber text-accentDark' : 'bg-mb-tint text-mb-action'}`}>{timerPhase}</span>
            {describeTimerEvent(roomTimer.lastEvent, roomTimer.timer.startedByName)}
          </p>
          <div className="mt-4 flex items-center gap-1.5">
            <IconButton label={sharedView.paused ? 'Ortak sayacı sürdür' : 'Ortak sayacı herkes için duraklat'} onClick={sharedView.paused ? roomTimer.resume : roomTimer.pause} icon={sharedView.paused ? Play : Pause} />
            <IconButton label="Ortak sayacı herkes için bitir" onClick={roomTimer.stop} icon={Square} />
            {followShared ? (
              <button type="button" onClick={leaveShared} className="ml-auto inline-flex min-h-10 items-center rounded-[12px] border border-mb-line bg-mb-card px-4 text-sm font-medium text-mb-ink transition hover:bg-mb-surface">
                Sayaçtan ayrıl
              </button>
            ) : (
              <button type="button" onClick={joinShared} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-[12px] bg-mb-action px-4 text-sm font-medium text-mb-on-action shadow-mb-press transition hover:bg-mb-action-2">
                <LogoMark className="h-4 w-4" />
                Katıl
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Seans süresi">
            {durationOptions.map((item) => (
              <button
                key={item.seconds}
                type="button"
                onClick={() => selectDuration(item.seconds)}
                aria-pressed={selectedDuration === item.seconds}
                className={`rounded-[8px] px-2.5 py-1 text-xs font-medium transition ${selectedDuration === item.seconds ? 'bg-mb-solid text-mb-on-solid' : 'bg-mb-surface text-mb-body hover:text-mb-ink'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => (running ? stopFocus() : startFocus())}
              disabled={!roomName}
              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[12px] text-[15px] font-medium transition disabled:opacity-50 ${
                running ? 'border border-mb-line bg-mb-card text-mb-ink hover:bg-mb-surface' : 'bg-mb-action text-mb-on-action shadow-mb-press hover:bg-mb-action-2'
              }`}
            >
              {running ? <Coffee className="h-4 w-4" /> : <LogoMark className="h-5 w-5" />}
              {running ? 'Mola ver' : 'Odaklan'}
            </button>
            <button
              type="button"
              onClick={startShared}
              disabled={!joinedLobby}
              title="Bu süreyle odadaki herkes için ortak sayaç başlat"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[12px] border border-mb-line bg-mb-card px-3 text-sm font-medium text-mb-ink transition hover:bg-mb-surface disabled:opacity-50"
            >
              <Users className="h-4 w-4" />
              Odayla
            </button>
          </div>
        </>
      )}
      <SubjectPicker onError={setError} />
    </>
  );

  // Tahta ya da ekran açıkken sahnenin üstündeki ince sayaç şeridinin tek eylemi.
  const timerMainAction = sharedView ? (
    followShared ? (
      <button type="button" onClick={leaveShared} className="inline-flex min-h-9 items-center rounded-[10px] border border-mb-line bg-mb-card px-3 text-sm font-medium text-mb-ink transition hover:bg-mb-surface">
        Sayaçtan ayrıl
      </button>
    ) : (
      <button type="button" onClick={joinShared} className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] bg-mb-action px-3 text-sm font-medium text-mb-on-action shadow-mb-press transition hover:bg-mb-action-2">
        <LogoMark className="h-4 w-4" />
        Katıl
      </button>
    )
  ) : (
    <button
      type="button"
      onClick={() => (running ? stopFocus() : startFocus())}
      disabled={!roomName}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-[10px] px-3 text-sm font-medium transition disabled:opacity-50 ${
        running ? 'border border-mb-line bg-mb-card text-mb-ink hover:bg-mb-surface' : 'bg-mb-action text-mb-on-action shadow-mb-press hover:bg-mb-action-2'
      }`}
    >
      {running ? <Coffee className="h-4 w-4" /> : <LogoMark className="h-4 w-4" />}
      {running ? 'Mola ver' : 'Odaklan'}
    </button>
  );

  // Ortak masanın çevresindeki yerler: kişi sayısı kadar, en az MIN_SEATS (oda kapasitesini aşmadan, en fazla 8); boşlar "boş masa".
  const seatCount = Math.min(SEAT_POSITIONS.length, Math.max(people.length, Math.min(lobby?.maxUsers ?? MIN_SEATS, MIN_SEATS)));
  const panelButtons: Array<{ key: PanelKey; label: string; icon: typeof Mic; badge?: number }> = [
    { key: 'timer', label: 'Sayaç', icon: Timer },
    { key: 'chat', label: 'Sohbet', icon: MessageSquare, badge: messages.length },
    { key: 'tasks', label: 'Görevler', icon: ListChecks },
    { key: 'sound', label: 'Ortam sesi', icon: Volume2 },
  ];

  const deskTiles = (compact: boolean) =>
    people.map((person) => (
      <DeskTile
        key={person.userId}
        speaking={speakingIds.has(person.userId)}
        person={person}
        videoRoom={videoRoom}
        compact={compact}
        selected={stageCameraKey === `camera:${person.userId}`}
        onSelect={() => toggleCameraPin(person.userId)}
        onNudge={() => nudgeUser(person.userId, person.name)}
        onDuel={() => challengeUser(person.userId, person.name)}
        onKick={isOwner && !person.isSelf ? () => kickUser(person.userId) : undefined}
      />
    ));

  return (
    <div className="flex h-dvh flex-col bg-mb-surface text-mb-ink">
      {/* Ortam sesleri: panel kapalıyken de çalabilmeleri için her zaman sayfada */}
      <div hidden>
        {soundTracks.map((sound) => (
          <audio key={sound.key} ref={(element) => { audioRefs.current[sound.key] = element; }} src={sound.src} preload="auto" loop />
        ))}
      </div>

      {/* ── Üst şerit: çıkış, oda adı, kısa sayılar, panel düğmeleri ── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-mb-line bg-mb-bg px-3 py-2.5 md:px-4">
        <button type="button" onClick={leaveRoom} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[12px] border border-mb-line bg-mb-card px-3 text-sm font-medium text-mb-ink transition hover:border-danger/40 hover:text-danger">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Odadan çık</span>
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <h1 className="truncate font-mb-display text-[17px] font-medium tracking-[-0.02em] text-mb-ink md:text-lg">{lobby?.name ?? 'Oda yükleniyor'}</h1>
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <Chip title={`${people.length} kişi masada`}>
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {people.length}
            </Chip>
            <Chip title={focusedCount ? `${focusedCount} kişinin lambası yanıyor` : 'Şu an kimse odaklanmıyor'}>
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${focusedCount ? 'bg-accent shadow-[0_0_8px_var(--sl-blush)]' : 'border border-mb-body/50'}`} />
              {focusedCount}
            </Chip>
            {videoRoom ? (
              <Chip title="Kameralı oda">
                <Video className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">Kameralı oda</span>
              </Chip>
            ) : null}
            {lobby?.isPremiumOnly ? (
              <Chip title="Elite oda: odak süresi 2 kat sayılır">
                <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">Elite oda</span>
              </Chip>
            ) : null}
            {lobby?.isLocked ? (
              <Chip title="Yeni girişlere kapalı">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">Yeni girişlere kapalı</span>
              </Chip>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Paneller">
          {panelButtons.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => togglePanel(item.key)}
              aria-pressed={panels[item.key].open}
              aria-label={`${item.label} paneli`}
              title={item.label}
              className={`relative grid h-10 w-10 place-items-center rounded-[12px] transition ${
                panels[item.key].open ? 'bg-mb-solid text-mb-on-solid' : 'text-mb-body hover:bg-mb-surface hover:text-mb-ink'
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.key === 'timer' && timerLit && !panels.timer.open ? <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" /> : null}
            </button>
          ))}
          {isOwner ? (
            <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Oda ayarları" title="Oda ayarları" className="ml-1 grid h-10 w-10 place-items-center rounded-[12px] text-mb-body transition hover:bg-mb-surface hover:text-mb-ink">
              <Settings2 className="h-[18px] w-[18px]" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:overflow-hidden md:p-4">
        {/* ── Masalar ve sahne ── */}
        <section aria-label="Masalar" className={`relative flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0 ${stage ? 'min-h-[70dvh]' : ''}`}>
          {/* Bildirimler */}
          <div className="space-y-2 empty:hidden">
            {error ? <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice> : null}
            {call.error ? <Notice tone="danger" onDismiss={call.clearError}>{call.error}</Notice> : null}
            {board.error ? <Notice tone="danger" onDismiss={board.clearError}>{board.error}</Notice> : null}
            {notice ? <Notice tone="info" onDismiss={() => setNotice(null)}>{notice}</Notice> : null}
            {activeDuel ? <Notice tone="accent">{activeDuel}</Notice> : null}
            {pendingDuel ? (
              <Notice tone="accent" onDismiss={declineDuel}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{pendingDuel.challengerName} seni {pendingDuel.betAmount} puanlık düelloya çağırıyor.</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={declineDuel}>Reddet</Button>
                    <Button size="sm" onClick={acceptDuel}>Kabul et</Button>
                  </div>
                </div>
              </Notice>
            ) : null}
          </div>

          {stage ? (
            <>
              {panels.timer.open ? (
                <div
                  className={`flex shrink-0 items-center gap-3 rounded-[16px] border bg-mb-card px-3 py-2 shadow-mb-card ${timerLit ? 'border-mb-lamp/60' : 'border-mb-line'}`}
                  style={timerLit ? LAMP_LIGHT : undefined}
                >
                  <TimerRing seconds={timerSeconds} total={timerTotal} lit={timerLit} size={36} />
                  <p className="font-mb-display text-2xl font-light tabular-nums tracking-[-0.03em] text-mb-ink" aria-live="off">{formatDuration(timerSeconds)}</p>
                  <p className="hidden min-w-0 truncate text-[13px] text-mb-body sm:block">{timerTitle} · {timerPhase}</p>
                  <div className="ml-auto flex items-center gap-1">
                    {timerMainAction}
                    <button type="button" onClick={() => togglePanel('timer')} aria-label="Sayacı gizle" title="Gizle" className="grid h-8 w-8 place-items-center rounded-[8px] text-mb-body hover:bg-mb-surface hover:text-mb-ink">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}
              {/* Sahne: tahta, paylaşılan ekran ya da büyütülen kamera */}
              <div ref={stageRef} className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-stage ${stageFullscreen ? 'h-dvh' : 'rounded-[24px] shadow-mb-card'}`}>
                {sources.length > 1 ? (
                  <div className="flex shrink-0 gap-1 overflow-x-auto px-2 py-1.5 scrollbar-hide" role="tablist" aria-label="Sahnede ne gösterilsin">
                    {sources.map((source) => {
                      const active = source.key === stage.key;
                      const Icon = source.kind === 'board' ? (board.board?.kind === 'blank' ? Presentation : FileText) : source.kind === 'screen' ? MonitorUp : Camera;
                      return (
                        <button
                          key={source.key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setPinnedKey(source.key)}
                          className={`inline-flex max-w-64 shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-sm font-medium transition ${
                            active ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{source.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="relative min-h-0 flex-1">
                  {stage.kind === 'board' && board.board && user ? (
                    <div className="absolute inset-0">
                      <Suspense fallback={<div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/70" aria-label="Tahta yükleniyor" /></div>}>
                        <PdfBoard key={`${board.board.kind}:${board.board.fileUrl ?? board.board.openedBy}`} board={board.board} actions={board} selfId={user.id} />
                      </Suspense>
                    </div>
                  ) : stage.stream ? (
                    <div className="absolute inset-0 bg-black">
                      <VideoView stream={stage.stream} fit="contain" mirror={stage.mirror} label={stage.label} />
                    </div>
                  ) : null}
                </div>

                {stageFullscreen ? <div className="flex shrink-0 gap-2 overflow-x-auto px-2 pb-2">{deskTiles(true)}</div> : null}
              </div>

              {!stageFullscreen ? (
                <div className="flex shrink-0 gap-2 overflow-x-auto pb-1" aria-label="Masadakiler">
                  {deskTiles(true)}
                </div>
              ) : null}
            </>
          ) : (
            /* Okuma salonu: ortada ortak masa ve sayaç, çevresinde masalar */
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto grid min-h-full w-full max-w-6xl grid-cols-2 content-center gap-3 md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)_minmax(0,1fr)] md:items-center md:gap-4">
                <div className={`col-span-2 md:col-span-1 ${TABLE_POSITION}`}>
                  <div
                    className={`relative flex flex-col items-center rounded-[24px] border bg-mb-card px-5 py-6 text-center shadow-mb-card transition-[border-color] duration-700 ${timerLit ? 'border-mb-lamp/60' : 'border-mb-line'}`}
                    style={timerLit ? LAMP_LIGHT : undefined}
                  >
                    {panels.timer.open ? (
                      <>
                        <div className="absolute right-2 top-2 flex gap-0.5">
                          <button type="button" onClick={() => collapsePanel('timer')} aria-label={panels.timer.collapsed ? 'Sayacı büyüt' : 'Sayacı küçült'} aria-expanded={!panels.timer.collapsed} title={panels.timer.collapsed ? 'Büyüt' : 'Küçült'} className="grid h-8 w-8 place-items-center rounded-[8px] text-mb-body hover:bg-mb-surface hover:text-mb-ink">
                            <ChevronDown className={`h-4 w-4 transition-transform ${panels.timer.collapsed ? '-rotate-90' : ''}`} />
                          </button>
                          <button type="button" onClick={() => togglePanel('timer')} aria-label="Sayacı gizle" title="Gizle" className="grid h-8 w-8 place-items-center rounded-[8px] text-mb-body hover:bg-mb-surface hover:text-mb-ink">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-[13px] text-mb-body">{timerTitle}</p>
                        {panels.timer.collapsed ? (
                          // Küçültülünce yalnızca sayaç kalır.
                          <p className="mt-1 font-mb-display text-[2.75rem] font-light leading-none tracking-[-0.04em] tabular-nums text-mb-ink" aria-live="off">
                            {formatDuration(timerSeconds)}
                          </p>
                        ) : (
                          <>
                            <div className="mt-3">
                              <TimerRing seconds={timerSeconds} total={timerTotal} lit={timerLit} size={212}>
                                <p className="font-mb-display text-[3.25rem] font-light leading-none tracking-[-0.04em] tabular-nums text-mb-ink" aria-live="off">
                                  {formatDuration(timerSeconds)}
                                </p>
                                <p className="mt-2 flex items-center justify-center gap-1.5 text-[13px] text-mb-body">
                                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${timerLit ? 'bg-mb-lamp shadow-[0_0_10px_var(--color-mb-lamp)]' : 'bg-mb-body/40'}`} />
                                  {timerPhase}
                                </p>
                              </TimerRing>
                            </div>
                            <div className="mt-4 w-full text-left">{timerControls}</div>
                          </>
                        )}
                      </>
                    ) : (
                      <button type="button" onClick={() => togglePanel('timer')} className="flex flex-col items-center gap-2 py-6 text-sm text-mb-body hover:text-mb-ink">
                        <Timer className="h-6 w-6" aria-hidden="true" />
                        Sayacı göster
                      </button>
                    )}
                  </div>
                </div>
                {Array.from({ length: Math.max(seatCount, people.length) }, (_, index) => {
                  const person = people[index];
                  const position = SEAT_POSITIONS[index] ?? '';
                  return person ? (
                    <div key={person.userId} className={position}>
                      <DeskTile
                        speaking={speakingIds.has(person.userId)}
                        person={person}
                        videoRoom={videoRoom}
                        selected={stageCameraKey === `camera:${person.userId}`}
                        onSelect={() => toggleCameraPin(person.userId)}
                        onNudge={() => nudgeUser(person.userId, person.name)}
                        onDuel={() => challengeUser(person.userId, person.name)}
                        onKick={isOwner && !person.isSelf ? () => kickUser(person.userId) : undefined}
                      />
                    </div>
                  ) : (
                    <EmptySeat key={`bos-${index}`} videoRoom={videoRoom} className={position} />
                  );
                })}
              </div>
            </div>
          )}

          {/* Uzak sesler */}
          {people.filter((person) => !person.isSelf).map((person) => (
            <AudioSink key={person.userId} stream={person.micOn ? person.cameraStream : null} />
          ))}
          {/* Ekran paylaşımının sesi (paylaşan izin verdiyse); kendi ekran sesimiz çalınmaz. */}
          {roomUsers
            .filter((roomUser) => roomUser.userId !== user?.id && roomUser.isScreenSharing)
            .map((roomUser) => {
              const screen = call.remote(roomUser.userId)?.screen ?? null;
              return screen?.getAudioTracks().length ? <AudioSink key={`screen-${roomUser.userId}`} stream={screen} /> : null;
            })}

          {/* ── Kontrol çubuğu ── */}
          <div className="flex shrink-0 justify-center">
            <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-[18px] border border-mb-line bg-mb-card p-1.5 shadow-mb-raised">
              {videoRoom ? (
                <>
                  <MediaButton on={call.media.mic} onLabel="Mikrofonu kapat" offLabel="Mikrofonu aç" OnIcon={Mic} OffIcon={MicOff} onClick={call.toggleMic} disabled={!call.joined || call.busy} />
                  <MediaButton on={call.media.camera} onLabel="Kamerayı kapat" offLabel="Kamerayı aç" OnIcon={Camera} OffIcon={CameraOff} onClick={call.toggleCamera} disabled={!call.joined || call.busy} />
                  <MediaButton
                    on={call.media.screen}
                    onLabel="Paylaşımı durdur"
                    offLabel={boardOpen ? 'Tahta açıkken ekran paylaşılamaz' : 'Ekranını paylaş'}
                    OnIcon={MonitorX}
                    OffIcon={MonitorUp}
                    onClick={call.toggleScreen}
                    disabled={!call.joined || call.busy || (boardOpen && !call.media.screen)}
                  />
                  <IconButton label="Kamera ve mikrofon ayarları" onClick={() => setDevicesOpen(true)} icon={SlidersHorizontal} />
                  <span className="mx-0.5 h-6 w-px bg-mb-line" aria-hidden="true" />
                </>
              ) : null}
              <IconButton
                label={board.board ? 'Başka PDF aç' : 'PDF aç ve çiz'}
                onClick={() => pdfInputRef.current?.click()}
                icon={openingPdf ? Loader2 : FileText}
                spin={openingPdf}
                disabled={!joinedLobby || openingPdf}
                text={board.board ? 'Başka PDF' : 'PDF aç'}
              />
              <IconButton
                label="Boş tahta aç"
                onClick={() => {
                  board.openBlank();
                  setPinnedKey('board');
                }}
                icon={Presentation}
                disabled={!joinedLobby}
                text="Boş tahta"
              />
              {board.board ? <IconButton label="Tahtayı herkes için kapat" onClick={board.close} icon={X} text="Tahtayı kapat" /> : null}
              {stage ? <IconButton label={stageFullscreen ? 'Tam ekrandan çık' : 'Sahneyi tam ekran yap'} onClick={toggleStageFullscreen} icon={stageFullscreen ? Minimize2 : Maximize2} /> : null}
              <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => event.target.files?.[0] && void openPdfFile(event.target.files[0])} />
            </div>
          </div>
        </section>

        {/* ── Paneller: her biri açılıp kapanır ve küçültülür ── */}
        {dockOpen ? (
          <aside aria-label="Oda panelleri" className="flex w-full shrink-0 flex-col gap-3 lg:w-[22rem] lg:overflow-y-auto">
            {panels.chat.open ? (
              <Panel title={`Sohbet${messages.length ? ` · ${messages.length}` : ''}`} name="Sohbet" collapsed={panels.chat.collapsed} onCollapse={() => collapsePanel('chat')} onClose={() => togglePanel('chat')} grow>
                <div className="flex min-h-[18rem] flex-1 flex-col lg:min-h-0">
                  <div ref={messagesRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
                    {messages.map((message, index) => {
                      const senderId = message.user?.id ?? message.userId;
                      const mine = senderId === user?.id;
                      const fileHref = assetUrl(message.fileUrl);
                      const imageMessage = isImageMessage(message);
                      return (
                        <div key={message.id ?? `${message.text}-${index}`} className={`group/msg flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                          {!mine ? (
                            <p className="mb-0.5 flex items-center gap-1 px-1 text-xs font-medium text-mb-body">
                              {message.user?.fullName ?? message.fullName ?? 'Öğrenci'}
                              {senderId && message.id ? (
                                <button
                                  type="button"
                                  onClick={() => setReportTarget({ id: senderId, fullName: message.user?.fullName ?? message.fullName ?? 'Öğrenci', messageId: message.id, preview: message.text })}
                                  title="Mesajı şikayet et"
                                  aria-label="Mesajı şikayet et"
                                  className="grid h-5 w-5 place-items-center rounded text-mb-body opacity-0 transition hover:text-danger focus:opacity-100 group-hover/msg:opacity-100"
                                >
                                  <Flag className="h-3 w-3" />
                                </button>
                              ) : null}
                            </p>
                          ) : null}
                          <div className={`max-w-[88%] rounded-[14px] px-3 py-2 ${mine ? 'rounded-br-[4px] bg-mb-action text-mb-on-action' : 'rounded-bl-[4px] bg-mb-surface text-mb-ink'}`}>
                            {fileHref && imageMessage ? (
                              <a href={fileHref} target="_blank" rel="noreferrer" className="block">
                                <img src={fileHref} alt={message.text} className="mb-1 max-h-56 rounded-[10px] object-cover" />
                              </a>
                            ) : null}
                            {fileHref && !imageMessage ? (
                              <a href={fileHref} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-medium underline underline-offset-2">
                                <Paperclip className="h-4 w-4 shrink-0" />
                                {message.text}
                              </a>
                            ) : null}
                            {message.fileUrl && isPdfUrl(message.fileUrl) && joinedLobby ? (
                              <button
                                type="button"
                                onClick={() => {
                                  board.open(message.fileUrl!, message.text);
                                  setPinnedKey('board');
                                }}
                                className={`mt-2 inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-sm font-medium ${mine ? 'bg-white/15 hover:bg-white/25' : 'bg-mb-card text-mb-action hover:bg-mb-bg'}`}
                              >
                                <PenLine className="h-3.5 w-3.5" />
                                Tahtada aç
                              </button>
                            ) : null}
                            {!fileHref ? <p className="whitespace-pre-wrap break-words text-[15px] leading-6">{message.text}</p> : null}
                          </div>
                          <p className="mt-0.5 px-1 text-[11px] text-mb-body">{formatTime(message.createdAt ?? message.timestamp)}</p>
                        </div>
                      );
                    })}
                    {messages.length === 0 ? <p className="pt-6 text-center text-sm text-mb-body">Henüz mesaj yok.</p> : null}
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSend();
                    }}
                    className="flex items-center gap-1 border-t border-mb-line p-2"
                  >
                    <button type="button" onClick={() => imageInputRef.current?.click()} title="Fotoğraf ekle" aria-label="Fotoğraf ekle" className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-mb-body hover:bg-mb-surface hover:text-mb-ink">
                      <ImagePlus className="h-[18px] w-[18px]" />
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} title="Dosya ekle" aria-label="Dosya ekle" className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-mb-body hover:bg-mb-surface hover:text-mb-ink">
                      <Paperclip className="h-[18px] w-[18px]" />
                    </button>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0], 'image')} />
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0], 'file')} />
                    <input
                      value={chatText}
                      onChange={(event) => setChatText(event.target.value)}
                      placeholder="Mesaj yaz"
                      aria-label="Mesaj"
                      className="min-h-10 min-w-0 flex-1 rounded-[10px] border border-transparent bg-mb-surface px-3 text-[15px] text-mb-ink outline-none focus:border-mb-action"
                    />
                    <button disabled={!chatText.trim()} aria-label="Gönder" className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-mb-action text-mb-on-action disabled:opacity-40">
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </Panel>
            ) : null}

            {panels.tasks.open ? (
              <Panel title="Görevler" collapsed={panels.tasks.collapsed} onCollapse={() => collapsePanel('tasks')} onClose={() => togglePanel('tasks')}>
                <div className="flex max-h-[26rem] min-h-0 flex-col">
                  <TasksPanel onShare={shareToRoom} onError={setError} />
                </div>
              </Panel>
            ) : null}

            {panels.sound.open ? (
              <Panel title="Ortam sesi" collapsed={panels.sound.collapsed} onCollapse={() => collapsePanel('sound')} onClose={() => togglePanel('sound')}>
                <div className="space-y-4 px-4 pb-4">
                  <p className="text-xs text-mb-body">Odaklanınca çalar, molada susar.</p>
                  {soundTracks.map((sound) => (
                    <div key={sound.key}>
                      <div className="mb-1 flex justify-between text-sm">
                        <label htmlFor={`vol-${sound.key}`} className="font-medium text-mb-ink">{sound.name}</label>
                        <span className="tabular-nums text-mb-body">{volumes[sound.key] ?? 0}</span>
                      </div>
                      <input
                        id={`vol-${sound.key}`}
                        type="range"
                        min={0}
                        max={100}
                        value={volumes[sound.key] ?? 0}
                        onChange={(event) => setVolumes((current) => ({ ...current, [sound.key]: Number(event.target.value) }))}
                        className="h-2 w-full accent-[var(--color-mb-action)]"
                      />
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
          </aside>
        ) : null}
      </div>

      {isOwner && lobby ? (
        <RoomSettingsModal
          open={settingsOpen}
          lobby={lobby}
          categories={ROOM_CATEGORIES}
          onClose={() => setSettingsOpen(false)}
          onSaved={(saved) => updateLobby(saved)}
          onToggleLock={(locked) => getSocket().emit('lock_lobby', { locked })}
          onCloseRoom={() => getSocket().emit('close_lobby')}
        />
      ) : null}
      {videoRoom ? (
        <DeviceSettingsModal open={devicesOpen} devices={call.devices} onChange={(kind, deviceId) => void call.setDevice(kind, deviceId)} onClose={() => setDevicesOpen(false)} />
      ) : null}
      <ReportDialog
        target={reportTarget ? { id: reportTarget.id, fullName: reportTarget.fullName } : null}
        messageId={reportTarget?.messageId}
        messagePreview={reportTarget?.preview}
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
}

/** Üst şeritteki küçük sayı rozeti (kişi sayısı, yanan lamba vb.). */
function Chip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <span title={title} className="inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-mb-surface px-2 text-xs font-medium tabular-nums text-mb-body">
      <span className="sr-only">{title}: </span>
      {children}
    </span>
  );
}

/** Açılıp kapanan panel kartı. `compact` verilirse küçültülünce başlık yerine o görünür. */
function Panel({
  title,
  name = title,
  collapsed,
  onCollapse,
  onClose,
  children,
  compact,
  grow = false,
  lit = false,
}: {
  title: string;
  /** Düğmelerin erişilebilir adında kullanılır (başlık sayı içerebilir). */
  name?: string;
  collapsed: boolean;
  onCollapse: () => void;
  onClose: () => void;
  children: ReactNode;
  compact?: ReactNode;
  grow?: boolean;
  lit?: boolean;
}) {
  return (
    <section
      aria-label={name}
      className={`flex flex-col overflow-hidden rounded-[18px] border bg-mb-card shadow-mb-card transition-[border-color,box-shadow] duration-500 ${
        lit ? 'border-accent/60 shadow-[0_0_0_1px_var(--sl-blush),0_12px_40px_-12px_var(--sl-blush)]' : 'border-mb-line'
      } ${grow && !collapsed ? 'lg:min-h-[20rem] lg:flex-1' : ''}`}
    >
      {collapsed && compact ? (
        <div className="flex items-center">
          <div className="min-w-0 flex-1">{compact}</div>
          <button type="button" onClick={onClose} aria-label={`${name} panelini kapat`} title="Kapat" className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-mb-body hover:bg-mb-surface hover:text-mb-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-1 px-4 py-2.5">
            <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-mb-body">{title}</h2>
            <button type="button" onClick={onCollapse} aria-label={collapsed ? `${name} panelini büyüt` : `${name} panelini küçült`} aria-expanded={!collapsed} title={collapsed ? 'Büyüt' : 'Küçült'} className="grid h-8 w-8 place-items-center rounded-[8px] text-mb-body hover:bg-mb-surface hover:text-mb-ink">
              <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            </button>
            <button type="button" onClick={onClose} aria-label={`${name} panelini kapat`} title="Kapat" className="grid h-8 w-8 place-items-center rounded-[8px] text-mb-body hover:bg-mb-surface hover:text-mb-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
          {collapsed ? null : children}
        </>
      )}
    </section>
  );
}

function IconButton({
  label,
  onClick,
  icon: Icon,
  disabled = false,
  text,
  spin = false,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Mic;
  disabled?: boolean;
  text?: string;
  spin?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[12px] text-sm font-medium text-mb-ink transition hover:bg-mb-surface disabled:opacity-45 ${text ? 'px-3' : 'w-10'}`}
    >
      <Icon className={`h-[18px] w-[18px] ${spin ? 'animate-spin' : ''}`} />
      {text ? <span className="hidden sm:inline">{text}</span> : null}
    </button>
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
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  OnIcon: typeof Mic;
  OffIcon: typeof Mic;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = on ? OnIcon : OffIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      aria-label={on ? onLabel : offLabel}
      title={on ? onLabel : offLabel}
      className={`grid h-10 w-10 place-items-center rounded-[12px] transition disabled:opacity-45 ${on ? 'bg-mb-action text-mb-on-action hover:bg-mb-action-2' : 'bg-mb-surface text-mb-ink hover:bg-mb-band'}`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

function describeTimerEvent(event: { action: string; byName: string | null } | null, startedByName: string) {
  if (event?.byName && event.action === 'pause') return `${event.byName} duraklattı`;
  if (event?.byName && event.action === 'resume') return `${event.byName} sürdürdü`;
  return `${startedByName} başlattı`;
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
