import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Lobby } from './lobby.entity';
import { LobbyAccess } from './lobby-access.entity';
import { LobbiesService, MAX_VIDEO_ROOM_USERS, PRIVATE_ROOM_MAX_USERS } from './lobbies.service';

describe('LobbiesService', () => {
  let service: LobbiesService;
  let lobbiesRepository: {
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let usersService: { findById: jest.Mock; getRoomMemberCounts: jest.Mock };
  let lobbyAccessRepository: { createQueryBuilder: jest.Mock; exists: jest.Mock; find: jest.Mock };
  let accessInsert: { execute: jest.Mock };

  beforeEach(async () => {
    lobbiesRepository = {
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    usersService = {
      findById: jest.fn().mockResolvedValue({ id: 3, isPremium: true }),
      getRoomMemberCounts: jest.fn().mockResolvedValue(new Map()),
    };
    accessInsert = { execute: jest.fn().mockResolvedValue(undefined) };
    const insertChain = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnValue(accessInsert),
    };
    lobbyAccessRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(insertChain),
      exists: jest.fn().mockResolvedValue(false),
      find: jest.fn().mockResolvedValue([]),
    };
    mockNameTaken(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbiesService,
        { provide: getRepositoryToken(Lobby), useValue: lobbiesRepository },
        { provide: getRepositoryToken(LobbyAccess), useValue: lobbyAccessRepository },
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

    const [[saved]] = lobbiesRepository.create.mock.calls as [[Lobby]];
    expect(result.owner).toEqual({ id: 3 });
    expect(saved.passwordHash).toEqual(expect.any(String));
    expect(saved.passwordHash).not.toBe('room-secret');
    await expect(
      bcrypt.compare('room-secret', saved.passwordHash ?? ''),
    ).resolves.toBe(true);
    // Ozet veritabanina yazilir ama yanitla istemciye donmez.
    expect(result).not.toHaveProperty('passwordHash');
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
    // Dogru sifre, odaya kalici giris izni yazar.
    expect(accessInsert.execute).toHaveBeenCalled();
  });

  it('does not grant access with a wrong password', async () => {
    const passwordHash = await bcrypt.hash('room-secret', 10);
    mockLobbyQuery({ id: 1, isPrivate: true, isPremiumOnly: false, passwordHash } as Lobby);

    await expect(service.verifyPassword(1, 'wrong', 3)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(accessInsert.execute).not.toHaveBeenCalled();
  });

  describe('private room access', () => {
    const privateLobby = { id: 5, name: 'Gizli', isPrivate: true, isPremiumOnly: false, owner: { id: 1 } } as Lobby;

    it('refuses to enter a private room without a granted password', async () => {
      lobbiesRepository.findOne.mockResolvedValue(privateLobby);

      await expect(service.assertUserCanEnter('Gizli', 3)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lets users with a grant and the owner in', async () => {
      lobbiesRepository.findOne.mockResolvedValue(privateLobby);
      await expect(service.canAccessRoom('Gizli', 1)).resolves.toBe(true);

      lobbyAccessRepository.exists.mockResolvedValue(true);
      await expect(service.assertUserCanEnter('Gizli', 3)).resolves.toBe(privateLobby);
    });

    it('allows public rooms but not unknown ones', async () => {
      lobbiesRepository.findOne.mockResolvedValue({ ...privateLobby, isPrivate: false });
      await expect(service.canAccessRoom('Acik', 3)).resolves.toBe(true);

      lobbiesRepository.findOne.mockResolvedValue(null);
      // Kaydı olmayan (silinmiş) odanın sohbetine erişim yok.
      await expect(service.canAccessRoom('Yok', 3)).resolves.toBe(false);
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

  it('rejects non-premium users creating a lobby', async () => {
    usersService.findById.mockResolvedValue({ id: 3, isPremium: false });

    await expect(
      service.create({ name: 'Cam Room', icon: 'video', allowVideo: true }, 3),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(lobbiesRepository.save).not.toHaveBeenCalled();
  });

  it('caps video lobby capacity for premium owners', async () => {
    usersService.findById.mockResolvedValue({ id: 3, isPremium: true });
    lobbiesRepository.create.mockImplementation(
      (input: Partial<Lobby>) => input,
    );
    lobbiesRepository.save.mockImplementation((input: Lobby) =>
      Promise.resolve(input),
    );

    const result = await service.create(
      { name: 'Cam Room', icon: 'video', allowVideo: true, maxUsers: 40 },
      3,
    );

    expect(result.allowVideo).toBe(true);
    expect(result.maxUsers).toBe(MAX_VIDEO_ROOM_USERS);
  });

  it('rejects a lobby name that already exists (case-insensitive)', async () => {
    mockNameTaken(true);

    await expect(
      service.create({ name: '  deep work ', icon: 'book' }, 3),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(lobbiesRepository.save).not.toHaveBeenCalled();
  });

  it('turns a unique-index violation into 409', async () => {
    lobbiesRepository.create.mockImplementation((input: Partial<Lobby>) => input);
    lobbiesRepository.save.mockRejectedValue({ code: '23505' });

    await expect(
      service.create({ name: 'Yarış', icon: 'book' }, 3),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('trims the lobby name and caps private room capacity on the server', async () => {
    lobbiesRepository.create.mockImplementation((input: Partial<Lobby>) => input);
    lobbiesRepository.save.mockImplementation((input: Lobby) => Promise.resolve(input));

    const result = await service.create(
      { name: '  Gizli Oda ', icon: 'users', isPrivate: true, password: 'x', maxUsers: 200 },
      3,
    );

    expect(result.name).toBe('Gizli Oda');
    expect(result.maxUsers).toBe(PRIVATE_ROOM_MAX_USERS);
  });

  it('caps capacity of a private room on update', async () => {
    const lobby = { id: 7, name: 'A', allowVideo: false, isPrivate: false, maxUsers: 50, owner: { id: 3 } } as Lobby;
    lobbiesRepository.findOne.mockResolvedValue(lobby);
    lobbiesRepository.save.mockImplementation((input: Lobby) => Promise.resolve(input));
    lobbiesRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ passwordHash: 'h' }),
    });

    const result = await service.update(3, 7, { isPrivate: true, maxUsers: 100 });

    expect(result.maxUsers).toBe(PRIVATE_ROOM_MAX_USERS);
  });

  it('reports hasAccess for the owner and for users with a password grant', async () => {
    const rows = [
      { id: 1, name: 'Benim', owner: { id: 3 } },
      { id: 2, name: 'Izinli', owner: { id: 9 } },
      { id: 3, name: 'Yabanci', owner: { id: 9 } },
    ];
    lobbiesRepository.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
    });
    lobbyAccessRepository.find.mockResolvedValue([{ lobby: 2 }]);

    const result = await service.findAll(3);

    expect(result.map((lobby) => lobby.hasAccess)).toEqual([true, true, false]);
    // Listeleme artık oda silmez.
    expect(lobbiesRepository.delete).not.toHaveBeenCalled();
  });

  it('cleanup removes expired empty rooms and skips occupied ones', async () => {
    lobbiesRepository.find.mockResolvedValue([
      { id: 1, name: 'Bos' },
      { id: 2, name: 'Dolu' },
    ]);
    usersService.getRoomMemberCounts.mockResolvedValue(new Map([['Dolu', 2]]));

    await expect(service.cleanupExpiredLobbies()).resolves.toBe(1);
    expect(lobbiesRepository.delete).toHaveBeenCalledWith([1]);
  });

  it('refuses to hand a room to a banned user or the current owner', async () => {
    lobbiesRepository.findOne.mockResolvedValue({ id: 1, owner: { id: 3 } });

    usersService.findById.mockResolvedValue({ id: 8, bannedAt: new Date() });
    await expect(service.adminTransferOwner(1, 8)).rejects.toBeInstanceOf(BadRequestException);

    usersService.findById.mockResolvedValue({ id: 3, bannedAt: null });
    await expect(service.adminTransferOwner(1, 3)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when verifying a missing lobby', async () => {
    mockLobbyQuery(null);

    await expect(
      service.verifyPassword(99, undefined, 3),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  function mockNameTaken(taken: boolean) {
    lobbiesRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(taken ? 1 : 0),
    });
  }

  function mockLobbyQuery(lobby: Lobby | null) {
    lobbiesRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(lobby),
    });
  }
});
