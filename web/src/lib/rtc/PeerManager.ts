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

export interface RemoteMedia {
  camera: MediaStream | null;
  screen: MediaStream | null;
  connectionState: RTCPeerConnectionState;
}

interface Peer {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  streams: Map<string, MediaStream>;
  remoteScreenStreamId: string | null;
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

  constructor(opts: PeerManagerOptions) {
    this.opts = opts;
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
    return { camera, screen, connectionState: peer.pc.connectionState };
  }

  peerIds(): number[] {
    return Array.from(this.peers.keys());
  }

  close() {
    this.closed = true;
    for (const peer of this.peers.values()) peer.pc.close();
    this.peers.clear();
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
