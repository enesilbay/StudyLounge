import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Coffee,
  Crown,
  FileText,
  Flag,
  ImagePlus,
  Loader2,
  Lock,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  MonitorX,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Pause,
  PenLine,
  Play,
  Presentation,
  Send,
  Settings2,
  SlidersHorizontal,
  Square,
  Users,
  Video,
} from 'lucide-react';
import { Button, LampMark, Notice } from '../components/ui';
import { DeskTile, type DeskPerson } from '../components/room/DeskTile';
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
type SideTab = 'chat' | 'tasks' | 'sound';

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
  const [sideTab, setSideTab] = useState<SideTab>('chat');
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [chatHidden, setChatHidden] = useState(false);
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
    setSideTab('chat');
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
            {lobby?.isLocked ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-sunken px-2 py-0.5 text-sm font-semibold text-textMuted">
                <Lock className="h-3.5 w-3.5" /> Yeni girişlere kapalı
              </span>
            ) : null}
            {isOwner ? (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm font-semibold text-textDark transition hover:bg-sunken"
              >
                <Settings2 className="h-4 w-4" /> Oda ayarları
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-[15px] text-textMuted">
            {people.length} kişi masada, {focusedCount === 0 ? 'şu an kimse odaklanmıyor' : `${focusedCount} kişinin lambası yanıyor`}
          </p>
          <SubjectPicker onError={setError} />
        </div>

        {roomTimer.view && roomTimer.timer ? (
          /* Ortak Pomodoro: odadaki herkes aynı sayacı görür; katılanlar birlikte odaklanıp mola verir */
          <div
            className={`flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border bg-surface px-4 py-3 md:w-auto md:justify-start ${
              followShared && roomTimer.view.phase === 'focus' && !roomTimer.view.paused ? 'sl-lamp-on' : 'border-border'
            }`}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-textMuted">
                <Users className="h-3.5 w-3.5" />
                Ortak sayaç, {roomTimer.view.round}. tur
              </p>
              <p className="mt-1 font-mono text-4xl font-semibold tabular-nums leading-none text-textDark" aria-live="off">
                {formatDuration(roomTimer.view.remainingSeconds)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span
                  className={`rounded-md px-2 py-0.5 font-semibold ${
                    roomTimer.view.paused ? 'bg-sunken text-textMuted' : roomTimer.view.phase === 'focus' ? 'bg-lightAmber text-accentDark' : 'bg-softIndigo text-primary'
                  }`}
                >
                  {roomTimer.view.paused ? 'Duraklatıldı' : roomTimer.view.phase === 'focus' ? 'Odak' : 'Mola'}
                </span>
                <span className="text-textMuted">{describeTimerEvent(roomTimer.lastEvent, roomTimer.timer.startedByName)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={roomTimer.view.paused ? roomTimer.resume : roomTimer.pause}
                aria-label={roomTimer.view.paused ? 'Ortak sayacı sürdür' : 'Ortak sayacı herkes için duraklat'}
                title={roomTimer.view.paused ? 'Sürdür' : 'Herkes için duraklat'}
                className="grid h-10 w-10 place-items-center rounded-lg text-textMuted transition hover:bg-sunken hover:text-textDark"
              >
                {roomTimer.view.paused ? <Play className="h-[18px] w-[18px]" /> : <Pause className="h-[18px] w-[18px]" />}
              </button>
              <button
                type="button"
                onClick={roomTimer.stop}
                aria-label="Ortak sayacı herkes için bitir"
                title="Herkes için bitir"
                className="grid h-10 w-10 place-items-center rounded-lg text-textMuted transition hover:bg-softDanger hover:text-danger"
              >
                <Square className="h-4 w-4" />
              </button>
              {followShared ? (
                <Button variant="secondary" size="lg" onClick={leaveShared} className="ml-1 shrink-0">
                  Ayrıl
                </Button>
              ) : (
                <Button variant="lamp" size="lg" onClick={joinShared} className="ml-1 shrink-0">
                  <LampMark className="h-5 w-5" />
                  Katıl
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-border bg-surface px-4 py-3 md:w-auto md:justify-start">
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
                <span className="mx-0.5 w-px self-stretch bg-border" aria-hidden="true" />
                <button
                  type="button"
                  onClick={startShared}
                  disabled={!joinedLobby}
                  title="Bu süreyle odadaki herkes için ortak Pomodoro başlat"
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold text-primary transition hover:bg-softIndigo disabled:opacity-50"
                >
                  <Users className="h-3.5 w-3.5" />
                  Odayla başlat
                </button>
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
        )}
      </header>

      {/* Bildirimler */}
      <div className="mb-4 space-y-2 empty:hidden">
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
                <Button size="sm" variant="lamp" onClick={acceptDuel}>Kabul et</Button>
              </div>
            </div>
          </Notice>
        ) : null}
      </div>

      <div className={`grid flex-1 grid-cols-1 gap-5 ${chatHidden && stage ? '' : 'xl:grid-cols-[minmax(0,1fr)_360px]'}`}>
        {/* Masalar + sahne */}
        <section aria-label="Masalar" className="flex min-w-0 flex-col gap-3">
          {stage ? (
            <>
              {/* Sahne: paylaşılan ekran ya da PDF tahtası büyük durur, kameralar alttaki şeride küçülür */}
              <div
                ref={stageRef}
                className={`flex flex-col overflow-hidden bg-stage ${
                  stageFullscreen ? 'h-dvh' : 'h-[calc(100dvh-25rem)] min-h-[360px] rounded-xl border border-border shadow-[var(--sl-shadow)]'
                }`}
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Sahnede ne gösterilsin">
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
                          className={`inline-flex max-w-64 shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold transition ${
                            active ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{source.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatHidden((hidden) => !hidden)}
                    aria-label={chatHidden ? 'Sohbeti göster' : 'Sohbeti gizle, sahneyi genişlet'}
                    title={chatHidden ? 'Sohbeti göster' : 'Sohbeti gizle'}
                    className="hidden h-8 w-8 shrink-0 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white xl:grid"
                  >
                    {chatHidden ? <PanelRightOpen className="h-[18px] w-[18px]" /> : <PanelRightClose className="h-[18px] w-[18px]" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleStageFullscreen}
                    aria-label={stageFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
                    title={stageFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    {stageFullscreen ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
                  </button>
                </div>

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

                {/* Tam ekranda da kameralar görünsün */}
                {stageFullscreen ? (
                  <div className="flex gap-2 overflow-x-auto px-2 pb-2">
                    {people.map((person) => (
                      <DeskTile
                        key={person.userId}
                        speaking={speakingIds.has(person.userId)}
                        person={person}
                        videoRoom={videoRoom}
                        compact
                        selected={stageCameraKey === `camera:${person.userId}`}
                        onSelect={() => toggleCameraPin(person.userId)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              {!stageFullscreen ? (
                <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Masadakiler">
                  {people.map((person) => (
                    <DeskTile
                      key={person.userId}
                      speaking={speakingIds.has(person.userId)}
                      person={person}
                      videoRoom={videoRoom}
                      compact
                      selected={stageCameraKey === `camera:${person.userId}`}
                      onSelect={() => toggleCameraPin(person.userId)}
                      onNudge={() => nudgeUser(person.userId, person.name)}
                      onDuel={() => challengeUser(person.userId, person.name)}
                      onKick={isOwner && !person.isSelf ? () => kickUser(person.userId) : undefined}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className={`grid gap-3 ${videoRoom ? 'grid-cols-2 2xl:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 2xl:grid-cols-4'}`}>
              {people.map((person) => (
                <DeskTile
                  key={person.userId}
                  speaking={speakingIds.has(person.userId)}
                  person={person}
                  videoRoom={videoRoom}
                  onSelect={() => toggleCameraPin(person.userId)}
                  onNudge={() => nudgeUser(person.userId, person.name)}
                  onDuel={() => challengeUser(person.userId, person.name)}
                      onKick={isOwner && !person.isSelf ? () => kickUser(person.userId) : undefined}
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
          {/* Ekran paylaşımının sesi (paylaşan izin verdiyse); kendi ekran sesimiz çalınmaz. */}
          {roomUsers
            .filter((roomUser) => roomUser.userId !== user?.id && roomUser.isScreenSharing)
            .map((roomUser) => {
              const screen = call.remote(roomUser.userId)?.screen ?? null;
              return screen?.getAudioTracks().length ? <AudioSink key={`screen-${roomUser.userId}`} stream={screen} /> : null;
            })}

          {/* Kontroller: kamera/mikrofon/ekran yalnızca kameralı odalarda, PDF tahtası her odada */}
          <div className="sticky bottom-20 z-10 mt-auto flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-surface/95 p-2 backdrop-blur lg:bottom-4">
            {videoRoom ? (
              <>
                <MediaButton on={call.media.mic} onLabel="Mikrofonu kapat" offLabel="Mikrofonu aç" OnIcon={Mic} OffIcon={MicOff} onClick={call.toggleMic} disabled={!call.joined || call.busy} />
                <MediaButton on={call.media.camera} onLabel="Kamerayı kapat" offLabel="Kamerayı aç" OnIcon={Camera} OffIcon={CameraOff} onClick={call.toggleCamera} disabled={!call.joined || call.busy} />
                <MediaButton on={call.media.screen} onLabel="Paylaşımı durdur" offLabel="Ekranını paylaş" OnIcon={MonitorX} OffIcon={MonitorUp} onClick={call.toggleScreen} disabled={!call.joined || call.busy} invert />
                <button
                  type="button"
                  onClick={() => setDevicesOpen(true)}
                  title="Kamera ve mikrofon seç, önizle"
                  aria-label="Kamera ve mikrofon ayarları"
                  className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-surface text-textDark transition hover:bg-sunken"
                >
                  <SlidersHorizontal className="h-[18px] w-[18px]" />
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={!joinedLobby || openingPdf}
              title="PDF yükle, odadaki herkes görsün ve üstüne çizsin"
              aria-label={board.board ? 'Başka PDF aç' : 'PDF aç ve çiz'}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-[15px] font-semibold text-textDark transition hover:bg-sunken disabled:opacity-50"
            >
              {openingPdf ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <FileText className="h-[18px] w-[18px]" />}
              <span className="hidden sm:inline">{board.board ? 'Başka PDF aç' : 'PDF aç ve çiz'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                board.openBlank();
                setPinnedKey('board');
              }}
              disabled={!joinedLobby}
              title="PDF'siz boş bir tahta aç; herkes birlikte çizsin"
              aria-label="Boş tahta aç"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-[15px] font-semibold text-textDark transition hover:bg-sunken disabled:opacity-50"
            >
              <Presentation className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Boş tahta</span>
            </button>
            <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => event.target.files?.[0] && void openPdfFile(event.target.files[0])} />
            {videoRoom ? (
              <p className="w-full text-center text-xs text-textMuted sm:ml-2 sm:w-auto sm:text-left">
                {!call.joined
                  ? 'Görüntülü bağlantı hazırlanıyor…'
                  : call.media.screen
                    ? call.screenHasAudio
                      ? 'Ekranın sesiyle birlikte paylaşılıyor.'
                      : 'Ekranın sessiz paylaşılıyor. Sesi de paylaşmak için seçim penceresinde ses seçeneğini işaretle.'
                    : 'Kamera ve mikrofon sen açana kadar kapalı kalır.'}
              </p>
            ) : null}
          </div>
        </section>

        {/* Yan panel */}
        <aside className={`sl-panel flex h-[560px] flex-col overflow-hidden xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] ${chatHidden && stage ? 'xl:hidden' : ''}`}>
          <div className="flex border-b border-border" role="tablist" aria-label="Oda paneli">
            {(
              [
                ['chat', `Sohbet${messages.length ? ` (${messages.length})` : ''}`],
                ['tasks', 'Görevler'],
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
            <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message, index) => {
                const senderId = message.user?.id ?? message.userId;
                const mine = senderId === user?.id;
                const fileHref = assetUrl(message.fileUrl);
                const imageMessage = isImageMessage(message);
                return (
                  <div key={message.id ?? `${message.text}-${index}`} className={`group/msg flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    {!mine ? (
                      <p className="mb-0.5 flex items-center gap-1 px-1 text-xs font-semibold text-accentDark">
                        {message.user?.fullName ?? message.fullName ?? 'Öğrenci'}
                        {senderId && message.id ? (
                          <button
                            type="button"
                            onClick={() => setReportTarget({ id: senderId, fullName: message.user?.fullName ?? message.fullName ?? 'Öğrenci', messageId: message.id, preview: message.text })}
                            title="Mesajı şikayet et"
                            aria-label="Mesajı şikayet et"
                            className="grid h-5 w-5 place-items-center rounded text-textMuted opacity-0 transition hover:text-danger focus:opacity-100 group-hover/msg:opacity-100"
                          >
                            <Flag className="h-3 w-3" />
                          </button>
                        ) : null}
                      </p>
                    ) : null}
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
                      {message.fileUrl && isPdfUrl(message.fileUrl) && joinedLobby ? (
                        <button
                          type="button"
                          onClick={() => {
                            board.open(message.fileUrl!, message.text);
                            setPinnedKey('board');
                          }}
                          className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold ${mine ? 'bg-onPrimary/15 hover:bg-onPrimary/25' : 'bg-surface text-primary hover:bg-background'}`}
                        >
                          <PenLine className="h-3.5 w-3.5" />
                          Tahtada aç
                        </button>
                      ) : null}
                      {!fileHref ? <p className="whitespace-pre-wrap break-words text-[15px] leading-6">{message.text}</p> : null}
                    </div>
                    <p className="mt-0.5 px-1 text-[11px] text-textMuted">{formatTime(message.createdAt ?? message.timestamp)}</p>
                  </div>
                );
              })}
              {messages.length === 0 ? <p className="pt-8 text-center text-[15px] text-textMuted">Sohbet sessiz. Bir merhaba yaz ya da çalıştığın notu paylaş.</p> : null}
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

          {sideTab === 'tasks' ? <TasksPanel onShare={shareToRoom} onError={setError} /> : null}

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
  // Kamera/mikrofon: açıkken dolu turkuaz. Ekran paylaşımı: açıkken turkuaz çerçeveyle vurgulanır.
  const style = on
    ? invert
      ? 'border border-primary bg-softIndigo text-primary hover:bg-sunken'
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
