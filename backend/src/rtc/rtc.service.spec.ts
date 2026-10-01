import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RtcService } from './rtc.service';

describe('RtcService', () => {
  let service: RtcService;
  let config: Record<string, string | undefined>;

  beforeEach(() => {
    config = {};
    service = new RtcService({
      get: (key: string) => config[key],
    } as unknown as ConfigService);
  });

  it('rejects joining a room that does not allow video', () => {
    expect(() => service.join('Quiet', 1, 's1', false)).toThrow(
      ForbiddenException,
    );
  });

  it('returns existing peers when joining', () => {
    service.join('Cam', 1, 's1', true);
    const { peers } = service.join('Cam', 2, 's2', true);

    expect(peers.map((p) => p.userId)).toEqual([1]);
  });

  it('only relays signals between users in the same room', () => {
    service.join('Cam', 1, 's1', true);
    service.join('Cam', 2, 's2', true);
    service.join('Other', 3, 's3', true);

    expect(service.resolveSignalTarget(1, 2)).toBe('s2');
    expect(service.resolveSignalTarget(1, 3)).toBeNull();
    expect(service.resolveSignalTarget(4, 1)).toBeNull();
    expect(service.resolveSignalTarget(1, 1)).toBeNull();
  });

  it('moves a user out of the previous room on rejoin elsewhere', () => {
    service.join('Cam', 1, 's1', true);
    const { previousRoom } = service.join('Other', 1, 's1', true);

    expect(previousRoom).toBe('Cam');
    expect(service.getRoomOf(1)).toBe('Other');
  });

  it('ignores disconnects from a socket that is not in the call', () => {
    service.join('Cam', 1, 's1', true);

    expect(service.leaveBySocket(1, 'other-tab')).toBeNull();
    expect(service.leaveBySocket(1, 's1')).toBe('Cam');
    expect(service.getRoomOf(1)).toBeNull();
  });

  it('tracks media state per participant', () => {
    service.join('Cam', 1, 's1', true);
    service.updateMedia(1, { camera: true });

    expect(service.getMedia(1)).toEqual({
      camera: true,
      mic: false,
      screen: false,
    });
    expect(service.updateMedia(2, { camera: true })).toBeNull();
  });

  it('adds TURN servers from config', () => {
    config.TURN_URL = 'turn:a.example:3478, turns:a.example:5349';
    config.TURN_USERNAME = 'u';
    config.TURN_CREDENTIAL = 'p';

    const servers = service.getIceServers();
    expect(servers).toHaveLength(2);
    expect(servers[1]).toEqual({
      urls: ['turn:a.example:3478', 'turns:a.example:5349'],
      username: 'u',
      credential: 'p',
    });
  });
});
