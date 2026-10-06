import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { getSocket } from '../socket';
import type { MediaState } from '../types';
import { PeerManager, type RemoteMedia, type SignalData } from './PeerManager';
import { constraintsFor, loadDevicePrefs, saveDevicePref, type DeviceKind, type DevicePrefs } from './devices';

const FALLBACK_ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

interface UseRoomCallOptions {
  roomName: string | null;
  selfId: number | null;
  /** Oda kameralı mı ve kullanıcı lobiye katıldı mı? İkisi de doğruysa aramaya girilir. */
  enabled: boolean;
}

export interface RoomCall {
  joined: boolean;
  media: MediaState;
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  remote: (userId: number) => RemoteMedia | null;
  remoteIds: number[];
  error: string | null;
  clearError: () => void;
  toggleCamera: () => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleScreen: () => Promise<void>;
  busy: boolean;
  /** Seçili kamera/mikrofon (null = tarayıcının varsayılanı). */
  devices: DevicePrefs;
  /** Cihazı seçer; o cihaz açıksa görüşme kesilmeden yenisine geçilir. */
  setDevice: (kind: DeviceKind, deviceId: string | null) => Promise<void>;
  /** Ekran paylaşımı sesli mi (tarayıcı ve kullanıcı izin verdiyse). */
  screenHasAudio: boolean;
}

const OFF: MediaState = { camera: false, mic: false, screen: false };

export function useRoomCall({ roomName, selfId, enabled }: UseRoomCallOptions): RoomCall {
  const managerRef = useRef<PeerManager | null>(null);
  const [manager, setManager] = useState<PeerManager | null>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const [joined, setJoined] = useState(false);
  const [media, setMedia] = useState<MediaState>(OFF);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devices, setDevices] = useState<DevicePrefs>(loadDevicePrefs);
  const devicesRef = useRef(devices);
  devicesRef.current = devices;

  const publish = useCallback(() => {
    const camera = cameraRef.current;
    const screen = screenRef.current;
    const next: MediaState = {
      camera: Boolean(camera?.getVideoTracks().some((t) => t.readyState === 'live')),
      mic: Boolean(camera?.getAudioTracks().some((t) => t.readyState === 'live' && t.enabled)),
      screen: Boolean(screen?.getVideoTracks().some((t) => t.readyState === 'live')),
    };
    setMedia(next);
    // Yeni MediaStream nesnesi: React'in video öğesini yeniden bağlaması için.
    setCameraStream(camera && camera.getTracks().length ? new MediaStream(camera.getTracks()) : null);
    setScreenStream(screen);
    managerRef.current?.setLocalStreams(camera && camera.getTracks().length ? camera : null, screen);
    getSocket().emit('rtc_media_state', next);
  }, []);

  // Aramaya katıl / ayrıl
  useEffect(() => {
    if (!enabled || !roomName || !selfId) return;

    const socket = getSocket();
    let disposed = false;

    const onPeers = (payload: { peers: Array<{ userId: number }> }) => {
      setJoined(true);
      payload.peers.forEach((peer) => managerRef.current?.ensurePeer(peer.userId));
    };
    const onPeerJoined = (payload: { userId: number }) => managerRef.current?.ensurePeer(payload.userId);
    const onPeerLeft = (payload: { userId: number }) => managerRef.current?.removePeer(payload.userId);
    const onSignal = (payload: { fromUserId: number; data: SignalData }) => {
      void managerRef.current?.handleSignal(payload.fromUserId, payload.data);
    };
    const onRtcError = (payload: { message?: string }) => setError(payload.message ?? 'Görüntülü bağlantı kurulamadı.');

    (async () => {
      let iceServers = FALLBACK_ICE;
      try {
        const response = await api.get<{ iceServers: RTCIceServer[] }>('/rtc/ice-servers');
        if (response.data?.iceServers?.length) iceServers = response.data.iceServers;
      } catch {
        /* STUN varsayılanı ile devam */
      }
      if (disposed) return;

      const created = new PeerManager({
        selfId,
        iceServers,
        sendSignal: (targetUserId, data) => socket.emit('rtc_signal', { targetUserId, data }),
        onChange: () => setVersion((v) => v + 1),
      });
      managerRef.current = created;
      setManager(created);

      socket.on('rtc_peers', onPeers);
      socket.on('rtc_peer_joined', onPeerJoined);
      socket.on('rtc_peer_left', onPeerLeft);
      socket.on('rtc_signal', onSignal);
      socket.on('rtc_error', onRtcError);
      socket.emit('rtc_join', { roomName });
    })();

    return () => {
      disposed = true;
      socket.off('rtc_peers', onPeers);
      socket.off('rtc_peer_joined', onPeerJoined);
      socket.off('rtc_peer_left', onPeerLeft);
      socket.off('rtc_signal', onSignal);
      socket.off('rtc_error', onRtcError);
      socket.emit('rtc_leave');
      managerRef.current?.close();
      managerRef.current = null;
      setManager(null);
      cameraRef.current?.getTracks().forEach((t) => t.stop());
      screenRef.current?.getTracks().forEach((t) => t.stop());
      cameraRef.current = null;
      screenRef.current = null;
      setCameraStream(null);
      setScreenStream(null);
      setMedia(OFF);
      setJoined(false);
    };
  }, [enabled, roomName, selfId]);

  const ensureCameraStream = () => {
    if (!cameraRef.current) cameraRef.current = new MediaStream();
    return cameraRef.current;
  };

  const toggleTrack = useCallback(
    async (kind: 'video' | 'audio') => {
      setError(null);
      const stream = ensureCameraStream();
      const current = kind === 'video' ? stream.getVideoTracks() : stream.getAudioTracks();
      if (current.length) {
        current.forEach((track) => {
          track.stop();
          stream.removeTrack(track);
        });
        publish();
        return;
      }

      setBusy(true);
      try {
        const captured = await captureTrack(kind === 'video' ? 'camera' : 'mic', devicesRef.current);
        attachTrack(stream, captured, publish);
        publish();
      } catch (err) {
        setError(describeMediaError(err, kind === 'video' ? 'kamera' : 'mikrofon'));
      } finally {
        setBusy(false);
      }
    },
    [publish],
  );

  const setDevice = useCallback(
    async (kind: DeviceKind, deviceId: string | null) => {
      saveDevicePref(kind, deviceId);
      const next = { ...devicesRef.current, [kind]: deviceId };
      devicesRef.current = next;
      setDevices(next);

      // Cihaz şu an açıksa yenisiyle değiştir; bağlantılar yeni track'i kendiliğinden gönderir.
      const stream = cameraRef.current;
      const current = kind === 'camera' ? stream?.getVideoTracks() : stream?.getAudioTracks();
      if (!stream || !current?.length) return;
      setBusy(true);
      setError(null);
      try {
        const captured = await captureTrack(kind, next);
        current.forEach((track) => {
          track.onended = null;
          track.stop();
          stream.removeTrack(track);
        });
        attachTrack(stream, captured, publish);
        publish();
      } catch (err) {
        setError(describeMediaError(err, kind === 'camera' ? 'kamera' : 'mikrofon'));
      } finally {
        setBusy(false);
      }
    },
    [publish],
  );

  const toggleScreen = useCallback(async () => {
    setError(null);
    if (screenRef.current) {
      screenRef.current.getTracks().forEach((track) => track.stop());
      screenRef.current = null;
      publish();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Bu tarayıcı ekran paylaşımını desteklemiyor. Masaüstünde Chrome, Edge veya Firefox kullan.');
      return;
    }

    setBusy(true);
    try {
      // Ses isteğe bağlı: Chrome/Edge seçim penceresinde "sekme/sistem sesini paylaş" seçeneği çıkar.
      const options = { video: { frameRate: { ideal: 15 } }, audio: true, systemAudio: 'include' } as DisplayMediaStreamOptions;
      const stream = await navigator.mediaDevices.getDisplayMedia(options);
      // Tarayıcının kendi "Paylaşımı durdur" düğmesi
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (screenRef.current === stream) {
          screenRef.current = null;
          publish();
        }
      });
      screenRef.current = stream;
      publish();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'NotAllowedError')) {
        setError(describeMediaError(err, 'ekran'));
      }
    } finally {
      setBusy(false);
    }
  }, [publish]);

  return {
    joined,
    media,
    cameraStream,
    screenStream,
    remote: (userId: number) => manager?.getRemoteMedia(userId) ?? null,
    remoteIds: manager?.peerIds() ?? [],
    error,
    clearError: () => setError(null),
    toggleCamera: () => toggleTrack('video'),
    toggleMic: () => toggleTrack('audio'),
    toggleScreen,
    busy,
    devices,
    setDevice,
    screenHasAudio: Boolean(screenStream?.getAudioTracks().some((track) => track.readyState === 'live')),
  };
}

/** Seçili cihazdan tek track alır; cihaz artık bağlı değilse varsayılana düşer. */
async function captureTrack(kind: DeviceKind, prefs: DevicePrefs): Promise<MediaStreamTrack> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraintsFor(kind, prefs[kind]));
    return kind === 'camera' ? stream.getVideoTracks()[0] : stream.getAudioTracks()[0];
  } catch (err) {
    if (prefs[kind] && err instanceof DOMException && (err.name === 'OverconstrainedError' || err.name === 'NotFoundError')) {
      const stream = await navigator.mediaDevices.getUserMedia(constraintsFor(kind, null));
      return kind === 'camera' ? stream.getVideoTracks()[0] : stream.getAudioTracks()[0];
    }
    throw err;
  }
}

/** Track'i yerel stream'e ekler; cihaz çıkarılırsa (ended) stream'den düşer. */
function attachTrack(stream: MediaStream, track: MediaStreamTrack, publish: () => void) {
  track.onended = () => {
    stream.removeTrack(track);
    publish();
  };
  stream.addTrack(track);
}

function describeMediaError(err: unknown, device: string): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return `Tarayıcı ${device} iznini engelledi. Adres çubuğundaki izin simgesinden izin verip tekrar dene.`;
    if (err.name === 'NotFoundError') return `Bağlı bir ${device} bulunamadı.`;
    if (err.name === 'NotReadableError') return `${capitalize(device)} başka bir uygulama tarafından kullanılıyor.`;
  }
  if (!window.isSecureContext) return 'Kamera ve ekran paylaşımı yalnızca HTTPS veya localhost üzerinde çalışır.';
  return `${capitalize(device)} başlatılamadı.`;
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase('tr-TR') + value.slice(1);
}
