import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PeerManager } from './PeerManager';

class FakePc {
  static instances: FakePc[] = [];
  connectionState = 'new';
  signalingState = 'stable';
  closed = false;
  onnegotiationneeded: unknown;
  onicecandidate: unknown;
  oniceconnectionstatechange: unknown;
  onconnectionstatechange: unknown;
  ontrack: unknown;
  constructor() {
    FakePc.instances.push(this);
  }
  getSenders() {
    return [];
  }
  addTrack() {}
  removeTrack() {}
  close() {
    this.closed = true;
  }
  async setRemoteDescription() {}
  async setLocalDescription() {}
  async addIceCandidate() {}
  localDescription = { toJSON: () => ({ type: 'answer', sdp: '' }) };
}

describe('PeerManager', () => {
  beforeEach(() => {
    FakePc.instances = [];
    vi.stubGlobal('RTCPeerConnection', FakePc);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const make = () => new PeerManager({ selfId: 1, iceServers: [], sendSignal: vi.fn(), onChange: vi.fn() });

  it('tanınmayan kişiden gelen aday ya da yanıt hayalet bağlantı açmaz', async () => {
    const manager = make();
    await manager.handleSignal(9, { candidate: { candidate: 'x' } });
    await manager.handleSignal(9, { description: { type: 'answer', sdp: '' } });
    expect(manager.peerIds()).toEqual([]);
    manager.close();
  });

  it('tanınmayan kişiden gelen teklif bağlantı açar', async () => {
    const manager = make();
    await manager.handleSignal(9, { description: { type: 'offer', sdp: '' } });
    expect(manager.peerIds()).toEqual([9]);
    manager.close();
  });

  it('resetPeer eski bağlantıyı kapatıp yenisini kurar', () => {
    const manager = make();
    manager.ensurePeer(5);
    manager.resetPeer(5);
    expect(FakePc.instances).toHaveLength(2);
    expect(FakePc.instances[0].closed).toBe(true);
    expect(manager.peerIds()).toEqual([5]);
    manager.close();
  });
});
