import { ForbiddenException, INestApplication, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import { LobbiesService } from '../src/lobbies/lobbies.service';
import { MessagesService } from '../src/messages/messages.service';
import { ModerationService } from '../src/moderation/moderation.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { RoomTimerService } from '../src/room-timer/room-timer.service';
import { RealtimeService } from '../src/realtime/realtime.service';
import { RtcService } from '../src/rtc/rtc.service';
import { SensorsGateway } from '../src/sensors.gateway';
import { StudyService } from '../src/study/study.service';
import { UsersService } from '../src/users/users.service';
import { WhiteboardService } from '../src/whiteboard/whiteboard.service';

/**
 * Gerçek SensorsGateway, gerçek socket.io bağlantılarıyla. Veritabanına dayanan servisler
 * bellek içi sahtelerle değiştirilir; RTC, tahta ve sayaç servisleri gerçektir.
 */

jest.mock('expo-server-sdk', () => ({
  Expo: class {
    static isExpoPushToken() {
      return false;
    }
  },
}));

const SECRET = 'gateway-test-secret';

type FakeLobby = { id: number; name: string; maxUsers: number; isPrivate: boolean; allowVideo: boolean; isPremiumOnly: boolean; ownerId: number };

class FakeLobbies {
  lobbies = new Map<string, FakeLobby>();
  allowed = new Set<string>();
  kicked = new Set<string>();

  add(lobby: Partial<FakeLobby> & { name: string }) {
    const full: FakeLobby = { id: this.lobbies.size + 1, maxUsers: 10, isPrivate: false, allowVideo: false, isPremiumOnly: false, ownerId: 1, ...lobby };
    this.lobbies.set(full.name, full);
    return full;
  }

  findByName(name: string) {
    return Promise.resolve(this.lobbies.get(name) ?? null);
  }

  assertUserCanEnter(name: string, userId: number) {
    const lobby = this.lobbies.get(name);
    if (!lobby) throw new UnauthorizedException('Lobi bulunamadi.');
    if (lobby.isPrivate && lobby.ownerId !== userId && !this.allowed.has(`${name}:${userId}`)) {
      throw new UnauthorizedException('Bu oda şifreli. Önce şifreyi gir.');
    }
    if (this.kicked.has(`${name}:${userId}`)) throw new ForbiddenException('Bu odadan cikarildin.');
    return Promise.resolve(lobby);
  }

  findOwnedLobby(where: { name: string }, userId: number) {
    const lobby = this.lobbies.get(where.name);
    if (!lobby || lobby.ownerId !== userId) throw new ForbiddenException('Bu islemi yalnizca oda sahibi yapabilir.');
    return Promise.resolve(lobby);
  }

  async kick(name: string, ownerId: number, targetId: number) {
    await this.findOwnedLobby({ name }, ownerId);
    this.kicked.add(`${name}:${targetId}`);
  }

  async setLocked(name: string, ownerId: number) {
    return this.findOwnedLobby({ name }, ownerId);
  }

  async close(name: string, ownerId: number) {
    await this.findOwnedLobby({ name }, ownerId);
    this.lobbies.delete(name);
  }

  updateActiveUsers() {
    return Promise.resolve();
  }
}

class FakeModeration {
  muted = new Set<number>();
  blocks = new Set<string>();
  banned = new Set<number>();

  assertCanChat(userId: number) {
    if (this.muted.has(userId)) throw new ForbiddenException('Mesaj gönderme yetkin kapatıldı.');
    return Promise.resolve();
  }
  isBlockedEitherWay(a: number, b: number) {
    return Promise.resolve(this.blocks.has(`${a}:${b}`) || this.blocks.has(`${b}:${a}`));
  }
  async assertNotBlocked(a: number, b: number, message = 'Etkileşim kapalı.') {
    if (await this.isBlockedEitherWay(a, b)) throw new ForbiddenException(message);
  }
  isBanned(userId: number) {
    return Promise.resolve(this.banned.has(userId));
  }
}

type FakeUser = { id: number; fullName: string; username: string; coins: number; isPremium: boolean; tokenVersion?: number };
const users = new Map<number, FakeUser>([
  [1, { id: 1, fullName: 'Ayşe', username: 'ayse', coins: 100, isPremium: true }],
  [2, { id: 2, fullName: 'Bora', username: 'bora', coins: 100, isPremium: false }],
  [3, { id: 3, fullName: 'Cem', username: 'cem', coins: 5, isPremium: false }],
]);
const friendPairs = new Set<string>();

const fakeUsers = {
  findById: (id: number) => Promise.resolve(users.get(id) ?? null),
  setOnlineStatus: jest.fn(() => Promise.resolve()),
  friendshipStatus: (a: number, b: number) =>
    Promise.resolve({ status: friendPairs.has(`${a}:${b}`) || friendPairs.has(`${b}:${a}`) ? 'friends' : 'none' }),
  touchLastSeen: () => Promise.resolve(),
  addFocusTime: jest.fn(() => Promise.resolve({ totalFocusMinutes: 10, newBadges: [] })),
  awardBadge: jest.fn(() => Promise.resolve(false)),
  getUserPushTokens: jest.fn(() => Promise.resolve([] as string[])),
  getFriendsPushTokens: jest.fn(() => Promise.resolve([] as string[])),
};

const fakeMessages = {
  createMessage: jest.fn((text: string, roomName: string, userId: number) => Promise.resolve({ id: 1, text, roomName, user: { id: userId }, createdAt: new Date() })),
  findOwnFileMessage: jest.fn((userId: number, roomName: string, fileUrl: string) =>
    Promise.resolve(fileUrl.includes('yok') ? null : { id: 77, type: 'image', roomName, fileUrl, user: { id: userId } }),
  ),
  createDirectMessage: jest.fn(() => Promise.resolve({ id: 1, createdAt: new Date() })),
};

const fakeStudy = {
  recordSession: jest.fn(() => Promise.resolve(null)),
  subjectMinutes: () => Promise.resolve(0),
};

describe('SensorsGateway (socket.io)', () => {
  let app: INestApplication;
  let url: string;
  let jwt: JwtService;
  let lobbies: FakeLobbies;
  let moderation: FakeModeration;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    lobbies = new FakeLobbies();
    moderation = new FakeModeration();
    const config = { get: (key: string, fallback?: unknown) => (key === 'JWT_SECRET' ? SECRET : fallback) };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: SECRET })],
      providers: [
        SensorsGateway,
        RtcService,
        WhiteboardService,
        RoomTimerService,
        RealtimeService,
        { provide: ConfigService, useValue: config },
        { provide: UsersService, useValue: fakeUsers },
        { provide: LobbiesService, useValue: lobbies },
        { provide: MessagesService, useValue: fakeMessages },
        { provide: ModerationService, useValue: moderation },
        { provide: StudyService, useValue: fakeStudy },
        { provide: NotificationsService, useValue: { sendNotification: () => Promise.resolve() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.listen(0, '127.0.0.1');
    const { port } = (app.getHttpServer() as HttpServer).address() as AddressInfo;
    url = `http://127.0.0.1:${port}`;
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => {
    sockets.splice(0).forEach((socket) => socket.close());
    lobbies.lobbies.clear();
    lobbies.allowed.clear();
    lobbies.kicked.clear();
    moderation.muted.clear();
    moderation.blocks.clear();
    moderation.banned.clear();
    friendPairs.clear();
    users.forEach((user) => delete user.tokenVersion);
    jest.clearAllMocks();
    fakeUsers.getFriendsPushTokens.mockResolvedValue([]);
  });

  afterAll(async () => {
    await app.close();
  });

  const tokenFor = (userId: number, tv?: number) => jwt.sign({ sub: userId, email: `${userId}@test.dev`, username: users.get(userId)?.username ?? 'x', ...(tv === undefined ? {} : { tv }) });

  /** Bağlanır; bağlantı reddedilirse `disconnected` true olur. */
  const connect = (userId: number | null, tv?: number) =>
    new Promise<Socket>((resolve) => {
      const socket = io(url, { auth: userId ? { token: tokenFor(userId, tv) } : {}, transports: ['websocket'], reconnection: false, forceNew: true });
      sockets.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', () => resolve(socket));
    });

  /** Event'i bekler; gelmezse `null` döner (gelmemesi gereken durumlar için). */
  const next = <T = Record<string, unknown>>(socket: Socket, event: string, timeout = 800) =>
    new Promise<T | null>((resolve) => {
      const timer = setTimeout(() => {
        socket.off(event, handler);
        resolve(null);
      }, timeout);
      const handler = (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      };
      socket.once(event, handler);
    });

  const join = async (socket: Socket, roomName: string) => {
    const users = next<unknown[]>(socket, 'room_users');
    socket.emit('join_lobby', { roomName });
    return users;
  };

  const waitDisconnect = (socket: Socket) => new Promise<boolean>((resolve) => {
    if (socket.disconnected) return resolve(true);
    const timer = setTimeout(() => resolve(socket.disconnected), 1000);
    socket.once('disconnect', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });

  describe('bağlantı', () => {
    it('token olmadan bağlantıyı kapatır', async () => {
      const socket = await connect(null);
      expect(await waitDisconnect(socket)).toBe(true);
    });

    it('askıya alınmış hesabın bağlantısını kapatır', async () => {
      moderation.banned.add(2);
      const socket = await connect(2);
      expect(await waitDisconnect(socket)).toBe(true);
    });

    it('şifre değişimiyle iptal edilen (eski sürümlü) token ile bağlantıyı kapatır', async () => {
      users.get(2)!.tokenVersion = 1;
      expect(await waitDisconnect(await connect(2))).toBe(true);
      expect(await waitDisconnect(await connect(2, 0))).toBe(true);
      const ok = await connect(2, 1);
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(ok.connected).toBe(true);
    });

    it('yasaklama sonrası canlı bağlantı force_logout ile kopar', async () => {
      const realtime = app.get(RealtimeService);
      const socket = await connect(2);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const logout = next<{ reason: string }>(socket, 'force_logout');
      realtime.disconnectUser(2, 'Hesabın askıya alındı.');
      expect(await logout).toEqual({ reason: 'Hesabın askıya alındı.' });
      expect(await waitDisconnect(socket)).toBe(true);
    });
  });

  describe('odaya girme', () => {
    it('odadakileri listeler ve dolu odaya girişi reddeder', async () => {
      lobbies.add({ name: 'Kütüphane', maxUsers: 1 });
      const a = await connect(1);
      const b = await connect(2);

      expect(await join(a, 'Kütüphane')).toHaveLength(1);
      const full = next<{ message: string }>(b, 'room_full');
      b.emit('join_lobby', { roomName: 'Kütüphane' });
      expect(await full).toMatchObject({ message: expect.stringContaining('kapasite') });
    });

    it('şifresi doğrulanmamış şifreli odaya girişi reddeder', async () => {
      lobbies.add({ name: 'Gizli', isPrivate: true, ownerId: 1 });
      const b = await connect(2);
      const error = next<{ message: string }>(b, 'join_lobby_error');
      b.emit('join_lobby', { roomName: 'Gizli' });
      expect((await error)?.message).toMatch(/şifre/i);

      lobbies.allowed.add('Gizli:2');
      expect(await join(b, 'Gizli')).toHaveLength(1);
    });
  });

  describe('sohbet', () => {
    it('mesajı yalnızca katılınan odaya yayınlar', async () => {
      lobbies.add({ name: 'Oda' });
      const a = await connect(1);
      const b = await connect(2);
      await join(a, 'Oda');
      await join(b, 'Oda');

      const received = next<{ text: string; userId: number }>(b, 'receive_message');
      a.emit('send_message', { roomName: 'Oda', text: 'merhaba' });
      expect(await received).toMatchObject({ text: 'merhaba', userId: 1 });
    });

    it('katılmadığı odaya yazmayı reddeder', async () => {
      lobbies.add({ name: 'Oda' });
      lobbies.add({ name: 'Başka' });
      const a = await connect(1);
      await join(a, 'Oda');

      const error = next<{ message: string }>(a, 'error');
      a.emit('send_message', { roomName: 'Başka', text: 'sızma' });
      expect((await error)?.message).toMatch(/önce odaya katılmalısın/);
      expect(fakeMessages.createMessage).not.toHaveBeenCalled();
    });

    it('susturulan kullanıcının mesajını reddeder', async () => {
      lobbies.add({ name: 'Oda' });
      moderation.muted.add(2);
      const b = await connect(2);
      await join(b, 'Oda');

      const error = next<{ message: string }>(b, 'error');
      b.emit('send_message', { roomName: 'Oda', text: 'x' });
      expect((await error)?.message).toMatch(/kapatıldı/);
    });

    it('engellenmiş kişiye DM göndermeyi reddeder', async () => {
      moderation.blocks.add('2:1');
      const a = await connect(1);
      const error = next<{ message: string }>(a, 'error');
      a.emit('send_dm', { targetUserId: 2, text: 'selam' });
      expect((await error)?.message).toMatch(/mesaj gönderemezsin/);
      expect(fakeMessages.createDirectMessage).not.toHaveBeenCalled();
    });
  });

  describe('sohbet güvenliği', () => {
    const setupRoom = async () => {
      lobbies.add({ name: 'Oda' });
      const a = await connect(1);
      const b = await connect(2);
      await join(a, 'Oda');
      await join(b, 'Oda');
      return { a, b };
    };

    it('yabancı bir adresten gelen fileUrl ve geçersiz type reddedilir', async () => {
      const { a, b } = await setupRoom();
      for (const bad of [
        { text: 'x', type: 'image', fileUrl: 'https://evil.example/x.png' },
        { text: 'x', type: 'image', fileUrl: '/uploads/../etc' },
        { text: 'x', type: 'script' },
        { text: 'x', type: 'text', fileUrl: '/uploads/ab12.png' },
      ]) {
        const error = next(a, 'error');
        a.emit('send_message', { roomName: 'Oda', ...bad });
        expect(await error).not.toBeNull();
      }
      expect(await next(b, 'receive_message', 300)).toBeNull();

      const received = next<{ fileUrl: string; type: string }>(b, 'receive_message');
      a.emit('send_message', { roomName: 'Oda', text: 'ders.png', type: 'image', fileUrl: '/uploads/file-ab12.png' });
      expect(await received).toMatchObject({ id: 77, fileUrl: '/uploads/file-ab12.png', type: 'image' });

      const missing = next<{ message: string }>(a, 'error');
      a.emit('send_message', { roomName: 'Oda', text: 'x.png', type: 'image', fileUrl: '/uploads/yok-1.png' });
      expect((await missing)?.message).toMatch(/Dosya bulunamadı/);
    });

    it('bozuk JSON gövdesi soketi düşürmez', async () => {
      const { a } = await setupRoom();
      const error = next(a, 'error');
      a.emit('send_message', '{bozuk json');
      expect(await error).not.toBeNull();
      expect(a.connected).toBe(true);
    });

    it('socket başına hız sınırı ani mesaj yağmurunu keser', async () => {
      const { a, b } = await setupRoom();
      let limited = 0;
      a.on('error', (payload: { message: string }) => {
        if (/yavaşla/.test(payload.message)) limited += 1;
      });
      let delivered = 0;
      b.on('receive_message', () => (delivered += 1));
      for (let i = 0; i < 25; i += 1) a.emit('send_message', { roomName: 'Oda', text: `m${i}` });
      await new Promise((resolve) => setTimeout(resolve, 600));
      expect(limited).toBeGreaterThan(0);
      expect(delivered).toBeLessThan(25);
    });

    it('DM ack ile sonucu bildirir; boş, uzun ve geçersiz dosya reddedilir', async () => {
      const a = await connect(1);
      const ack = (payload: unknown) => a.emitWithAck('send_dm', payload) as Promise<{ ok: boolean; error?: string; message?: { text: string } }>;

      const ok = await ack({ targetUserId: 2, text: '  selam  ' });
      expect(ok).toMatchObject({ ok: true, message: { text: 'selam' } });
      expect(fakeMessages.createDirectMessage).toHaveBeenCalledWith(1, 2, 'selam', 'text', undefined);

      expect((await ack({ targetUserId: 2, text: '   ' })).ok).toBe(false);
      expect((await ack({ targetUserId: 2, text: 'x'.repeat(2001) })).ok).toBe(false);
      expect((await ack({ targetUserId: 2, text: 'x', type: 'image', fileUrl: 'https://evil.example/a.png' })).ok).toBe(false);
      expect((await ack({ targetUserId: 99, text: 'x' })).error).toMatch(/bulunamadı/);
      expect(fakeMessages.createDirectMessage).toHaveBeenCalledTimes(1);

      moderation.blocks.add('2:1');
      expect(await ack({ targetUserId: 2, text: 'x' })).toMatchObject({ ok: false, error: expect.stringMatching(/gönderemezsin/) });
    });

    it('DM hız sınırı ack hatası döner', async () => {
      const a = await connect(1);
      const results = await Promise.all(
        Array.from({ length: 20 }, () => a.emitWithAck('send_dm', { targetUserId: 2, text: 'x' }) as Promise<{ ok: boolean; error?: string }>),
      );
      expect(results.some((r) => !r.ok && /yavaşla/.test(r.error ?? ''))).toBe(true);
    });

    it('dürtme yalnızca arkadaşa gider; aynı odadakine ve sık sık gitmez', async () => {
      lobbies.add({ name: 'Oda' });
      lobbies.add({ name: 'Diğer' });
      const a = await connect(1);
      const b = await connect(2);
      await join(a, 'Oda');
      await join(b, 'Diğer');

      const notFriend = next<{ message: string }>(a, 'error');
      a.emit('nudge_friend', { targetUserId: 2, roomName: 'Sahte' });
      expect((await notFriend)?.message).toMatch(/arkadaşlarını/);

      friendPairs.add('1:2');
      const nudge = next<{ roomName: string }>(b, 'nudge_received');
      a.emit('nudge_friend', { targetUserId: 2, roomName: 'Sahte' });
      expect((await nudge)?.roomName).toBe('Oda');

      const again = next<{ message: string }>(a, 'error');
      a.emit('nudge_friend', { targetUserId: 2 });
      expect((await again)?.message).toMatch(/bekle/);
    });
  });

  describe('ortak sayaç ve tahta kontrolü', () => {
    it('sayacı yalnızca başlatan ya da oda sahibi bitirebilir', async () => {
      lobbies.add({ name: 'Ortak', ownerId: 1 });
      const owner = await connect(1);
      const starter = await connect(2);
      const other = await connect(3);
      await join(owner, 'Ortak');
      await join(starter, 'Ortak');
      await join(other, 'Ortak');

      starter.emit('room_timer_start', { focusMinutes: 25, breakMinutes: 5 });
      await next(other, 'room_timer');

      const denied = next<{ message: string }>(other, 'room_timer_error');
      other.emit('room_timer_stop');
      expect((await denied)?.message).toMatch(/yalnızca başlatan kişi ya da oda sahibi/);

      const stopped = next<{ action: string }>(other, 'room_timer');
      owner.emit('room_timer_stop');
      expect((await stopped)?.action).toBe('stop');

      starter.emit('room_timer_start', { focusMinutes: 25, breakMinutes: 5 });
      await next(other, 'room_timer');
      const byStarter = next<{ action: string }>(other, 'room_timer');
      starter.emit('room_timer_stop');
      expect((await byStarter)?.action).toBe('stop');
    });

    it('tahtayı yalnızca açan ya da oda sahibi kapatabilir', async () => {
      lobbies.add({ name: 'Ortak', ownerId: 1 });
      const owner = await connect(1);
      const opener = await connect(2);
      const other = await connect(3);
      await join(owner, 'Ortak');
      await join(opener, 'Ortak');
      await join(other, 'Ortak');

      opener.emit('board_open', { blank: true });
      await next(other, 'board_state');

      const denied = next<{ message: string }>(other, 'board_error');
      other.emit('board_close');
      expect((await denied)?.message).toMatch(/yalnızca başlatan kişi ya da oda sahibi/);

      const closed = next<{ board: unknown }>(other, 'board_state');
      owner.emit('board_close');
      expect((await closed)?.board).toBeNull();
    });
  });

  describe('görüntülü arama (rtc)', () => {
    it('sinyali yalnızca aynı aramadaki kişiye iletir', async () => {
      lobbies.add({ name: 'Kamera', allowVideo: true });
      lobbies.add({ name: 'Diğer' });
      const a = await connect(1);
      const b = await connect(2);
      const c = await connect(3);
      await join(a, 'Kamera');
      await join(b, 'Kamera');
      await join(c, 'Diğer');

      const peersA = next(a, 'rtc_peers');
      a.emit('rtc_join', { roomName: 'Kamera' });
      await peersA;
      const peersB = next(b, 'rtc_peers');
      b.emit('rtc_join', { roomName: 'Kamera' });
      await peersB;

      const signal = next<{ fromUserId: number; data: unknown }>(b, 'rtc_signal');
      a.emit('rtc_signal', { targetUserId: 2, data: { sdp: 'teklif' } });
      expect(await signal).toEqual({ fromUserId: 1, data: { sdp: 'teklif' } });

      // Aramada olmayan Cem, A'ya sinyal gönderemez.
      const leaked = next(a, 'rtc_signal', 400);
      c.emit('rtc_signal', { targetUserId: 1, data: { sdp: 'saldırı' } });
      expect(await leaked).toBeNull();
    });

    it('aynı kişi yeni soketle katılınca eski soket için rtc_peer_left yayılır', async () => {
      lobbies.add({ name: 'Kamera', allowVideo: true });
      const a = await connect(1);
      const b = await connect(2);
      const a2 = await connect(1);
      await join(a, 'Kamera');
      await join(b, 'Kamera');
      await join(a2, 'Kamera');
      const first = next(a, 'rtc_peers');
      a.emit('rtc_join', { roomName: 'Kamera' });
      await first;
      const second = next(b, 'rtc_peers');
      b.emit('rtc_join', { roomName: 'Kamera' });
      await second;

      const left = next<{ userId: number }>(b, 'rtc_peer_left');
      a2.emit('rtc_join', { roomName: 'Kamera' });
      expect(await left).toEqual({ userId: 1 });
    });

    it('kamerasız odada aramaya katılmayı reddeder', async () => {
      lobbies.add({ name: 'Sessiz', allowVideo: false });
      const a = await connect(1);
      await join(a, 'Sessiz');
      const error = next<{ message: string }>(a, 'rtc_error');
      a.emit('rtc_join', { roomName: 'Sessiz' });
      expect(await error).not.toBeNull();
    });
  });

  describe('oda sahibi', () => {
    it('sahibi olmayan kişi kimseyi çıkaramaz; sahip çıkarınca kişiye bildirilir', async () => {
      lobbies.add({ name: 'Sahipli', ownerId: 1 });
      const a = await connect(1);
      const b = await connect(2);
      await join(a, 'Sahipli');
      await join(b, 'Sahipli');

      const denied = next<{ message: string }>(b, 'error');
      b.emit('kick_user', { targetUserId: 1 });
      expect((await denied)?.message).toMatch(/oda sahibi/);

      const kicked = next<{ message: string }>(b, 'kicked');
      a.emit('kick_user', { targetUserId: 2 });
      expect((await kicked)?.message).toMatch(/çıkardı/);

      const rejoin = next<{ message: string }>(b, 'join_lobby_error');
      b.emit('join_lobby', { roomName: 'Sahipli' });
      expect((await rejoin)?.message).toMatch(/cikarildin/);
    });

    it('odayı kapatınca herkese bildirir', async () => {
      lobbies.add({ name: 'Kapanacak', ownerId: 1 });
      const a = await connect(1);
      const b = await connect(2);
      await join(a, 'Kapanacak');
      await join(b, 'Kapanacak');

      const closed = next<{ roomName: string }>(b, 'lobby_closed');
      a.emit('close_lobby');
      expect(await closed).toMatchObject({ roomName: 'Kapanacak' });
      expect(lobbies.lobbies.has('Kapanacak')).toBe(false);
    });
  });

  describe('odak', () => {
    const tick = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
    type Sessions = Map<string, { startedAt: number }>;
    const sessionsOf = () => (app.get(SensorsGateway) as unknown as { activeSessions: Sessions }).activeSessions;

    it('masadan kalkınca oturumu kaydeder; tekrar gelen "masadayım" başlangıcı sıfırlamaz', async () => {
      lobbies.add({ name: 'Odak' });
      const a = await connect(1);
      await join(a, 'Odak');
      const sessions = sessionsOf();

      a.emit('update_presence', { isAtDesk: true, roomName: 'Odak', source: 'web' });
      await tick();
      expect(sessions.get(a.id!)?.startedAt).toBeDefined();

      // Odak 2 dakika önce başlamış gibi davran, sonra tekrar "masadayım" gönder.
      sessions.get(a.id!)!.startedAt = Date.now() - 2 * 60_000;
      const twoMinutesAgo = sessions.get(a.id!)!.startedAt;
      a.emit('update_presence', { isAtDesk: true, roomName: 'Odak', source: 'web' });
      await tick();
      expect(sessions.get(a.id!)?.startedAt).toBe(twoMinutesAgo);

      a.emit('update_presence', { isAtDesk: false, roomName: 'Odak' });
      await tick(200);
      expect(fakeUsers.addFocusTime).toHaveBeenCalledWith(1, 2);
      expect(fakeStudy.recordSession).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, roomName: 'Odak', source: 'web', creditedMinutes: 2 }));
    });

    it('süreyi aşağı yuvarlar: 119 saniye 1 dakika, 59 saniye 0 dakikadır', async () => {
      lobbies.add({ name: 'Odak' });
      const a = await connect(1);
      await join(a, 'Odak');
      const sessions = sessionsOf();

      a.emit('update_presence', { isAtDesk: true, roomName: 'Odak', source: 'web' });
      await tick();
      sessions.get(a.id!)!.startedAt = Date.now() - 59_000;
      a.emit('update_presence', { isAtDesk: false, roomName: 'Odak' });
      await tick();
      expect(fakeUsers.addFocusTime).not.toHaveBeenCalled();

      a.emit('update_presence', { isAtDesk: true, roomName: 'Odak', source: 'web' });
      await tick();
      sessions.get(a.id!)!.startedAt = Date.now() - 119_000;
      a.emit('update_presence', { isAtDesk: false, roomName: 'Odak' });
      await tick();
      expect(fakeUsers.addFocusTime).toHaveBeenCalledWith(1, 1);
    });

    it('tek oturumdan en fazla 240 dakika yazılır (Elite çarpanı dahil)', async () => {
      lobbies.add({ name: 'Elite', isPremiumOnly: true });
      const a = await connect(1);
      await join(a, 'Elite');
      const sessions = sessionsOf();

      a.emit('update_presence', { isAtDesk: true, roomName: 'Elite', source: 'web' });
      await tick();
      sessions.get(a.id!)!.startedAt = Date.now() - 10 * 3600_000;
      a.emit('update_presence', { isAtDesk: false, roomName: 'Elite' });
      await tick();
      expect(fakeUsers.addFocusTime).toHaveBeenCalledWith(1, 240);
    });

    it('iki sekme: aynı anda tek aktif oturum; ikinci sekme başlayınca birincinin süresi yazılır ve focus_moved gider', async () => {
      lobbies.add({ name: 'Elite', isPremiumOnly: true });
      lobbies.add({ name: 'Normal' });
      const a1 = await connect(1);
      const a2 = await connect(1);
      await join(a1, 'Elite');
      await join(a2, 'Normal');
      const sessions = sessionsOf();

      a1.emit('update_presence', { isAtDesk: true, roomName: 'Elite', source: 'web' });
      await tick();
      sessions.get(a1.id!)!.startedAt = Date.now() - 3 * 60_000;

      const moved = next<{ roomName: string }>(a1, 'focus_moved');
      a2.emit('update_presence', { isAtDesk: true, roomName: 'Normal', source: 'web' });
      expect(await moved).toEqual({ roomName: 'Normal' });
      await tick();
      expect(fakeUsers.addFocusTime).toHaveBeenCalledWith(1, 6);
      expect(sessions.has(a1.id!)).toBe(false);
      expect(sessions.has(a2.id!)).toBe(true);
    });

    it('iki sekme: bir sekmeyi kapatmak diğerinin oturumunu bitirmez', async () => {
      lobbies.add({ name: 'Elite', isPremiumOnly: true });
      lobbies.add({ name: 'Normal' });
      const a1 = await connect(1);
      const a2 = await connect(1);
      await join(a1, 'Elite');
      await join(a2, 'Normal');
      const sessions = sessionsOf();

      a2.emit('update_presence', { isAtDesk: true, roomName: 'Normal', source: 'web' });
      await tick();
      sessions.get(a2.id!)!.startedAt = Date.now() - 3 * 60_000;

      a1.close();
      await tick(300);
      expect(fakeUsers.addFocusTime).not.toHaveBeenCalled();
      expect(sessions.has(a2.id!)).toBe(true);

      a2.emit('update_presence', { isAtDesk: false, roomName: 'Normal' });
      await tick();
      expect(fakeUsers.addFocusTime).toHaveBeenLastCalledWith(1, 3);
    });

    it('"masaya geçti" bildirimi 30 dakikada bir kez gider', async () => {
      lobbies.add({ name: 'Odak' });
      fakeUsers.getFriendsPushTokens.mockResolvedValue(['t1']);
      const a = await connect(1);
      await join(a, 'Odak');
      for (let i = 0; i < 3; i += 1) {
        a.emit('update_presence', { isAtDesk: true, roomName: 'Odak', source: 'web' });
        await tick(80);
        a.emit('update_presence', { isAtDesk: false, roomName: 'Odak' });
        await tick(80);
      }
      expect(fakeUsers.getFriendsPushTokens).toHaveBeenCalledTimes(1);
    });
  });

  describe('odadan ayrılma', () => {
    it('leave_lobby kullanıcının currentRoom bilgisini temizler', async () => {
      lobbies.add({ name: 'Oda' });
      const a = await connect(1);
      await join(a, 'Oda');
      expect(fakeUsers.setOnlineStatus).toHaveBeenLastCalledWith(1, true, 'Oda');

      a.emit('leave_lobby');
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(fakeUsers.setOnlineStatus).toHaveBeenLastCalledWith(1, true, null);
    });

    it('başka sekme hâlâ odadaysa o odayı korur', async () => {
      lobbies.add({ name: 'Oda' });
      lobbies.add({ name: 'Diğer' });
      const a1 = await connect(1);
      const a2 = await connect(1);
      await join(a1, 'Oda');
      await join(a2, 'Diğer');

      a1.emit('leave_lobby');
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(fakeUsers.setOnlineStatus).toHaveBeenLastCalledWith(1, true, 'Diğer');
    });
  });
});
