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
    find: jest.Mock;
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let friendshipRepository: {
    create: jest.Mock;
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
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    friendshipRepository = {
      create: jest.fn(),
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

  it('creates a user with a hashed password and hides it in the response', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.create.mockImplementation((input: Partial<User>) => ({
      id: 1,
      ...input,
    }));
    usersRepository.save.mockImplementation((input: User) =>
      Promise.resolve(input),
    );

    const result = await service.create({
      username: 'ada',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secret123',
    });

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { username: 'ada' },
    });
    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { email: 'ada@example.com' },
    });
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'ada',
        email: 'ada@example.com',
      }),
    );
    const createCalls = usersRepository.create.mock.calls as Array<
      [Partial<User>]
    >;
    const createdArg = createCalls[0][0];
    expect(createdArg.password).not.toBe('secret123');
    expect(result.password).toBeUndefined();
  });

  it('logs in with the correct password and removes the password field', async () => {
    const hashedPassword = await bcrypt.hash('secret123', 10);
    usersRepository.findOne.mockResolvedValue({
      id: 1,
      username: 'ada',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: hashedPassword,
    });

    const result = await service.login('ada@example.com', 'secret123');

    expect(result?.id).toBe(1);
    expect(result?.password).toBeUndefined();
  });

  it('creates a pending friend request between two different users', async () => {
    const sender = { id: 1, username: 'ada' } as User;
    const receiver = { id: 2, username: 'grace' } as User;
    usersRepository.findOne
      .mockResolvedValueOnce(sender)
      .mockResolvedValueOnce(receiver);
    friendshipRepository.findOne.mockResolvedValue(null);
    friendshipRepository.create.mockReturnValue({
      sender,
      receiver,
      status: 'pending',
    });
    friendshipRepository.save.mockImplementation((input: Partial<Friendship>) =>
      Promise.resolve({
        id: 9,
        ...input,
      }),
    );

    const result = await service.sendFriendRequest(1, 'grace');

    expect(friendshipRepository.create).toHaveBeenCalledWith({
      sender,
      receiver,
      status: 'pending',
    });
    expect(result).toEqual({
      id: 9,
      sender,
      receiver,
      status: 'pending',
    });
  });

  it('adds focus minutes to the user and daily analytics bucket', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-12T10:15:00Z'));
    const user = {
      id: 1,
      fullName: 'Ada Lovelace',
      totalFocusMinutes: 20,
    } as User;
    usersRepository.findOneBy.mockResolvedValue(user);
    usersRepository.save.mockImplementation((input: User) =>
      Promise.resolve(input),
    );
    dailyAnalyticsRepository.findOne.mockResolvedValue(null);
    dailyAnalyticsRepository.create.mockImplementation(
      (input: Partial<DailyAnalytics>) => ({
        id: 1,
        ...input,
      }),
    );
    dailyAnalyticsRepository.save.mockImplementation((input: DailyAnalytics) =>
      Promise.resolve(input),
    );

    const expectedHour = new Date().getHours();
    const result = await service.addFocusTime(1, 25);

    expect(result?.totalFocusMinutes).toBe(45);
    expect(dailyAnalyticsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user,
        date: '2026-05-12',
        focusMinutes: 25,
      }),
    );
    const saveCalls = dailyAnalyticsRepository.save.mock.calls as Array<
      [DailyAnalytics]
    >;
    const savedDaily = saveCalls[0][0];
    expect(savedDaily.hourlyDistribution[expectedHour]).toBe(25);
    jest.useRealTimers();
  });

  it('updates account email and username while hiding password', async () => {
    usersRepository.findOne
      .mockResolvedValueOnce({
        id: 1,
        username: 'ada',
        email: 'ada@example.com',
        password: 'hashed-password',
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    usersRepository.save.mockImplementation((input: User) =>
      Promise.resolve(input),
    );

    const result = await service.updateAccountSettings(1, {
      username: 'ada_new',
      email: 'ada.new@example.com',
    });

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'ada_new',
        email: 'ada.new@example.com',
      }),
    );
    expect(result.password).toBeUndefined();
  });

  it('requires the current password before changing password', async () => {
    const hashedPassword = await bcrypt.hash('old-secret', 10);
    usersRepository.findOne.mockResolvedValue({
      id: 1,
      username: 'ada',
      email: 'ada@example.com',
      password: hashedPassword,
    });

    await expect(
      service.updateAccountSettings(1, {
        currentPassword: 'wrong-secret',
        newPassword: 'new-secret',
      }),
    ).rejects.toThrow('Mevcut şifre hatalı.');
    expect(usersRepository.save).not.toHaveBeenCalled();
  });
});
