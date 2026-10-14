import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Camera,
  CameraOff,
  ChevronDown,
  ChevronUp,
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
  UserPlus,
  Users,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import { Button, Notice } from '../components/ui';
import { OverflowMenu } from '../components/app/Kit';
import { LogoMark } from '../components/brand/Logo';
import { ParticipantTile, SceneTile, type RoomPerson } from '../components/room/ParticipantTile';
import { TimerPill } from '../components/room/TimerDock';
import { useFitGrid } from '../lib/room/useFitGrid';
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
type SidePanel = 'chat' | 'tasks' | 'sound';

/** Sağdaki yan panel (sohbet, görevler ya da ortam sesi) ve kontrol çubuğunun gizliliği tarayıcıda hatırlanır. */
const SIDE_PANEL_KEY = 'sl-oda-yan-panel';
const BAR_HIDDEN_KEY = 'sl-oda-cubuk-gizli';
/** Tam ekranda fare bu kadar süre kıpırdamazsa kontrol çubuğu gizlenir. */
const IDLE_MS = 3000;

function readSidePanel(): SidePanel | null {
  if (!window.matchMedia('(min-width: 1024px)').matches) return null;
  try {
    const saved = localStorage.getItem(SIDE_PANEL_KEY);
    if (saved === 'chat' || saved === 'tasks' || saved === 'sound') return saved;
    if (saved === 'none') return null;
  } catch {
    // Depolama kapalıysa varsayılan kullanılır.
  }
  // İlk girişte geniş ekranda sohbet açık.
  return 'chat';
}

function readBarHidden(): boolean {
  try {
    return localStorage.getItem(BAR_HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

interface StageSource {
  key: string;
  label: string;
  kind: 'board' | 'screen' | 'camera';
  stream?: MediaStream;
  mirror?: boolean;
  /** Ekran paylaşımında paylaşan kişi. */
  userId?: number;
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
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
  const [sidePanel, setSidePanel] = useState<SidePanel | null>(readSidePanel);
  const [barHidden, setBarHidden] = useState(readBarHidden);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [stageFullscreen, setStageFullscreen] = useState(false);
  const [roomFullscreen, setRoomFullscreen] = useState(false);
  const [idle, setIdle] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);
  // Okunmuş mesaj sayısı: sohbet kapalıyken gelenler düğmede sayı olarak görünür.
  const [seenMessages, setSeenMessages] = useState(0);
  // İzlenen ekran paylaşımları (paylaşanın kimliği) ve kapatılan "ekran paylaşıyor" bildirimleri.
  const [watching, setWatching] = useState<number[]>([]);
  const [dismissedShares, setDismissedShares] = useState<number[]>([]);

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
    const onChange = () => {
      setStageFullscreen(document.fullscreenElement === stageRef.current && stageRef.current !== null);
      setRoomFullscreen(document.fullscreenElement === rootRef.current && rootRef.current !== null);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Tam ekranda kontrol çubuğu fare kıpırdamayınca gizlenir, kıpırdayınca geri gelir (Discord gibi).
  useEffect(() => {
    if (!roomFullscreen) return;
    let timeout = 0;
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(function sleep() {
        // Klavyeyle çubukta geziniliyorsa gizleme (fareyle basılan düğmenin odağı sayılmaz).
        const focused = document.activeElement;
        if (focused && barRef.current?.contains(focused) && focused.matches(':focus-visible')) timeout = window.setTimeout(sleep, IDLE_MS);
        else setIdle(true);
      }, IDLE_MS);
    };
    wake();
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
      setIdle(false);
    };
  }, [roomFullscreen]);

  useEffect(() => {
    let ignore = false;
    if (!roomName) return;
    api
      .get<Message[]>(`/messages/${encodeURIComponent(roomName)}`)
      .then((response) => {
        if (ignore) return;
        const history = unwrapData<Message[]>(response.data);
        setMessages(history);
        // Geçmiş mesajlar okunmuş sayılır; yalnızca odadayken gelenler sayılır.
        setSeenMessages(history.length);
      })
      .catch(() => !ignore && setMessages([]));
    return () => {
      ignore = true;
    };
  }, [roomName]);

  useEffect(() => {
    // Yalnızca sohbet kutusu kayar; scrollIntoView tüm sayfayı kaydırıp tahtadaki çizimi bozuyordu.
    const list = messagesRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [messages, sidePanel]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDE_PANEL_KEY, sidePanel ?? 'none');
      localStorage.setItem(BAR_HIDDEN_KEY, barHidden ? '1' : '0');
    } catch {
      // Depolama kapalıysa düzen yalnızca bu oturumda kalır.
    }
  }, [sidePanel, barHidden]);

  const toggleSide = (key: SidePanel) => setSidePanel((current) => (current === key ? null : key));
  if (sidePanel === 'chat' && seenMessages !== messages.length) setSeenMessages(messages.length);
  const unreadMessages = sidePanel === 'chat' ? 0 : Math.max(0, messages.length - seenMessages);

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
    setSidePanel('chat');
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

  const toggleFullscreen = (el: HTMLElement | null) => {
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => setError('Tarayıcı tam ekrana geçmeye izin vermedi.'));
  };
  const toggleStageFullscreen = () => toggleFullscreen(stageRef.current);
  const toggleRoomFullscreen = () => toggleFullscreen(rootRef.current);

  // Odanın bağlantısını panoya kopyalar; arkadaşın bağlantıyla doğrudan odaya gelir.
  const copyInvite = () => {
    const link = window.location.href;
    navigator.clipboard
      ?.writeText(link)
      .then(() => setNotice('Oda bağlantısı kopyalandı. Arkadaşına gönderebilirsin.'))
      .catch(() => setNotice(`Oda bağlantısı: ${link}`));
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
  const people: RoomPerson[] = (() => {
    const list: RoomPerson[] = [];
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

  /* ── Ekran paylaşımı: herkese bildirilir, yalnızca "Yayını izle" diyene gelir (Discord gibi) ── */
  const sharers = roomUsers.filter((roomUser) => roomUser.isScreenSharing && roomUser.userId !== user?.id);
  const selfSharing = Boolean(user && call.media.screen && call.screenStream);
  // Paylaşım bitince izleme ve kapatılan bildirim de düşer; yeni paylaşım yeniden bildirilir.
  const liveWatching = watching.filter((id) => (id === user?.id ? selfSharing : sharers.some((sharer) => sharer.userId === id)));
  if (liveWatching.length !== watching.length) setWatching(liveWatching);
  const liveDismissed = dismissedShares.filter((id) => sharers.some((sharer) => sharer.userId === id));
  if (liveDismissed.length !== dismissedShares.length) setDismissedShares(liveDismissed);
  const shareInvites = sharers.filter((sharer) => !watching.includes(sharer.userId) && !dismissedShares.includes(sharer.userId));

  const watchScreen = (sharerId: number) => {
    if (sharerId !== user?.id) call.watchScreen(sharerId, true);
    setWatching((current) => (current.includes(sharerId) ? current : [...current, sharerId]));
    setPinnedKey(`screen:${sharerId}`);
  };
  const stopWatching = (sharerId: number) => {
    if (sharerId !== user?.id) call.watchScreen(sharerId, false);
    setWatching((current) => current.filter((id) => id !== sharerId));
    // Bir kez izlenen yayının bildirimi geri gelmez; yayın kutusu ızgarada kalır.
    setDismissedShares((current) => (current.includes(sharerId) ? current : [...current, sharerId]));
    setPinnedKey((current) => (current === `screen:${sharerId}` ? null : current));
  };

  /* ── Sahne: PDF tahtası, izlenen ekranlar ve büyütülen kamera ── */
  // Tahta ortak çalışma alanıdır: biri açınca herkesin sahnesine gelir.
  const boardKey = board.board ? `${board.board.kind}:${board.board.fileUrl ?? board.board.openedBy}` : null;
  const [seenBoardKey, setSeenBoardKey] = useState<string | null>(null);
  if (boardKey !== seenBoardKey) {
    setSeenBoardKey(boardKey);
    if (boardKey) setPinnedKey('board');
  }

  const sources: StageSource[] = [];
  if (board.board) sources.push({ key: 'board', label: board.board.fileName, kind: 'board' });
  watching.forEach((sharerId) => {
    if (sharerId === user?.id) {
      if (call.screenStream) sources.push({ key: `screen:${sharerId}`, label: 'Senin ekranın', kind: 'screen', stream: call.screenStream, userId: sharerId });
      return;
    }
    const sharer = sharers.find((item) => item.userId === sharerId);
    if (sharer) sources.push({ key: `screen:${sharerId}`, label: `${sharer.fullName} ekranı`, kind: 'screen', stream: call.remote(sharerId)?.screen ?? undefined, userId: sharerId });
  });
  const pinnedCamera = pinnedKey?.startsWith('camera:') ? people.find((person) => `camera:${person.userId}` === pinnedKey) : undefined;
  if (pinnedCamera && hasLiveVideo(pinnedCamera.cameraStream)) {
    sources.push({ key: pinnedKey!, label: pinnedCamera.isSelf ? 'Senin kameran' : `${pinnedCamera.name} kamerası`, kind: 'camera', stream: pinnedCamera.cameraStream!, mirror: pinnedCamera.isSelf });
  }
  const stage = sources.find((source) => source.key === pinnedKey) ?? null;
  const stageCameraKey = stage?.kind === 'camera' ? stage.key : null;
  const focusedCount = people.filter((person) => person.isAtDesk).length;

  // Izgaradaki kişi dışı kutular: sahnede olmayan yayınlar, sahnede olmayan tahta, yalnızken davet.
  const shareTiles = [...(selfSharing && user ? [{ userId: user.id, name: user.fullName, self: true }] : []), ...sharers.map((sharer) => ({ userId: sharer.userId, name: sharer.fullName, self: false }))].filter(
    (share) => stage?.key !== `screen:${share.userId}`,
  );
  const showBoardTile = Boolean(board.board) && stage?.kind !== 'board';
  const showInvite = !stage && people.length <= 1;
  const tileCount = people.length + shareTiles.length + (showBoardTile ? 1 : 0) + (showInvite ? 1 : 0);
  const [gridRef, grid] = useFitGrid(tileCount, 12);

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

  const sideButtons: Array<{ key: SidePanel; label: string; icon: typeof Mic; badge?: number }> = [
    { key: 'chat', label: 'Sohbet', icon: MessageSquare, badge: unreadMessages },
    { key: 'tasks', label: 'Görevler', icon: ListChecks },
    { key: 'sound', label: 'Ortam sesi', icon: Volume2 },
  ];
  const barVisible = !(roomFullscreen && idle);
  const canFullscreen = Boolean(document.fullscreenEnabled);

  const personTile = (person: RoomPerson, small: boolean) => (
    <ParticipantTile
      speaking={speakingIds.has(person.userId)}
      person={person}
      videoRoom={videoRoom}
      small={small}
      selected={stageCameraKey === `camera:${person.userId}`}
      onSelect={() => toggleCameraPin(person.userId)}
      onNudge={() => nudgeUser(person.userId, person.name)}
      onDuel={() => challengeUser(person.userId, person.name)}
      onKick={isOwner && !person.isSelf ? () => kickUser(person.userId) : undefined}
    />
  );
  const tileAction = (small: boolean, dark: boolean) =>
    small
      ? `rounded-[8px] px-2 py-0.5 text-xs font-medium transition ${dark ? 'bg-white/15 hover:bg-white/25' : 'bg-mb-surface hover:bg-mb-band'}`
      : `inline-flex min-h-10 items-center gap-2 rounded-[12px] px-4 text-sm font-medium transition ${dark ? 'bg-white text-black hover:bg-white/90' : 'bg-mb-action text-mb-on-action shadow-mb-press hover:bg-mb-action-2'}`;

  // Izgarada ve sahne açıkken yan şeritte aynı sırayla: kişiler, yayınlar, tahta, davet.
  const tiles = (small: boolean): Array<{ key: string; node: ReactNode }> => [
    ...people.map((person) => ({ key: `p:${person.userId}`, node: personTile(person, small) })),
    ...shareTiles.map((share) => ({
      key: `s:${share.userId}`,
      node: (
        <SceneTile
          live
          small={small}
          icon={MonitorUp}
          title={share.self ? 'Ekranını paylaşıyorsun' : `${share.name} ekranını paylaşıyor`}
          text={share.self ? 'Odadakiler isterse izleyebilir.' : 'İzlemek istersen yayına katıl.'}
          action={
            <button type="button" onClick={() => watchScreen(share.userId)} className={tileAction(small, true)}>
              {share.self ? 'Önizle' : 'Yayını izle'}
            </button>
          }
        />
      ),
    })),
    ...(showBoardTile && board.board
      ? [
          {
            key: 'board',
            node: (
              <SceneTile
                small={small}
                icon={board.board.kind === 'blank' ? Presentation : FileText}
                title={board.board.fileName}
                text="Tahta odadakilerle ortak; birlikte çizebilirsiniz."
                action={
                  <button type="button" onClick={() => setPinnedKey('board')} className={tileAction(small, false)}>
                    Tahtaya dön
                  </button>
                }
              />
            ),
          },
        ]
      : []),
    ...(showInvite && !small
      ? [
          {
            key: 'invite',
            node: (
              <SceneTile
                dashed
                icon={UserPlus}
                title="Odada şimdilik yalnızsın"
                text="Bağlantıyı gönder, arkadaşın doğrudan bu odaya gelsin."
                action={
                  <button type="button" onClick={copyInvite} className={tileAction(false, false)}>
                    Davet bağlantısını kopyala
                  </button>
                }
              />
            ),
          },
        ]
      : []),
  ];

  const openBlankBoard = () => {
    board.openBlank();
    setPinnedKey('board');
  };

  const closeStage = () => {
    if (stage?.kind === 'screen' && stage.userId != null) stopWatching(stage.userId);
    else setPinnedKey(null);
  };

  return (
    <div ref={rootRef} className={`relative flex h-dvh flex-col bg-mb-room text-mb-ink ${roomFullscreen && idle ? 'cursor-none' : ''}`}>
      {/* Ortam sesleri: panel kapalıyken de çalabilmeleri için her zaman sayfada */}
      <div hidden>
        {soundTracks.map((sound) => (
          <audio key={sound.key} ref={(element) => { audioRefs.current[sound.key] = element; }} src={sound.src} preload="auto" loop />
        ))}
      </div>

      {/* ── Üst şerit: oda adı ve sayılar, ortada sayaç, sağda davet ve ayarlar ── */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-3 pt-3 md:flex-nowrap md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <h1 className="truncate font-mb-display text-[17px] font-medium tracking-[-0.02em] text-mb-ink md:text-lg">{lobby?.name ?? 'Oda yükleniyor'}</h1>
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <Chip title={`${people.length} kişi odada`}>
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {people.length}
            </Chip>
            <Chip title={focusedCount ? `${focusedCount} kişi odakta` : 'Şu an kimse odaklanmıyor'}>
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${focusedCount ? 'bg-mb-lamp shadow-[0_0_8px_var(--color-mb-lamp)]' : 'border border-mb-body/50'}`} />
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

        <div className="order-last w-full md:order-none md:w-auto">
          <TimerPill time={formatDuration(timerSeconds)} seconds={timerSeconds} total={timerTotal} lit={timerLit} title={timerTitle} phase={timerPhase} action={timerMainAction}>
            {timerControls}
          </TimerPill>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1">
          <button type="button" onClick={copyInvite} title="Oda bağlantısını kopyala" className="inline-flex min-h-10 items-center gap-2 rounded-[12px] px-3 text-sm font-medium text-mb-ink transition hover:bg-mb-card">
            <UserPlus className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="hidden sm:inline">Davet et</span>
            <span className="sr-only sm:hidden">Davet et</span>
          </button>
          {isOwner ? (
            <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Oda ayarları" title="Oda ayarları" className="grid h-10 w-10 place-items-center rounded-[12px] text-mb-body transition hover:bg-mb-card hover:text-mb-ink">
              <Settings2 className="h-[18px] w-[18px]" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 gap-3 p-3 md:px-4">
        <main aria-label="Odadakiler" className="relative flex min-w-0 flex-1 flex-col">
          {/* Bildirimler: düzeni kaydırmadan sahnenin üstünde durur */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center px-2 pt-2">
            <div className="pointer-events-auto w-full max-w-xl space-y-2 empty:hidden [&>div]:shadow-mb-raised [&>div]:![background-color:var(--color-mb-card)]">
              {error ? <Notice tone="danger" onDismiss={() => setError(null)}>{error}</Notice> : null}
              {call.error ? <Notice tone="danger" onDismiss={call.clearError}>{call.error}</Notice> : null}
              {board.error ? <Notice tone="danger" onDismiss={board.clearError}>{board.error}</Notice> : null}
              {shareInvites.map((sharer) => (
                <Notice key={sharer.userId} tone="info" onDismiss={() => setDismissedShares((current) => [...current, sharer.userId])}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                      <strong className="font-medium">{sharer.fullName}</strong> ekranını paylaşıyor.
                    </span>
                    <Button size="sm" onClick={() => watchScreen(sharer.userId)}>
                      Yayını izle
                    </Button>
                  </div>
                </Notice>
              ))}
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
          </div>

          {stage ? (
            /* Sahne: tahta, izlenen ekran ya da büyütülen kamera; kişiler yanda şerit */
            <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
              <div ref={stageRef} className={`relative flex min-h-0 flex-1 flex-col overflow-hidden bg-stage ${stageFullscreen ? 'h-dvh' : 'rounded-[16px]'}`}>
                <div className="flex shrink-0 items-center gap-1 px-2 py-1.5">
                  <div role="tablist" aria-label="Sahnede ne gösterilsin" className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-hide">
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
                  <button type="button" onClick={toggleStageFullscreen} aria-label={stageFullscreen ? 'Tam ekrandan çık' : 'Sahneyi tam ekran yap'} title={stageFullscreen ? 'Tam ekrandan çık' : 'Sahneyi tam ekran yap'} className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-white/70 transition hover:bg-white/10 hover:text-white">
                    {stageFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={closeStage} aria-label={stage.kind === 'screen' ? 'İzlemeyi bırak' : 'Sahneden indir'} title={stage.kind === 'screen' ? 'İzlemeyi bırak' : 'Sahneden indir'} className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-white/70 transition hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative min-h-0 flex-1">
                  {stage.kind === 'board' && board.board && user ? (
                    <div className="absolute inset-0">
                      <Suspense fallback={<div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/70" aria-label="Tahta yükleniyor" /></div>}>
                        <PdfBoard key={boardKey ?? 'tahta'} board={board.board} actions={board} selfId={user.id} />
                      </Suspense>
                    </div>
                  ) : stage.stream ? (
                    <div className="absolute inset-0 bg-black">
                      <VideoView stream={stage.stream} fit="contain" mirror={stage.mirror} label={stage.label} />
                    </div>
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-white/70">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        Yayına bağlanılıyor
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <section aria-label="Sahnenin yanındakiler" className="flex shrink-0 gap-2 overflow-x-auto scrollbar-hide lg:w-52 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
                {tiles(true).map((tile) => (
                  <div key={tile.key} className="aspect-video w-36 shrink-0 sm:w-44 lg:w-full">
                    {tile.node}
                  </div>
                ))}
              </section>
            </div>
          ) : (
            /* Izgara: herkes kaydırmadan sığar, kutular alan büyüdükçe büyür */
            <div ref={gridRef} className="min-h-0 flex-1">
              <div className="flex h-full flex-wrap content-center items-center justify-center gap-3">
                {tiles(false).map((tile) => (
                  <div key={tile.key} className="shrink-0" style={{ width: grid.width, height: grid.height }}>
                    {tile.node}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uzak sesler */}
          {people.filter((person) => !person.isSelf).map((person) => (
            <AudioSink key={person.userId} stream={person.micOn ? person.cameraStream : null} />
          ))}
          {/* İzlenen ekran paylaşımının sesi (paylaşan izin verdiyse) */}
          {sharers
            .filter((sharer) => watching.includes(sharer.userId))
            .map((sharer) => {
              const screen = call.remote(sharer.userId)?.screen ?? null;
              return screen?.getAudioTracks().length ? <AudioSink key={`screen-${sharer.userId}`} stream={screen} /> : null;
            })}
        </main>

        {/* ── Yan panel: sohbet, görevler ya da ortam sesi (telefonda alanın üstüne açılır) ── */}
        {sidePanel ? (
          <aside aria-label="Yan panel" className="absolute inset-3 z-30 flex flex-col overflow-hidden rounded-[16px] border border-mb-line bg-mb-card shadow-mb-raised lg:static lg:inset-auto lg:z-auto lg:w-[22rem] lg:shrink-0 lg:shadow-mb-card">
            <div className="flex shrink-0 items-center gap-1 border-b border-mb-line p-1.5">
              <div role="tablist" aria-label="Paneller" className="flex min-w-0 flex-1 gap-0.5">
                {sideButtons.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={sidePanel === item.key}
                    onClick={() => setSidePanel(item.key)}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-[10px] px-3 text-sm font-medium transition ${
                      sidePanel === item.key ? 'bg-mb-surface text-mb-ink' : 'text-mb-body hover:text-mb-ink'
                    }`}
                  >
                    {item.label}
                    {item.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-mb-live px-1 text-[11px] font-semibold text-mb-on-live">{item.badge}</span> : null}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setSidePanel(null)} aria-label="Yan paneli kapat" title="Kapat" className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-mb-body transition hover:bg-mb-surface hover:text-mb-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            {sidePanel === 'chat' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div ref={messagesRef} role="log" aria-label="Oda sohbeti" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
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
            ) : sidePanel === 'tasks' ? (
              <div className="flex min-h-0 flex-1 flex-col pt-2">
                <TasksPanel onShare={shareToRoom} onError={setError} />
              </div>
            ) : (
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
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
            )}
          </aside>
        ) : null}
      </div>

      {/* ── Kontrol çubuğu: gizlenebilir; tam ekranda fare durunca kendiliğinden gizlenir ── */}
      {barHidden ? (
        <button
          type="button"
          onClick={() => setBarHidden(false)}
          aria-label="Kontrolleri göster"
          title="Kontrolleri göster"
          className="absolute bottom-3 left-1/2 z-40 inline-flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-mb-line bg-mb-card px-4 text-[13px] font-medium text-mb-body shadow-mb-raised transition hover:text-mb-ink"
        >
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
          Kontroller
        </button>
      ) : (
        <div
          ref={barRef}
          className={`flex justify-center px-3 pb-3 transition-[opacity,transform] duration-300 ${roomFullscreen ? 'absolute inset-x-0 bottom-0 z-40' : 'shrink-0'} ${
            barVisible ? '' : 'pointer-events-none translate-y-4 opacity-0'
          }`}
        >
          {/* Telefonda yalnızca mikrofon, kamera, sohbet, "Diğer" ve Ayrıl; gerisi "Diğer" menüsünde */}
          <div role="toolbar" aria-label="Oda kontrolleri" className="flex max-w-full items-center gap-1 rounded-[18px] border border-mb-line bg-mb-card p-1.5 shadow-mb-raised">
            {videoRoom ? (
              <>
                <MediaButton on={call.media.mic} onLabel="Mikrofonu kapat" offLabel="Mikrofonu aç" OnIcon={Mic} OffIcon={MicOff} onClick={call.toggleMic} disabled={!call.joined || call.busy} />
                <MediaButton on={call.media.camera} onLabel="Kamerayı kapat" offLabel="Kamerayı aç" OnIcon={Camera} OffIcon={CameraOff} onClick={call.toggleCamera} disabled={!call.joined || call.busy} />
                <div className="hidden items-center gap-1 md:flex">
                  <MediaButton
                    on={call.media.screen}
                    onLabel="Paylaşımı durdur"
                    offLabel={boardOpen ? 'Tahta açıkken ekran paylaşılamaz' : 'Ekranını paylaş'}
                    OnIcon={MonitorX}
                    OffIcon={MonitorUp}
                    onClick={call.toggleScreen}
                    offIsNeutral
                    disabled={!call.joined || call.busy || (boardOpen && !call.media.screen)}
                  />
                  <IconButton label="Kamera ve mikrofon ayarları" onClick={() => setDevicesOpen(true)} icon={SlidersHorizontal} />
                </div>
                <BarDivider />
              </>
            ) : null}
            <div className="hidden items-center gap-1 md:flex">
              <IconButton
                label={board.board ? 'Başka PDF aç' : 'PDF aç ve çiz'}
                onClick={() => pdfInputRef.current?.click()}
                icon={openingPdf ? Loader2 : FileText}
                spin={openingPdf}
                disabled={!joinedLobby || openingPdf}
                text={board.board ? 'Başka PDF' : 'PDF aç'}
              />
              <IconButton label="Boş tahta aç" onClick={openBlankBoard} icon={Presentation} disabled={!joinedLobby} text="Boş tahta" />
              {board.board ? <IconButton label="Tahtayı herkes için kapat" onClick={board.close} icon={X} text="Tahtayı kapat" /> : null}
              <BarDivider />
            </div>
            <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => event.target.files?.[0] && void openPdfFile(event.target.files[0])} />
            {sideButtons.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleSide(item.key)}
                aria-pressed={sidePanel === item.key}
                aria-label={`${item.label} paneli`}
                title={item.label}
                className={`relative h-10 w-10 shrink-0 place-items-center rounded-[12px] transition ${item.key === 'chat' ? 'grid' : 'hidden md:grid'} ${
                  sidePanel === item.key ? 'bg-mb-solid text-mb-on-solid' : 'text-mb-ink hover:bg-mb-surface'
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.badge ? (
                  <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-mb-live px-1 text-[10px] font-semibold text-mb-on-live">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </button>
            ))}
            <div className="hidden items-center gap-1 md:flex">
              <BarDivider />
              {canFullscreen ? (
                <IconButton label={roomFullscreen ? 'Tam ekrandan çık' : 'Odayı tam ekran yap'} onClick={toggleRoomFullscreen} icon={roomFullscreen ? Minimize2 : Maximize2} />
              ) : null}
              <IconButton label="Kontrolleri gizle" onClick={() => setBarHidden(true)} icon={ChevronDown} />
            </div>
            <OverflowMenu
              className="md:hidden"
              items={[
                ...(videoRoom
                  ? [
                      {
                        label: call.media.screen ? 'Paylaşımı durdur' : 'Ekranını paylaş',
                        icon: call.media.screen ? MonitorX : MonitorUp,
                        onClick: () => void call.toggleScreen(),
                        disabled: !call.joined || call.busy || (boardOpen && !call.media.screen),
                      },
                      { label: 'Kamera ve mikrofon ayarları', icon: SlidersHorizontal, onClick: () => setDevicesOpen(true) },
                    ]
                  : []),
                { label: board.board ? 'Başka PDF aç' : 'PDF aç ve çiz', icon: FileText, onClick: () => pdfInputRef.current?.click(), disabled: !joinedLobby || openingPdf },
                { label: 'Boş tahta aç', icon: Presentation, onClick: openBlankBoard, disabled: !joinedLobby },
                ...(board.board ? [{ label: 'Tahtayı herkes için kapat', icon: X, onClick: board.close }] : []),
                { label: 'Görevler', icon: ListChecks, onClick: () => toggleSide('tasks'), active: sidePanel === 'tasks' },
                { label: 'Ortam sesi', icon: Volume2, onClick: () => toggleSide('sound'), active: sidePanel === 'sound' },
                ...(canFullscreen ? [{ label: roomFullscreen ? 'Tam ekrandan çık' : 'Tam ekran', icon: roomFullscreen ? Minimize2 : Maximize2, onClick: toggleRoomFullscreen }] : []),
                { label: 'Kontrolleri gizle', icon: ChevronDown, onClick: () => setBarHidden(true) },
              ]}
            />
            <button
              type="button"
              onClick={leaveRoom}
              aria-label="Odadan çık"
              title="Odadan çık"
              className="ml-1 inline-flex h-10 shrink-0 items-center gap-2 rounded-[12px] bg-mb-live px-3 text-sm font-medium text-mb-on-live transition hover:brightness-110"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Ayrıl</span>
            </button>
          </div>
        </div>
      )}

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

function BarDivider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-mb-line" aria-hidden="true" />;
}

/** Üst şeritteki küçük sayı rozeti (kişi sayısı, yanan lamba vb.). */
function Chip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <span title={title} className="inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-mb-card px-2 text-xs font-medium tabular-nums text-mb-body">
      <span className="sr-only">{title}: </span>
      {children}
    </span>
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
      className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] text-sm font-medium text-mb-ink transition hover:bg-mb-surface disabled:opacity-45 ${text ? 'px-3' : 'w-10'}`}
    >
      <Icon className={`h-[18px] w-[18px] ${spin ? 'animate-spin' : ''}`} />
      {text ? <span className="hidden xl:inline">{text}</span> : null}
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
  offIsNeutral = false,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  OnIcon: typeof Mic;
  OffIcon: typeof Mic;
  onClick: () => void;
  disabled?: boolean;
  /** Kapalı hâli uyarı değilse (ekran paylaşımı): kapalıyken kırmızı yerine sade, açıkken yeşil. */
  offIsNeutral?: boolean;
}) {
  const Icon = on ? OnIcon : OffIcon;
  // Meet'teki gibi: kapalı mikrofon ve kamera kırmızı; ekran paylaşımı yalnızca açıkken renklenir.
  const tone = offIsNeutral
    ? on
      ? 'bg-mb-action text-mb-on-action hover:bg-mb-action-2'
      : 'text-mb-ink hover:bg-mb-surface'
    : on
      ? 'bg-mb-surface text-mb-ink hover:bg-mb-band'
      : 'bg-mb-live/12 text-mb-live hover:bg-mb-live/20';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      aria-label={on ? onLabel : offLabel}
      title={on ? onLabel : offLabel}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] transition disabled:opacity-45 ${tone}`}
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
