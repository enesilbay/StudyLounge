import { INestApplication, ValidationPipe } from '@nestjs/common';
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
import { User } from '../src/users/user.entity';
import { UsersService } from '../src/users/users.service';

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

  beforeEach(async () => {
    usersService = new InMemoryUsersService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController, LobbiesController, UsersController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: LobbiesService, useClass: InMemoryLobbiesService },
        {
          provide: MailService,
          useValue: { sendResetPasswordEmail: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'JWT_SECRET' ? 'test-secret' : undefined,
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

  it('logs in and creates a lobby', async () => {
    const token = await registerUser('ada', 'ada@example.com');

    const response = await request(getServer(app))
      .post('/lobbies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Deep Work',
        icon: 'book',
        description: 'Focus room',
        maxUsers: 12,
      })
      .expect(201);

    const body = response.body as unknown as {
      id: number;
      name: string;
      owner: User;
    };
    expect(body.id).toBe(1);
    expect(body.name).toBe('Deep Work');
    expect(body.owner.id).toBe(1);
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

    const settingsResponse = await request(getServer(app))
      .put('/users/me/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'ada_new',
        email: 'ada.new@example.com',
      })
      .expect(200);
    const settingsBody = settingsResponse.body as unknown as AuthResponse & {
      user: User;
    };

    expect(settingsBody.user.username).toBe('ada_new');
    expect(settingsBody.user.email).toBe('ada.new@example.com');
    expect(settingsBody.access_token).toEqual(expect.any(String));

    await request(getServer(app))
      .post('/auth/login')
      .send({ email: 'ada.new@example.com', password: 'secret123' })
      .expect(201);
  });

  async function registerUser(username: string, email: string) {
    const response = await request(getServer(app))
      .post('/auth/register')
      .send({
        username,
        fullName: `${capitalize(username)} User`,
        email,
        password: 'secret123',
      })
      .expect(201);

    const body = response.body as unknown as AuthResponse;
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
    const user: TestUser = {
      id: this.nextUserId,
      username: userData.username ?? '',
      fullName: userData.fullName ?? '',
      email: userData.email ?? '',
      password: userData.password,
      isPremium: false,
      totalFocusMinutes: 0,
      avatarUrl: '',
      expoPushToken: '',
      resetPasswordToken: null,
      resetPasswordExpires: null,
    };
    this.nextUserId += 1;
    this.users.push(user);
    return this.sanitize(user);
  }

  login(email: string, password: string) {
    const user = this.users.find(
      (candidate) =>
        candidate.email === email && candidate.password === password,
    );
    return user ? this.sanitize(user) : null;
  }

  findById(id: number) {
    const user = this.users.find((candidate) => candidate.id === id);
    return user ? this.sanitize(user) : null;
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

  updateAccountSettings(
    userId: number,
    settings: { username?: string; email?: string },
  ) {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.username = settings.username ?? user.username;
    user.email = settings.email ?? user.email;
    return this.sanitize(user);
  }

  findRawById(id: number) {
    return this.users.find((candidate) => candidate.id === id);
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

  findAll() {
    return this.lobbies;
  }

  create(lobbyData: Record<string, unknown>, ownerId: number) {
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
