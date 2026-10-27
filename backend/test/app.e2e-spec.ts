import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { LobbiesController } from '../src/lobbies/lobbies.controller';
import { LobbiesService } from '../src/lobbies/lobbies.service';
import { MailService } from '../src/mail/mail.service';
import { UsersController } from '../src/users/users.controller';
import { NotificationsService } from '../src/notifications/notifications.service';
import { User } from '../src/users/user.entity';
import { GoogleTokenService } from '../src/auth/google-token.service';
import { StorageService } from '../src/storage/storage.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AdminFeedbackController,
  FeedbackController,
} from '../src/feedback/feedback.controller';
import { Feedback } from '../src/feedback/feedback.entity';
import { FeedbackService } from '../src/feedback/feedback.service';
import { RolesGuard } from '../src/moderation/roles.guard';
import { UsersService } from '../src/users/users.service';
import { ModerationService } from '../src/moderation/moderation.service';
import { RealtimeService } from '../src/realtime/realtime.service';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';

jest.mock('expo-server-sdk', () => ({
  Expo: class {
    static isExpoPushToken() {
      return true;
    }

    chunkPushNotifications(messages: unknown[]) {
      return [messages];
    }

    sendPushNotificationsAsync() {
      return Promise.resolve([]);
    }
  },
}));

type TestUser = User & { password?: string };
type AuthResponse = { success: boolean; access_token: string };
type FriendRequestResponse = { data: { id: number } };
type ProfileResponse = { user: User };

describe('StudyLounge API (e2e)', () => {
  let app: INestApplication;
  let usersService: InMemoryUsersService;
  /** Testlerin ayarlayabildigi ortam degiskenleri (ConfigService taklidi okur). */
  let testEnv: Record<string, string | undefined>;
  let feedbackRepository: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    usersService = new InMemoryUsersService();
    testEnv = {};
    feedbackRepository = {
      create: jest.fn((value: object) => value),
      save: jest.fn((value: object) => Promise.resolve({ id: 1, ...value })),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [
        AuthController,
        LobbiesController,
        UsersController,
        FeedbackController,
        AdminFeedbackController,
      ],
      providers: [
        AuthService,
        GoogleTokenService,
        FeedbackService,
        RealtimeService,
        RolesGuard,
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepository },
        {
          provide: StorageService,
          useValue: {
            put: jest.fn(),
            removeByUrl: jest.fn(),
            reserveUploadQuota: jest.fn(),
            createKey: jest.fn(),
          },
        },
        { provide: AdminAuditService, useValue: { record: jest.fn() } },
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        {
          provide: LobbiesService,
          useFactory: () => new InMemoryLobbiesService(usersService),
        },
        {
          provide: MailService,
          useValue: {
            sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
            sendVerificationEmail: jest.fn().mockResolvedValue(true),
            sendPasswordChangeCodeEmail: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: NotificationsService,
          useValue: { sendNudgeNotification: jest.fn() },
        },
        {
          provide: ModerationService,
          useValue: {
            assertNotBlocked: jest.fn().mockResolvedValue(undefined),
            blockedIdsFor: jest.fn().mockResolvedValue([]),
            isBlockedBy: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'JWT_SECRET' ? 'test-secret' : testEnv[key],
            ),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers and logs in a user', async () => {
    await registerUser('ada', 'ada@example.com');

    const loginResponse = await request(getServer(app))
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'secret123' })
      .expect(201);
    const loginBody = loginResponse.body as unknown as AuthResponse;

    expect(loginBody.success).toBe(true);
    expect(typeof loginBody.access_token).toBe('string');
    expect(loginBody.access_token.length).toBeGreaterThan(0);
  });

  it('logs in with the username instead of the email', async () => {
    await registerUser('ada', 'ada@example.com');

    const response = await request(getServer(app))
      .post('/auth/login')
      .send({ email: 'ada', password: 'secret123' })
      .expect(201);
    expect((response.body as AuthResponse).success).toBe(true);

    await request(getServer(app))
      .post('/auth/login')
      .send({ password: 'secret123' })
      .expect(400);
  });

  it('keeps Google sign-in closed without GOOGLE_CLIENT_ID', async () => {
    await request(getServer(app))
      .post('/auth/google')
      .send({ credential: 'not-a-real-token' })
      .expect(503);
  });

  it('deletes the account only with the right confirmation and password', async () => {
    const token = await registerUser('ada', 'ada@example.com');
    const auth = { Authorization: `Bearer ${token}` };

    await request(getServer(app))
      .delete('/users/me')
      .set(auth)
      .send({ confirmation: 'yanlis', password: 'secret123' })
      .expect(400);
    await request(getServer(app))
      .delete('/users/me')
      .set(auth)
      .send({ confirmation: 'ada', password: 'wrong-password' })
      .expect(400);

    await request(getServer(app))
      .delete('/users/me')
      .set(auth)
      .send({ confirmation: 'ada', password: 'secret123' })
      .expect(200);

    // Silinen hesabın oturumu artık geçersiz.
    await request(getServer(app)).get('/users/me').set(auth).expect(401);
  });

  it('keeps demo Premium closed unless ALLOW_DEMO_PREMIUM is set', async () => {
    const token = await registerUser('ada', 'ada@example.com');

    await request(getServer(app))
      .post('/users/demo/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(usersService.findById(1)?.isPremium).toBe(false);

    testEnv.ALLOW_DEMO_PREMIUM = 'true';
    const response = await request(getServer(app))
      .post('/users/demo/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect((response.body as ProfileResponse).user.isPremium).toBe(true);
  });

  it('accepts feedback from users and keeps the list admin-only', async () => {
    const token = await registerUser('ada', 'ada@example.com');
    const auth = { Authorization: `Bearer ${token}` };

    await request(getServer(app))
      .post('/feedback')
      .set(auth)
      .send({
        kind: 'bug',
        message: '  Tahta açılmıyor  ',
        page: '/app/lobbies',
      })
      .expect(201);
    expect(feedbackRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'bug',
        message: 'Tahta açılmıyor',
        page: '/app/lobbies',
        user: { id: 1 },
      }),
    );

    await request(getServer(app))
      .post('/feedback')
      .set(auth)
      .send({ kind: 'bug', message: '   ' })
      .expect(400);
    await request(getServer(app))
      .post('/feedback')
      .set(auth)
      .send({ kind: 'spam', message: 'x' })
      .expect(400);
    await request(getServer(app)).get('/admin/feedback').set(auth).expect(403);
  });

  it('lets only Premium users create a lobby', async () => {
    const token = await registerUser('ada', 'ada@example.com');
    const auth = { Authorization: `Bearer ${token}` };
    const payload = {
      name: 'Deep Work',
      icon: 'book',
      description: 'Focus room',
      maxUsers: 12,
    };

    // Oda kurmak Premium ister.
    await request(getServer(app))
      .post('/lobbies')
      .set(auth)
      .send(payload)
      .expect(403);

    usersService.upgradeToPremium(1);
    const response = await request(getServer(app))
      .post('/lobbies')
      .set(auth)
      .send(payload)
      .expect(201);

    const body = response.body as unknown as {
      id: number;
      name: string;
      owner: User;
    };
    expect(body.id).toBe(1);
    expect(body.name).toBe('Deep Work');
    expect(body.owner.id).toBe(1);

    // Aynı ad (büyük/küçük harf duyarsız) ikinci kez kullanılamaz.
    await request(getServer(app))
      .post('/lobbies')
      .set(auth)
      .send({ ...payload, name: 'deep work' })
      .expect(409);
  });

  it('sends and accepts a friend request', async () => {
    const adaToken = await registerUser('ada', 'ada@example.com');
    const graceToken = await registerUser('grace', 'grace@example.com');

    const requestResponse = await request(getServer(app))
      .post('/users/friend-request')
      .set('Authorization', `Bearer ${adaToken}`)
      .send({ receiverUsername: 'grace' })
      .expect(201);
    const requestBody =
      requestResponse.body as unknown as FriendRequestResponse;

    await request(getServer(app))
      .post('/users/respond-request')
      .set('Authorization', `Bearer ${graceToken}`)
      .send({
        requestId: requestBody.data.id,
        status: 'accepted',
      })
      .expect(201);

    const friendsResponse = await request(getServer(app))
      .get('/users/friends/2')
      .set('Authorization', `Bearer ${graceToken}`)
      .expect(200);

    expect(friendsResponse.body).toEqual([
      expect.objectContaining({ id: 1, username: 'ada' }),
    ]);

    // Arkadaşlıktan çıkarma iki yönlü çalışır.
    await request(getServer(app))
      .delete('/users/friends/1')
      .set('Authorization', `Bearer ${graceToken}`)
      .expect(200);
    const afterRemoval = await request(getServer(app))
      .get('/users/friends/1')
      .set('Authorization', `Bearer ${adaToken}`)
      .expect(200);
    expect(afterRemoval.body).toEqual([]);
  });

  it('does not let a path userId update another user profile', async () => {
    await registerUser('ada', 'ada@example.com');
    const graceToken = await registerUser('grace', 'grace@example.com');

    const response = await request(getServer(app))
      .put('/users/1/profile')
      .set('Authorization', `Bearer ${graceToken}`)
      .send({ fullName: 'Not Ada' })
      .expect(200);
    const responseBody = response.body as unknown as ProfileResponse;

    expect(responseBody.user).toEqual(
      expect.objectContaining({ id: 2, fullName: 'Not Ada' }),
    );
    expect(usersService.findRawById(1)?.fullName).toBe('Ada User');
  });

  it('updates account settings and returns a fresh token payload', async () => {
    const token = await registerUser('ada', 'ada@example.com');
    const auth = { Authorization: `Bearer ${token}` };

    // Kullanıcı adı/e-posta değişimi mevcut şifreyi ister.
    await request(getServer(app))
      .put('/users/me/settings')
      .set(auth)
      .send({ email: 'ada.new@example.com' })
      .expect(400);
    await request(getServer(app))
      .put('/users/me/settings')
      .set(auth)
      .send({ email: 'ada.new@example.com', currentPassword: 'yanlis-sifre' })
      .expect(400);
    await request(getServer(app))
      .put('/users/me/settings')
      .set(auth)
      .send({ username: 'ada_new', currentPassword: 'yanlis-sifre' })
      .expect(400);
    expect(usersService.findRawById(1)?.email).toBe('ada@example.com');

    const settingsResponse = await request(getServer(app))
      .put('/users/me/settings')
      .set(auth)
      .send({
        username: 'ada_new',
        email: 'Ada.New@Example.com',
        currentPassword: 'secret123',
      })
      .expect(200);
    const settingsBody = settingsResponse.body as unknown as AuthResponse & {
      user: User;
      emailVerificationRequired: boolean;
    };

    expect(settingsBody.user.username).toBe('ada_new');
    // E-posta küçük harfe çevrilir ve yeniden doğrulama istenir.
    expect(settingsBody.user.email).toBe('ada.new@example.com');
    expect(settingsBody.emailVerificationRequired).toBe(true);
    expect(settingsBody.access_token).toEqual(expect.any(String));
    // Yanıtta gizli alan yok.
    for (const secret of [
      'password',
      'emailVerificationToken',
      'resetPasswordToken',
      'googleId',
      'expoPushToken',
    ]) {
      expect(settingsBody.user).not.toHaveProperty(secret);
    }

    // Yeni adres doğrulanana kadar giriş doğrulama ister; doğrulanınca girilir.
    const pending = await request(getServer(app))
      .post('/auth/login')
      .send({ email: 'ada_new', password: 'secret123' })
      .expect(201);
    expect(pending.body).toEqual(
      expect.objectContaining({ success: false, requiresVerification: true }),
    );
    await request(getServer(app))
      .post('/auth/verify-email')
      .send({ email: 'ada.new@example.com', token: '123456' })
      .expect(201);
    await request(getServer(app))
      .post('/auth/login')
      .send({ email: 'ada.new@example.com', password: 'secret123' })
      .expect(201);
  });

  it('changes the password only with the current one and revokes old tokens', async () => {
    const token = await registerUser('ada', 'ada@example.com');
    const auth = { Authorization: `Bearer ${token}` };

    await request(getServer(app))
      .put('/users/me/settings')
      .set(auth)
      .send({ newPassword: 'yenisifre123', currentPassword: 'yanlis' })
      .expect(400);
    await request(getServer(app))
      .put('/users/me/settings')
      .set(auth)
      .send({ newPassword: 'kisa', currentPassword: 'secret123' })
      .expect(400);

    const response = await request(getServer(app))
      .put('/users/me/settings')
      .set(auth)
      .send({ newPassword: 'yenisifre123', currentPassword: 'secret123' })
      .expect(200);
    const fresh = (response.body as AuthResponse).access_token;

    // Eski token artık geçersiz, yenisi geçerli.
    await request(getServer(app)).get('/users/me').set(auth).expect(401);
    await request(getServer(app))
      .get('/users/me')
      .set('Authorization', `Bearer ${fresh}`)
      .expect(200);
  });

  async function registerUser(username: string, email: string) {
    await request(getServer(app))
      .post('/auth/register')
      .send({
        username,
        fullName: `${capitalize(username)} User`,
        email,
        password: 'secret123',
      })
      .expect(201);

    const loginResponse = await request(getServer(app))
      .post('/auth/verify-email')
      .send({ email, token: '123456' })
      .expect(201);

    const body = loginResponse.body as unknown as AuthResponse;
    return body.access_token;
  }
});

class InMemoryUsersService {
  private users: TestUser[] = [];
  private friendships: Array<{
    id: number;
    sender: TestUser;
    receiver: TestUser;
    status: 'pending' | 'accepted' | 'rejected';
  }> = [];
  private nextUserId = 1;
  private nextFriendshipId = 1;

  create(userData: Partial<TestUser>) {
    const user = {
      id: this.nextUserId,
      username: userData.username ?? '',
      fullName: userData.fullName ?? '',
      email: userData.email ?? '',
      password: userData.password,
      isEmailVerified: false,
      emailVerificationToken: '123456',
      isPremium: false,
      totalFocusMinutes: 0,
      avatarUrl: '',
      expoPushToken: '',
      tokenVersion: 0,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    } as TestUser;
    this.nextUserId += 1;
    this.users.push(user);
    return this.sanitize(user);
  }

  findByEmail(email: string) {
    const user = this.users.find((candidate) => candidate.email === email);
    return user ? this.sanitize(user) : null;
  }

  // Gercek serviste dogrulama/sifirlama tokenlari yalnizca bu metotla secilir.
  findByEmailWithSecrets(email: string) {
    return this.findByEmail(email);
  }

  updateVerificationToken(userId: number, token: string) {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (user) {
      user.emailVerificationToken = token;
    }
  }

  markEmailAsVerified(userId: number) {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (user) {
      user.isEmailVerified = true;
      user.emailVerificationToken = null;
    }
  }

  deleteAccount(userId: number, confirmation: string, password?: string) {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (!user) throw new NotFoundException();
    if (confirmation !== user.username || password !== user.password) {
      throw new BadRequestException('Onay ya da şifre hatalı.');
    }
    this.users = this.users.filter((candidate) => candidate.id !== userId);
  }

  upgradeToPremium(userId: number) {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (user) {
      user.isPremium = true;
    }
    return this.findById(userId);
  }

  login(identifier: string, password: string) {
    const user = this.users.find(
      (candidate) =>
        (candidate.email === identifier || candidate.username === identifier) &&
        candidate.password === password,
    );
    return user ? this.sanitize(user) : null;
  }

  // Gerçek findById doğrulama/sıfırlama tokenlarını seçmez.
  findById(id: number) {
    const user = this.users.find((candidate) => candidate.id === id);
    return user ? this.publicView(user) : null;
  }

  hasPassword(userId: number) {
    return Promise.resolve(!!this.findRawById(userId)?.password);
  }

  areFriends(a: number, b: number) {
    return Promise.resolve(
      this.friendships.some(
        (f) =>
          f.status === 'accepted' &&
          ((f.sender.id === a && f.receiver.id === b) ||
            (f.sender.id === b && f.receiver.id === a)),
      ),
    );
  }

  removeFriend(userId: number, friendId: number) {
    const before = this.friendships.length;
    this.friendships = this.friendships.filter(
      (f) =>
        !(
          f.status === 'accepted' &&
          ((f.sender.id === userId && f.receiver.id === friendId) ||
            (f.sender.id === friendId && f.receiver.id === userId))
        ),
    );
    if (this.friendships.length === before) throw new NotFoundException();
  }

  touchLastSeen() {
    return Promise.resolve();
  }

  findIdByUsername(username: string) {
    return Promise.resolve(
      this.users.find((user) => user.username === username)?.id ?? null,
    );
  }

  sendFriendRequest(senderId: number, receiverUsername: string) {
    const sender = this.users.find((user) => user.id === senderId);
    const receiver = this.users.find(
      (user) => user.username === receiverUsername,
    );
    if (!sender || !receiver) {
      throw new Error('User not found');
    }

    const friendship = {
      id: this.nextFriendshipId,
      sender,
      receiver,
      status: 'pending' as const,
    };
    this.nextFriendshipId += 1;
    this.friendships.push(friendship);
    return friendship;
  }

  respondToRequest(
    requestId: number,
    receiverId: number,
    status: 'accepted' | 'rejected',
  ) {
    const friendship = this.friendships.find(
      (candidate) =>
        candidate.id === requestId &&
        candidate.receiver.id === receiverId &&
        candidate.status === 'pending',
    );
    if (!friendship) {
      throw new Error('Request not found');
    }
    friendship.status = status;
    return friendship;
  }

  getFriends(userId: number) {
    return this.friendships
      .filter(
        (friendship) =>
          friendship.status === 'accepted' &&
          (friendship.sender.id === userId ||
            friendship.receiver.id === userId),
      )
      .map((friendship) => {
        const friend =
          friendship.sender.id === userId
            ? friendship.receiver
            : friendship.sender;
        return this.sanitize(friend);
      });
  }

  updateProfile(userId: number, fullName: string) {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.fullName = fullName;
    return this.sanitize(user);
  }

  // Gerçek servisle aynı sözleşme: değişimde mevcut şifre zorunlu, sonuç { user, ... }.
  updateAccountSettings(
    userId: number,
    settings: {
      username?: string;
      email?: string;
      fullName?: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (!user) {
      throw new NotFoundException();
    }
    const emailChanged = !!settings.email && settings.email !== user.email;
    const usernameChanged =
      !!settings.username && settings.username !== user.username;
    const passwordChanged = !!settings.newPassword;
    if (
      (emailChanged || usernameChanged || passwordChanged) &&
      settings.currentPassword !== user.password
    ) {
      throw new BadRequestException('Mevcut şifre hatalı.');
    }
    if (usernameChanged) user.username = settings.username!;
    if (settings.fullName) user.fullName = settings.fullName;
    let verificationCode: string | null = null;
    if (emailChanged) {
      user.email = settings.email!;
      user.isEmailVerified = false;
      verificationCode = '123456';
      user.emailVerificationToken = verificationCode;
    }
    if (passwordChanged) {
      user.password = settings.newPassword;
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    }
    return Promise.resolve({
      user: this.publicView(user),
      emailChanged,
      passwordChanged,
      verificationCode,
    });
  }

  findRawById(id: number) {
    return this.users.find((candidate) => candidate.id === id);
  }

  private publicView(user: TestUser): User {
    const safeUser = this.sanitize(user) as Partial<User>;
    delete safeUser.emailVerificationToken;
    delete safeUser.resetPasswordToken;
    delete safeUser.expoPushToken;
    return safeUser as User;
  }

  private sanitize(user: TestUser): User {
    const safeUser = { ...user };
    delete safeUser.password;
    return safeUser;
  }
}

class InMemoryLobbiesService {
  private lobbies: Array<Record<string, unknown>> = [];
  private nextLobbyId = 1;

  constructor(private readonly users: InMemoryUsersService) {}

  findAll() {
    return this.lobbies;
  }

  create(lobbyData: Record<string, unknown>, ownerId: number) {
    // Gerçek servis kuralları: Premium şart, oda adı benzersiz (büyük/küçük harf duyarsız).
    if (!this.users.findById(ownerId)?.isPremium) {
      throw new ForbiddenException('Oda kurmak için Premium gereklidir.');
    }
    const taken = this.lobbies.some(
      (l) =>
        String(l.name).toLowerCase() === String(lobbyData.name).toLowerCase(),
    );
    if (taken) throw new ConflictException('Bu adla bir oda zaten var.');
    const lobby = {
      id: this.nextLobbyId,
      ...lobbyData,
      owner: { id: ownerId },
      activeUsers: 0,
      isPrivate: lobbyData.isPrivate ?? false,
      isPremiumOnly: lobbyData.isPremiumOnly ?? false,
    };
    this.nextLobbyId += 1;
    this.lobbies.push(lobby);
    return lobby;
  }

  verifyPassword() {
    return { success: true };
  }
}

function getServer(application: INestApplication): App {
  return application.getHttpServer() as unknown as App;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
