import { ForbiddenException, INestApplication, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import { LobbiesService } from '../src/lobbies/lobbies.service';
import { MessagesService } from '../src/messages/messages.service';
import { ModerationService } from '../src/moderation/moderation.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { RoomTimerService } from '../src/room-timer/room-timer.service';
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
      throw new UnauthorizedException('Bu oda sifreli. Once sifreyi gir.');
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

const users = new Map([
  [1, { id: 1, fullName: 'Ayşe', username: 'ayse', coins: 100, isPremium: true }],
  [2, { id: 2, fullName: 'Bora', username: 'bora', coins: 100, isPremium: false }],
  [3, { id: 3, fullName: 'Cem', username: 'cem', coins: 5, isPremium: false }],
]);

const fakeUsers = {
  findById: (id: number) => Promise.resolve(users.get(id) ?? null),
  setOnlineStatus: () => Promise.resolve(),
  addFocusTime: jest.fn(() => Promise.resolve({ totalFocusMinutes: 10, newBadges: [] })),
  addCoins: jest.fn(() => Promise.resolve()),
  removeCoins: jest.fn(() => Promise.resolve(true)),
  awardBadge: jest.fn(() => Promise.resolve(false)),
  getUserPushTokens: () => Promise.resolve([]),
  getFriendsPushTokens: () => Promise.resolve([]),
};

const fakeMessages = {
  createMessage: jest.fn((text: string, roomName: string, userId: number) => Promise.resolve({ id: 1, text, roomName, user: { id: userId }, createdAt: new Date() })),
  createDirectMessage: jest.fn(() => Promise.resolve({ id: 1, createdAt: new Date() })),
};

const fakeStudy = {
  recordSession: jest.fn(() => Promise.resolve(null)),
  rewardDailyGoalIfReached: jest.fn(() => Promise.resolve(false)),
  countGoalDays: () => Promise.resolve(0),
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
    const { port } = app.getHttpServer().address() as AddressInfo;
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
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const tokenFor = (userId: number) => jwt.sign({ sub: userId, email: `${userId}@test.dev`, username: users.get(userId)?.username ?? 'x' });

  /** Bağlanır; bağlantı reddedilirse `disconnected` true olur. */
  const connect = (userId: number | null) =>
    new Promise<Socket>((resolve) => {
      const socket = io(url, { auth: userId ? { token: tokenFor(userId) } : {}, transports: ['websocket'], reconnection: false, forceNew: true });
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
      expect((await error)?.message).toMatch(/sifreli/);

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
      expect((await error)?.message).toMatch(/once odaya katilmalisin/);
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
      expect((await error)?.message).toMatch(/mesaj gonderemezsin/);
      expect(fakeMessages.createDirectMessage).not.toHaveBeenCalled();
    });
  });

  describe('düello', () => {
    const setup = async () => {
      lobbies.add({ name: 'Arena' });
      const a = await connect(1);
      const b = await connect(2);
      await join(a, 'Arena');
      await join(b, 'Arena');
      return { a, b };
    };

    it('1-100 dışındaki bahsi reddeder', async () => {
      const { a, b } = await setup();
      for (const betAmount of [0, -50, 101, 2.5]) {
        const error = next<{ message: string }>(a, 'error');
        a.emit('challenge_duel', { targetUserId: 2, betAmount, roomName: 'Arena' });
        expect((await error)?.message).toMatch(/1 ile 100/);
      }
      expect(await next(b, 'duel_received', 300)).toBeNull();
    });

    it('geçerli bahsi rakibe iletir, reddedilince meydan okuyana bildirir', async () => {
      const { a, b } = await setup();
      const received = next<{ duelId: string; betAmount: number }>(b, 'duel_received');
      a.emit('challenge_duel', { targetUserId: 2, betAmount: 20, roomName: 'Arena' });
      const duel = await received;
      expect(duel).toMatchObject({ betAmount: 20 });

      const declined = next(a, 'duel_declined');
      b.emit('decline_duel', { duelId: duel!.duelId });
      expect(await declined).toMatchObject({ duelId: duel!.duelId });
    });

    it('engellenmiş kişiye düello açmayı reddeder', async () => {
      moderation.blocks.add('1:2');
      const { a } = await setup();
      const error = next<{ message: string }>(a, 'error');
      a.emit('challenge_duel', { targetUserId: 2, betAmount: 10, roomName: 'Arena' });
      expect((await error)?.message).toMatch(/duello yapamazsin/);
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
      expect((await kicked)?.message).toMatch(/cikardi/);

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
    it('masadan kalkınca oturumu kaydeder; tekrar gelen "masadayım" başlangıcı sıfırlamaz', async () => {
      lobbies.add({ name: 'Odak' });
      const a = await connect(1);
      await join(a, 'Odak');
      const gateway = app.get(SensorsGateway) as unknown as { activeSessions: Map<number, { startedAt: number }> };

      a.emit('update_presence', { isAtDesk: true, roomName: 'Odak', source: 'web' });
      await new Promise((resolve) => setTimeout(resolve, 150));
      const firstStart = gateway.activeSessions.get(1)?.startedAt;
      expect(firstStart).toBeDefined();

      // Odak 2 dakika önce başlamış gibi davran, sonra tekrar "masadayım" gönder.
      gateway.activeSessions.get(1)!.startedAt = Date.now() - 2 * 60_000;
      const twoMinutesAgo = gateway.activeSessions.get(1)!.startedAt;
      a.emit('update_presence', { isAtDesk: true, roomName: 'Odak', source: 'web' });
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(gateway.activeSessions.get(1)?.startedAt).toBe(twoMinutesAgo);

      a.emit('update_presence', { isAtDesk: false, roomName: 'Odak' });
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(fakeUsers.addFocusTime).toHaveBeenCalledWith(1, 2);
      expect(fakeStudy.recordSession).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, roomName: 'Odak', source: 'web', creditedMinutes: 2 }));
    });
  });
});
