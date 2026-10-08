/**
 * P2P (mesh) WebRTC bağlantı yöneticisi.
 *
 * Odadaki her uzak kullanıcı için ayrı bir RTCPeerConnection açılır.
 * Müzakere "perfect negotiation" desenini izler: iki taraf aynı anda teklif
 * gönderirse "kibar" (polite) taraf geri çekilir, böylece çakışma olmaz.
 * Sinyal mesajları (SDP / ICE / meta) backend'deki Socket.IO gateway'i
 * üzerinden taşınır; medya doğrudan tarayıcılar arasında akar.
 */

export interface SignalData {
  description?: RTCSessionDescriptionInit | null;
  candidate?: RTCIceCandidateInit | null;
  /** Gönderenin ekran paylaşımı stream kimliği; kamera ile ekranı ayırt etmek için. */
  meta?: { screenStreamId: string | null };
}

/** Bağlantı kalitesi; `getStats()` ile birkaç saniyede bir ölçülür. */
export interface PeerQuality {
  level: 'good' | 'fair' | 'poor';
  /** Gidiş-dönüş gecikmesi (ms); ölçülemediyse null. */
  rttMs: number | null;
  /** Son ölçüm aralığındaki paket kaybı (%). */
  lossPct: number;
  /** Medya TURN sunucusu üzerinden aktarılıyor mu (doğrudan bağlanılamadı). */
  relayed: boolean;
}

export interface RemoteMedia {
  camera: MediaStream | null;
  screen: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  quality: PeerQuality | null;
}

const STATS_INTERVAL_MS = 5000;

/** Gecikme ve kayıptan kalite düzeyi; eşikler görüntülü görüşme için. */
export function qualityLevel(rttMs: number | null, lossPct: number, state: RTCPeerConnectionState): PeerQuality['level'] {
  if (state === 'failed' || state === 'disconnected') return 'poor';
  if ((rttMs ?? 0) > 400 || lossPct > 8) return 'poor';
  if ((rttMs ?? 0) > 250 || lossPct > 3) return 'fair';
  return 'good';
}

interface Peer {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  streams: Map<string, MediaStream>;
  remoteScreenStreamId: string | null;
  quality: PeerQuality | null;
  /** Kayıp oranını aralık bazında hesaplamak için önceki sayaçlar. */
  lastPackets: { received: number; lost: number } | null;
}

interface PeerManagerOptions {
  selfId: number;
  iceServers: RTCIceServer[];
  sendSignal: (targetUserId: number, data: SignalData) => void;
  onChange: () => void;
}

export class PeerManager {
  private peers = new Map<number, Peer>();
  private cameraStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private readonly opts: PeerManagerOptions;
  private closed = false;
  private statsTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: PeerManagerOptions) {
    this.opts = opts;
    this.statsTimer = setInterval(() => void this.collectStats(), STATS_INTERVAL_MS);
  }

  /** Uzak kullanıcı için bağlantı oluşturur (zaten varsa dokunmaz). */
  ensurePeer(userId: number): Peer {
    const existing = this.peers.get(userId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: this.opts.iceServers });
    const peer: Peer = {
      pc,
      // Kimliği küçük olan taraf kibar davranır; iki tarafta da aynı sonucu verir.
      polite: this.opts.selfId < userId,
      makingOffer: false,
      ignoreOffer: false,
      streams: new Map(),
      remoteScreenStreamId: null,
      quality: null,
      lastPackets: null,
    };
    this.peers.set(userId, peer);

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        this.opts.sendSignal(userId, { description: pc.localDescription?.toJSON() });
      } catch (error) {
        console.warn('[rtc] teklif oluşturulamadı', error);
      } finally {
        peer.makingOffer = false;
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.opts.sendSignal(userId, { candidate: candidate.toJSON() });
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    pc.onconnectionstatechange = () => this.opts.onChange();

    pc.ontrack = ({ track, streams }) => {
      const stream = streams[0] ?? new MediaStream([track]);
      peer.streams.set(stream.id, stream);
      const refresh = () => this.opts.onChange();
      track.onunmute = refresh;
      track.onmute = refresh;
      track.onended = refresh;
      stream.onremovetrack = () => {
        if (stream.getTracks().length === 0) peer.streams.delete(stream.id);
        refresh();
      };
      refresh();
    };

    this.syncSenders(peer);
    this.opts.sendSignal(userId, { meta: { screenStreamId: this.screenStream?.id ?? null } });
    this.opts.onChange();
    return peer;
  }

  async handleSignal(fromUserId: number, data: SignalData) {
    if (this.closed) return;
    const peer = this.ensurePeer(fromUserId);
    const { pc } = peer;

    if (data.meta) {
      peer.remoteScreenStreamId = data.meta.screenStreamId;
      this.opts.onChange();
      return;
    }

    try {
      if (data.description) {
        const offerCollision = data.description.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
        peer.ignoreOffer = !peer.polite && offerCollision;
        if (peer.ignoreOffer) return;

        await pc.setRemoteDescription(data.description);
        if (data.description.type === 'offer') {
          await pc.setLocalDescription();
          this.opts.sendSignal(fromUserId, { description: pc.localDescription?.toJSON() });
        }
      } else if (data.candidate) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (error) {
          if (!peer.ignoreOffer) throw error;
        }
      }
    } catch (error) {
      console.warn('[rtc] sinyal işlenemedi', error);
    }
  }

  removePeer(userId: number) {
    const peer = this.peers.get(userId);
    if (!peer) return;
    peer.pc.close();
    this.peers.delete(userId);
    this.opts.onChange();
  }

  /** Yerel kamera/mikrofon ve ekran stream'lerini tüm bağlantılara yansıtır. */
  setLocalStreams(camera: MediaStream | null, screen: MediaStream | null) {
    const screenChanged = (this.screenStream?.id ?? null) !== (screen?.id ?? null);
    this.cameraStream = camera;
    this.screenStream = screen;
    for (const [userId, peer] of this.peers) {
      if (screenChanged) {
        this.opts.sendSignal(userId, { meta: { screenStreamId: screen?.id ?? null } });
      }
      this.syncSenders(peer);
    }
  }

  getRemoteMedia(userId: number): RemoteMedia | null {
    const peer = this.peers.get(userId);
    if (!peer) return null;

    let camera: MediaStream | null = null;
    let screen: MediaStream | null = null;
    for (const stream of peer.streams.values()) {
      // removeTrack sonrası uzak track "muted" kalır; medya akmayan stream'i gösterme.
      const live = stream.getTracks().some((track) => track.readyState === 'live' && !track.muted);
      if (!live) continue;
      if (stream.id === peer.remoteScreenStreamId) screen = stream;
      else camera = stream;
    }
    return { camera, screen, connectionState: peer.pc.connectionState, quality: peer.quality };
  }

  peerIds(): number[] {
    return Array.from(this.peers.keys());
  }

  close() {
    this.closed = true;
    if (this.statsTimer) clearInterval(this.statsTimer);
    for (const peer of this.peers.values()) peer.pc.close();
    this.peers.clear();
  }

  /** Her bağlantının seçili aday çiftinden gecikmeyi, gelen RTP'den kaybı okur. */
  private async collectStats() {
    let changed = false;
    for (const peer of this.peers.values()) {
      if (peer.pc.connectionState === 'new' || peer.pc.connectionState === 'closed') continue;
      try {
        const report = await peer.pc.getStats();
        let pair: RTCIceCandidatePairStats | undefined;
        let received = 0;
        let lost = 0;
        report.forEach((stat) => {
          if (stat.type === 'transport' && (stat as RTCTransportStats).selectedCandidatePairId) {
            pair = report.get((stat as RTCTransportStats).selectedCandidatePairId!) as RTCIceCandidatePairStats;
          }
          if (stat.type === 'inbound-rtp') {
            received += (stat as RTCInboundRtpStreamStats).packetsReceived ?? 0;
            lost += (stat as RTCInboundRtpStreamStats).packetsLost ?? 0;
          }
        });
        // Firefox "transport" vermez; seçili çift "nominated + succeeded" olandır.
        if (!pair) {
          report.forEach((stat) => {
            const candidate = stat as RTCIceCandidatePairStats;
            if (stat.type === 'candidate-pair' && candidate.nominated && candidate.state === 'succeeded') pair = candidate;
          });
        }

        const rttMs = pair?.currentRoundTripTime != null ? Math.round(pair.currentRoundTripTime * 1000) : null;
        const local = pair ? (report.get(pair.localCandidateId) as { candidateType?: string } | undefined) : undefined;
        const remote = pair ? (report.get(pair.remoteCandidateId) as { candidateType?: string } | undefined) : undefined;
        const relayed = local?.candidateType === 'relay' || remote?.candidateType === 'relay';

        const previous = peer.lastPackets;
        const deltaReceived = previous ? received - previous.received : 0;
        const deltaLost = previous ? Math.max(0, lost - previous.lost) : 0;
        const lossPct = deltaReceived + deltaLost > 0 ? Math.round((deltaLost / (deltaReceived + deltaLost)) * 1000) / 10 : 0;
        peer.lastPackets = { received, lost };

        const quality: PeerQuality = { level: qualityLevel(rttMs, lossPct, peer.pc.connectionState), rttMs, lossPct, relayed };
        if (
          !peer.quality ||
          peer.quality.level !== quality.level ||
          peer.quality.relayed !== quality.relayed ||
          Math.abs((peer.quality.rttMs ?? 0) - (quality.rttMs ?? 0)) > 50
        ) {
          changed = true;
        }
        peer.quality = quality;
      } catch {
        // Bağlantı kapanırken getStats hata verebilir; bir sonraki ölçümde yeniden denenir.
      }
    }
    if (changed && !this.closed) this.opts.onChange();
  }

  private syncSenders(peer: Peer) {
    const desired = new Map<MediaStreamTrack, MediaStream>();
    this.cameraStream?.getTracks().forEach((track) => desired.set(track, this.cameraStream!));
    this.screenStream?.getTracks().forEach((track) => desired.set(track, this.screenStream!));

    for (const sender of peer.pc.getSenders()) {
      if (!sender.track) continue;
      if (desired.has(sender.track)) desired.delete(sender.track);
      else peer.pc.removeTrack(sender);
    }
    for (const [track, stream] of desired) {
      peer.pc.addTrack(track, stream);
    }
  }
}
