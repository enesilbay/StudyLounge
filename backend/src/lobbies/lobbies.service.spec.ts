import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Lobby } from './lobby.entity';
import { LobbiesService } from './lobbies.service';

describe('LobbiesService', () => {
  let service: LobbiesService;
  let lobbiesRepository: {
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let usersService: { findById: jest.Mock };

  beforeEach(async () => {
    lobbiesRepository = {
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    usersService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbiesService,
        { provide: getRepositoryToken(Lobby), useValue: lobbiesRepository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<LobbiesService>(LobbiesService);
  });

  it('creates a private lobby with a hashed password and owner relation', async () => {
    lobbiesRepository.create.mockImplementation((input: Partial<Lobby>) => ({
      id: 10,
      ...input,
    }));
    lobbiesRepository.save.mockImplementation((input: Lobby) =>
      Promise.resolve(input),
    );

    const result = await service.create(
      {
        name: 'Deep Work',
        icon: 'book',
        description: 'quiet room',
        isPrivate: true,
        password: 'room-secret',
        maxUsers: 12,
      },
      3,
    );

    expect(result.owner).toEqual({ id: 3 });
    expect(result.passwordHash).toEqual(expect.any(String));
    expect(result.passwordHash).not.toBe('room-secret');
    await expect(
      bcrypt.compare('room-secret', result.passwordHash ?? ''),
    ).resolves.toBe(true);
  });

  it('verifies a private lobby password', async () => {
    const passwordHash = await bcrypt.hash('room-secret', 10);
    mockLobbyQuery({
      id: 1,
      isPrivate: true,
      isPremiumOnly: false,
      passwordHash,
    } as Lobby);

    await expect(service.verifyPassword(1, 'room-secret', 3)).resolves.toEqual({
      success: true,
    });
  });

  it('rejects non-premium users from premium-only lobbies', async () => {
    mockLobbyQuery({
      id: 1,
      isPrivate: false,
      isPremiumOnly: true,
    } as Lobby);
    usersService.findById.mockResolvedValue({ id: 3, isPremium: false });

    await expect(
      service.verifyPassword(1, undefined, 3),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when verifying a missing lobby', async () => {
    mockLobbyQuery(null);

    await expect(
      service.verifyPassword(99, undefined, 3),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  function mockLobbyQuery(lobby: Lobby | null) {
    lobbiesRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(lobby),
    });
  }
});
