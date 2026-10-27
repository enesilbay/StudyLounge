import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DailyAnalytics } from './daily-analytics.entity';
import { Friendship } from './friendship.entity';
import { User } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: {
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    increment: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let friendshipRepository: {
    create: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let dailyAnalyticsRepository: {
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    usersRepository = {
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      increment: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      manager: { transaction: jest.fn() },
    };
    // Varsayilan transaction: ayni sahte repo fonksiyonlarini kullanan bir EntityManager.
    const em = {
      findOne: usersRepository.findOne,
      save: usersRepository.save,
      createQueryBuilder: usersRepository.createQueryBuilder,
    };
    usersRepository.manager.transaction.mockImplementation(
      (cb: (m: typeof em) => unknown) => cb(em),
    );
    friendshipRepository = {
      create: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    dailyAnalyticsRepository = {
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: getRepositoryToken(Friendship),
          useValue: friendshipRepository,
        },
        {
          provide: getRepositoryToken(DailyAnalytics),
          useValue: dailyAnalyticsRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Gizli alanlar select: false; servis bunlari query builder ile acikca secer.
  // Zincirleme yapi hem okuma (getOne) hem guncelleme (update/set/execute) icin kullanilir.
  const mockUserQuery = (user: Partial<User> | null) => {
    const query = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
    };
    usersRepository.createQueryBuilder.mockReturnValue(query);
    return query;
  };

  describe('create', () => {
    const input = {
      username: 'ada',
      fullName: 'Ada Lovelace',
      email: 'Ada@Example.com',
      password: 'secret123',
    };

    it('creates a user with a hashed password, lowercase email and an expiring code', async () => {
      mockUserQuery(null);
      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockImplementation((data: Partial<User>) => ({
        id: 1,
        ...data,
      }));
      usersRepository.save.mockImplementation((data: User) =>
        Promise.resolve(data),
      );

      const result = await service.create(input);

      const created = (
        usersRepository.create.mock.calls as Array<[Partial<User>]>
      )[0][0];
      expect(created.email).toBe('ada@example.com');
      expect(created.password).not.toBe('secret123');
      expect(created.emailVerificationToken).toMatch(/^\d{6}$/);
      expect(created.emailVerificationExpires!.getTime()).toBeGreaterThan(
        Date.now(),
      );
      expect(result.password).toBeUndefined();
    });

    it('rejects an email that belongs to a verified account', async () => {
      mockUserQuery({ id: 5, isEmailVerified: true } as User);

      await expect(service.create(input)).rejects.toThrow(
        'Bu e-posta adresi zaten kullanılıyor.',
      );
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a username owned by a verified account', async () => {
      mockUserQuery(null);
      usersRepository.findOne.mockResolvedValue({
        id: 9,
        isEmailVerified: true,
      });

      await expect(service.create(input)).rejects.toThrow(
        'Bu kullanıcı adı maalesef çoktan alınmış.',
      );
    });

    it('reuses an unverified registration instead of leaving the user stuck', async () => {
      const stale = {
        id: 5,
        username: 'ada_typo',
        email: 'ada@example.com',
        isEmailVerified: false,
      } as User;
      mockUserQuery(stale);
      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.save.mockImplementation((data: User) =>
        Promise.resolve(data),
      );

      const result = await service.create(input);

      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(result.id).toBe(5);
      expect(result.username).toBe('ada');
      expect(result.fullName).toBe('Ada Lovelace');
      expect(result.emailVerificationToken).toMatch(/^\d{6}$/);
      expect(result.password).toBeUndefined();
    });

    it('takes over a username held by an unverified registration with another email', async () => {
      const stale = {
        id: 8,
        username: 'ada',
        email: 'yanlis@example.com',
        isEmailVerified: false,
      } as User;
      mockUserQuery(null);
      usersRepository.findOne.mockResolvedValue(stale);
      usersRepository.save.mockImplementation((data: User) =>
        Promise.resolve(data),
      );

      const result = await service.create(input);

      expect(result.id).toBe(8);
      expect(result.email).toBe('ada@example.com');
    });
  });

  it('logs in with the correct password and removes the password field', async () => {
    const hashedPassword = await bcrypt.hash('secret123', 10);
    const query = mockUserQuery({
      id: 1,
      username: 'ada',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: hashedPassword,
    });

    const result = await service.login('Ada@Example.com', 'secret123');

    expect(query.addSelect).toHaveBeenCalledWith(
      expect.arrayContaining(['user.password']),
    );
    expect(query.where).toHaveBeenCalledWith(
      'LOWER(user.email) = :value',
      { value: 'ada@example.com' },
    );
    expect(result?.id).toBe(1);
    expect(result?.password).toBeUndefined();
  });

  describe('friend requests', () => {
    const sender = { id: 1, username: 'ada' } as User;
    const receiver = { id: 2, username: 'grace' } as User;

    beforeEach(() => {
      usersRepository.findOne
        .mockResolvedValueOnce(sender)
        .mockResolvedValueOnce(receiver);
    });

    it('creates a pending friend request between two different users', async () => {
      friendshipRepository.findOne.mockResolvedValue(null);
      friendshipRepository.create.mockReturnValue({
        sender,
        receiver,
        status: 'pending',
      });
      friendshipRepository.save.mockImplementation(
        (input: Partial<Friendship>) => Promise.resolve({ id: 9, ...input }),
      );

      const result = await service.sendFriendRequest(1, 'grace');

      expect(friendshipRepository.create).toHaveBeenCalledWith({
        sender,
        receiver,
        status: 'pending',
      });
      expect(result).toEqual({ id: 9, sender, receiver, status: 'pending' });
    });

    it('lets a rejected request be sent again (back to pending)', async () => {
      // Eski istegi karsi taraf gondermisti ve ben reddetmistim; simdi ben gonderiyorum.
      friendshipRepository.findOne.mockResolvedValue({
        id: 4,
        status: 'rejected',
        sender: receiver,
        receiver: sender,
      });
      friendshipRepository.save.mockImplementation((f: Friendship) =>
        Promise.resolve(f),
      );

      const result = await service.sendFriendRequest(1, 'grace');

      expect(friendshipRepository.create).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 4,
        status: 'pending',
        sender,
        receiver,
      });
    });

    it.each([
      ['accepted', 1, 'zaten arkadaşsınız'],
      ['pending', 1, 'zaten bir arkadaşlık isteği gönderdin'],
      ['pending', 2, 'sana zaten istek göndermiş'],
    ])(
      'explains an existing %s request (sender %i)',
      async (status, senderId, message) => {
        friendshipRepository.findOne.mockResolvedValue({
          id: 4,
          status,
          sender: { id: senderId },
        });

        await expect(service.sendFriendRequest(1, 'grace')).rejects.toThrow(
          message,
        );
        expect(friendshipRepository.save).not.toHaveBeenCalled();
      },
    );
  });

  it('removes a friendship in both directions and 404s for strangers', async () => {
    friendshipRepository.find.mockResolvedValueOnce([{ id: 3 }]);
    await service.removeFriend(1, 2);
    expect(friendshipRepository.delete).toHaveBeenCalledWith([3]);

    friendshipRepository.find.mockResolvedValueOnce([]);
    await expect(service.removeFriend(1, 99)).rejects.toThrow(
      'arkadaş listende değil',
    );
  });

  it('leaves banned users out of the all-time leaderboard', async () => {
    usersRepository.find.mockResolvedValue([]);

    await service.getLeaderboard();

    const options = (
      usersRepository.find.mock.calls as Array<[{ where: object }]>
    )[0][0];
    expect(options.where).toHaveProperty('bannedAt');
  });

  describe('addFocusTime', () => {
    it('adds focus minutes to the user and daily analytics bucket', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-05-12T10:15:00Z'));
      const user = {
        id: 1,
        fullName: 'Ada Lovelace',
        totalFocusMinutes: 20,
      } as User;
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.save.mockImplementation((input: User) =>
        Promise.resolve(input),
      );
      dailyAnalyticsRepository.findOne.mockResolvedValue(null);
      dailyAnalyticsRepository.create.mockImplementation(
        (input: Partial<DailyAnalytics>) => ({ id: 1, ...input }),
      );
      dailyAnalyticsRepository.save.mockImplementation(
        (input: DailyAnalytics) => Promise.resolve(input),
      );

      // 10:15 UTC = 13:15 Türkiye saati; saat dilimi makineden bağımsız olmalı.
      const expectedHour = 13;
      const result = await service.addFocusTime(1, 25);

      expect(result?.totalFocusMinutes).toBe(45);
      expect(dailyAnalyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ user, date: '2026-05-12', focusMinutes: 25 }),
      );
      const saveCalls = dailyAnalyticsRepository.save.mock.calls as Array<
        [DailyAnalytics]
      >;
      expect(saveCalls[0][0].hourlyDistribution[expectedHour]).toBe(25);
      expect(result?.badges).toContain('İlk Adım');
      jest.useRealTimers();
    });

    it('locks the user row and floors fractional minutes', async () => {
      const user = { id: 1, fullName: 'Ada', totalFocusMinutes: 0 } as User;
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.save.mockImplementation((input: User) =>
        Promise.resolve(input),
      );
      dailyAnalyticsRepository.findOne.mockResolvedValue(null);
      dailyAnalyticsRepository.create.mockImplementation(
        (input: Partial<DailyAnalytics>) => ({ id: 1, ...input }),
      );
      dailyAnalyticsRepository.save.mockImplementation(
        (input: DailyAnalytics) => Promise.resolve(input),
      );

      const result = await service.addFocusTime(1, 1.9);

      expect(result?.totalFocusMinutes).toBe(1);
      const [, options] = usersRepository.findOne.mock.calls[0] as [
        unknown,
        { lock: { mode: string } },
      ];
      expect(options.lock.mode).toBe('pessimistic_write');
    });

    it('ignores sessions shorter than a full minute', async () => {
      await expect(service.addFocusTime(1, 0.5)).resolves.toBeNull();
      expect(usersRepository.manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('streaks', () => {
    const run = async (
      lastFocusDate: string,
      now: string,
      currentStreak = 4,
      streakFreezes = 0,
    ) => {
      jest.useFakeTimers().setSystemTime(new Date(now));
      const user = {
        id: 1,
        fullName: 'Ada',
        totalFocusMinutes: 0,
        currentStreak,
        bestStreak: 4,
        streakFreezes,
        lastFocusDate: new Date(lastFocusDate),
      } as User;
      usersRepository.findOne.mockResolvedValue(user);
      usersRepository.save.mockImplementation((input: User) =>
        Promise.resolve(input),
      );
      dailyAnalyticsRepository.findOne.mockResolvedValue(null);
      dailyAnalyticsRepository.create.mockImplementation(
        (input: Partial<DailyAnalytics>) => ({ id: 1, ...input }),
      );
      dailyAnalyticsRepository.save.mockImplementation(
        (input: DailyAnalytics) => Promise.resolve(input),
      );
      const result = await service.addFocusTime(1, 10);
      jest.useRealTimers();
      return result!;
    };

    it('continues the streak when the user studied yesterday (Turkey time)', async () => {
      // Dün 23:30 TR (20:30Z), bugün 00:30 TR (21:30Z): takvimde ardışık günler.
      const result = await run('2026-05-11T20:30:00Z', '2026-05-11T21:30:00Z');
      expect(result.currentStreak).toBe(5);
      expect(result.bestStreak).toBe(5);
    });

    it('does not count twice on the same day', async () => {
      const result = await run('2026-05-12T06:00:00Z', '2026-05-12T15:00:00Z');
      expect(result.currentStreak).toBe(4);
    });

    it('resets the streak after a skipped day', async () => {
      const result = await run('2026-05-10T12:00:00Z', '2026-05-12T12:00:00Z');
      expect(result.currentStreak).toBe(1);
      expect(result.bestStreak).toBe(4);
    });

    it('spends a streak freeze for a skipped day', async () => {
      const result = await run(
        '2026-05-10T12:00:00Z',
        '2026-05-12T12:00:00Z',
        4,
        1,
      );
      expect(result.currentStreak).toBe(5);
      expect(result.streakFreezes).toBe(0);
    });
  });

  describe('badges', () => {
    it('silently ignores badge names that are no longer in the catalog', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        totalFocusMinutes: 0,
        badges: ['İlk Adım', 'Düello Galibi'],
      });

      const user = await service.findById(1);

      expect(user?.badges).toEqual(['İlk Adım']);
    });

    it('does not award a removed badge', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 1, badges: [] });

      await expect(service.awardBadge(1, 'Düello Galibi')).resolves.toBe(false);
      expect(usersRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateAccountSettings', () => {
    const open = { id: 1, username: 'ada', email: 'ada@example.com' } as User;

    const withPassword = async (extra: Partial<User> = {}) =>
      mockUserQuery({
        ...open,
        password: await bcrypt.hash('old-secret', 10),
        ...extra,
      });

    it('rejects an email change with a wrong current password', async () => {
      const query = await withPassword();

      await expect(
        service.updateAccountSettings(1, {
          email: 'evil@example.com',
          currentPassword: 'YANLIS-sifre',
        }),
      ).rejects.toThrow('Mevcut şifre hatalı.');
      expect(query.execute).not.toHaveBeenCalled();
    });

    it('rejects an email or username change without a current password', async () => {
      const query = await withPassword();

      await expect(
        service.updateAccountSettings(1, { email: 'evil@example.com' }),
      ).rejects.toThrow('Mevcut şifre hatalı.');
      await expect(
        service.updateAccountSettings(1, { username: 'baska' }),
      ).rejects.toThrow('Mevcut şifre hatalı.');
      expect(query.execute).not.toHaveBeenCalled();
    });

    it('requires the current password before changing password', async () => {
      const query = await withPassword();

      await expect(
        service.updateAccountSettings(1, {
          currentPassword: 'wrong-secret',
          newPassword: 'new-secret-1',
        }),
      ).rejects.toThrow('Mevcut şifre hatalı.');
      expect(query.execute).not.toHaveBeenCalled();
    });

    it('changes the email, lowercases it and asks for re-verification', async () => {
      const query = await withPassword();
      usersRepository.findOne.mockResolvedValue({ ...open, email: 'new@example.com' });

      const result = await service.updateAccountSettings(1, {
        email: 'New@Example.com',
        currentPassword: 'old-secret',
      });

      expect(query.set).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          isEmailVerified: false,
          codeAttempts: 0,
        }),
      );
      expect(result.emailChanged).toBe(true);
      expect(result.verificationCode).toMatch(/^\d{6}$/);
      expect(result.passwordChanged).toBe(false);
    });

    it('returns only the open user fields, never the secret ones', async () => {
      const query = await withPassword();
      usersRepository.findOne.mockResolvedValue({ ...open });

      const result = await service.updateAccountSettings(1, {
        fullName: 'Ada L.',
      });

      // Gizli alanlar yalnizca sifre kontrolu icin secildi; yanit /users/me gibi varsayilan
      // (select: false alanlari olmayan) sorgudan gelir.
      expect(query.addSelect).toHaveBeenCalledTimes(1);
      expect(query.addSelect).toHaveBeenCalledWith('user.password');
      for (const secret of [
        'password',
        'emailVerificationToken',
        'resetPasswordToken',
        'resetPasswordExpires',
        'googleId',
        'expoPushToken',
      ]) {
        expect(result.user).not.toHaveProperty(secret);
      }
      expect(result.user.hasPassword).toBe(true);
    });

    it('bumps the token version when the password changes', async () => {
      const query = await withPassword();
      usersRepository.findOne.mockResolvedValue({ ...open });

      const result = await service.updateAccountSettings(1, {
        currentPassword: 'old-secret',
        newPassword: 'new-secret-1',
      });

      const changes = (
        query.set.mock.calls as Array<[Record<string, unknown>]>
      )[0][0];
      expect(changes.password).not.toBe('new-secret-1');
      expect(typeof changes.tokenVersion).toBe('function');
      expect(result.passwordChanged).toBe(true);
    });

    it('lets a Google-only account change its name and username but not email or password', async () => {
      const query = mockUserQuery({ ...open, password: undefined });
      usersRepository.findOne.mockResolvedValue({ ...open });

      await expect(
        service.updateAccountSettings(1, {
          fullName: 'Yeni Ad',
          username: 'ada_yeni',
        }),
      ).resolves.toMatchObject({ emailChanged: false });
      expect(query.set).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Yeni Ad', username: 'ada_yeni' }),
      );

      await expect(
        service.updateAccountSettings(1, { email: 'baska@example.com' }),
      ).rejects.toThrow('e-postası değiştirilemez');
      await expect(
        service.updateAccountSettings(1, { newPassword: 'new-secret-1' }),
      ).rejects.toThrow('şifre belirlenemez');
    });
  });

  describe('code attempts', () => {
    it('increments the counter in a single statement and locks at the limit', async () => {
      const query = mockUserQuery(null);
      query.execute.mockResolvedValueOnce({ raw: [{ codeAttempts: 2 }] });
      await expect(service.registerFailedCodeAttempt(7)).resolves.toBe(false);
      expect(usersRepository.update).not.toHaveBeenCalled();

      query.execute.mockResolvedValueOnce({ raw: [{ codeAttempts: 5 }] });
      await expect(service.registerFailedCodeAttempt(7)).resolves.toBe(true);
      expect(usersRepository.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ emailVerificationToken: null, codeAttempts: 0 }),
      );
    });
  });

  it('adds coins with a single atomic increment', async () => {
    await service.addCoins(3, 25);
    expect(usersRepository.increment).toHaveBeenCalledWith({ id: 3 }, 'coins', 25);

    await service.addCoins(3, -5);
    expect(usersRepository.increment).toHaveBeenCalledTimes(1);
  });

  describe('buyItem', () => {
    // Satir kilidi yerine istekleri sirayla calistiran kucuk bir sahte veritabani.
    const fakeDb = (initial: Partial<User>) => {
      const row = {
        id: 7,
        coins: 500,
        streakFreezes: 0,
        ownedColors: [] as string[],
        ownedIcons: [] as string[],
        ownedProfileFrames: ['none'],
        ownedProfileCovers: ['none'],
        ownedLampColors: ['classic'],
        ownedSoundPacks: ['classic'],
        badges: [] as string[],
        ...initial,
      } as unknown as User;
      let queue: Promise<unknown> = Promise.resolve();
      const em = {
        findOne: jest.fn(async () => {
          await Promise.resolve();
          return structuredClone(row);
        }),
        createQueryBuilder: jest.fn(() => {
          const q = {
            changes: {} as Record<string, unknown>,
            params: {} as { id?: number; price?: number },
            update: () => q,
            set: (value: Record<string, unknown>) => {
              q.changes = value;
              return q;
            },
            where: (_sql: string, params: { id: number; price: number }) => {
              q.params = params;
              return q;
            },
            execute: async () => {
              await Promise.resolve();
              const price = q.params.price ?? 0;
              if (row.coins < price) return { affected: 0 };
              const rest = { ...q.changes };
              delete rest.coins;
              Object.assign(row, rest);
              row.coins -= price;
              return { affected: 1 };
            },
          };
          return q;
        }),
      };
      usersRepository.manager.transaction.mockImplementation(
        (cb: (m: typeof em) => Promise<unknown>) => {
          const run = queue.then(() => cb(em));
          queue = run.catch(() => undefined);
          return run;
        },
      );
      return { row, em };
    };

    it('charges the catalog price, not a client supplied one', async () => {
      fakeDb({});

      const result = await service.buyItem(7, 'profileFrame', 'gold');

      expect(result.coins).toBe(350);
      expect(result.ownedProfileFrames).toContain('gold');
    });

    it('locks the user row for the purchase', async () => {
      const { em } = fakeDb({});

      await service.buyItem(7, 'profileFrame', 'gold');

      const [, options] = em.findOne.mock.calls[0] as unknown as [
        unknown,
        { lock: { mode: string } },
      ];
      expect(options.lock.mode).toBe('pessimistic_write');
    });

    it('rejects items that are not in the catalog', async () => {
      await expect(service.buyItem(7, 'color', '#000000')).rejects.toThrow(
        'Mağazada böyle bir ürün yok',
      );
      expect(usersRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('rejects when the user cannot afford the item', async () => {
      const { row } = fakeDb({ coins: 10 });

      await expect(service.buyItem(7, 'icon', '🚀')).rejects.toThrow(
        'Yetersiz Odak Puanı',
      );
      expect(row.coins).toBe(10);
    });

    it('only lets as many parallel purchases through as the balance pays for', async () => {
      const { row } = fakeDb({ coins: 100 });

      const results = await Promise.allSettled([
        service.buyItem(7, 'icon', '⚡'), // 80
        service.buyItem(7, 'icon', '🔥'), // 50
        service.buyItem(7, 'color', '#059669'), // 100
        service.buyItem(7, 'color', '#0F766E'), // 120
        service.buyItem(7, 'profileFrame', 'gold'), // 150
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(row.coins).toBe(20);
      expect(row.ownedIcons).toEqual(['⚡']);
      expect(row.ownedColors).toEqual([]);
      expect(row.ownedProfileFrames).toEqual(['none']);
    });

    it('does not sell the same item twice to parallel requests', async () => {
      const { row } = fakeDb({ coins: 500 });

      const results = await Promise.allSettled([
        service.buyItem(7, 'icon', '🔥'),
        service.buyItem(7, 'icon', '🔥'),
        service.buyItem(7, 'icon', '🔥'),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(row.coins).toBe(450);
    });

    it('buys a profile cover and a lamp color', async () => {
      fakeDb({});

      const cover = await service.buyItem(7, 'profileCover', 'forest');
      expect(cover.ownedProfileCovers).toEqual(['none', 'forest']);
      expect(cover.coins).toBe(280);

      const lamp = await service.buyItem(7, 'lampColor', 'mint');
      expect(lamp.ownedLampColors).toEqual(['classic', 'mint']);
    });

    it('stacks streak freezes up to the limit', async () => {
      fakeDb({ streakFreezes: 1 });
      const result = await service.buyItem(7, 'streakFreeze', 'freeze');
      expect(result.streakFreezes).toBe(2);
      expect(result.coins).toBe(300);

      await expect(
        service.buyItem(7, 'streakFreeze', 'freeze'),
      ).rejects.toThrow('En fazla 2 seri koruma');
    });
  });

  describe('equipItem', () => {
    it('equips free items and owned items, rejects the rest', async () => {
      const user = {
        id: 7,
        ownedLampColors: ['classic', 'mint'],
        ownedProfileCovers: ['none'],
      } as unknown as User;
      usersRepository.findOne.mockResolvedValue(user);

      expect(
        (await service.equipItem(7, 'lampColor', 'mint')).equippedLampColor,
      ).toBe('mint');
      // Yalnizca kusanilan sutun yazilir; coin gibi alanlar ezilmez.
      expect(usersRepository.update).toHaveBeenCalledWith(7, {
        equippedLampColor: 'mint',
      });
      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(
        (await service.equipItem(7, 'profileCover', 'none'))
          .equippedProfileCover,
      ).toBe('none');
      await expect(
        service.equipItem(7, 'profileCover', 'galaxy'),
      ).rejects.toThrow('Bu ürüne sahip değilsiniz');
      await expect(
        service.equipItem(7, 'streakFreeze', 'freeze'),
      ).rejects.toThrow('kuşanılmaz');
    });
  });

  it('reports whether the account has a password without returning the hash', async () => {
    mockUserQuery({ id: 1, password: 'hash' });
    await expect(service.hasPassword(1)).resolves.toBe(true);
    mockUserQuery({ id: 1, password: undefined });
    await expect(service.hasPassword(1)).resolves.toBe(false);
  });

  it('clears stale online state on boot', async () => {
    const query = mockUserQuery(null);

    await service.onApplicationBootstrap();

    expect(query.set).toHaveBeenCalledWith({
      isOnline: false,
      currentRoom: null,
    });
    expect(query.execute).toHaveBeenCalled();
  });
});
