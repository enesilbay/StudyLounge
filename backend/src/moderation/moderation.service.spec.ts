import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { Message } from '../messages/message.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { Friendship } from '../users/friendship.entity';
import { User } from '../users/user.entity';
import { Block } from './block.entity';
import { ModerationService } from './moderation.service';
import { Report } from './report.entity';

describe('ModerationService', () => {
  let service: ModerationService;
  let blocks: {
    createQueryBuilder: jest.Mock;
    exists: jest.Mock;
    delete: jest.Mock;
  };
  let users: { findOne: jest.Mock; update: jest.Mock };
  let friendships: { delete: jest.Mock };
  let messages: { findOne: jest.Mock };
  let reports: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let blockInsert: jest.Mock;
  let realtime: { disconnectUser: jest.Mock };

  beforeEach(async () => {
    blockInsert = jest.fn().mockResolvedValue(undefined);
    blocks = {
      createQueryBuilder: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnValue({ execute: blockInsert }),
      })),
      exists: jest.fn().mockResolvedValue(false),
      delete: jest.fn(),
    };
    realtime = { disconnectUser: jest.fn() };
    users = { findOne: jest.fn(), update: jest.fn() };
    friendships = { delete: jest.fn() };
    messages = { findOne: jest.fn() };
    reports = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((input: Partial<Report>) => input),
      save: jest.fn((input: Report) => Promise.resolve(input)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: getRepositoryToken(Block), useValue: blocks },
        { provide: getRepositoryToken(Report), useValue: reports },
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(Friendship), useValue: friendships },
        { provide: getRepositoryToken(Message), useValue: messages },
        { provide: AdminAuditService, useValue: { record: jest.fn() } },
        { provide: RealtimeService, useValue: realtime },
      ],
    }).compile();

    service = module.get(ModerationService);
  });

  it('blocks a user and removes the friendship in both directions', async () => {
    users.findOne.mockResolvedValue({ id: 9 });

    await service.block(3, 9);

    expect(blockInsert).toHaveBeenCalled();
    expect(friendships.delete).toHaveBeenCalledWith({
      sender: { id: 3 },
      receiver: { id: 9 },
    });
    expect(friendships.delete).toHaveBeenCalledWith({
      sender: { id: 9 },
      receiver: { id: 3 },
    });
  });

  it('refuses to block yourself', async () => {
    await expect(service.block(3, 3)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('stops a muted user from chatting until the mute ends', async () => {
    users.findOne.mockResolvedValue({
      id: 3,
      mutedUntil: new Date(Date.now() + 60_000),
    });
    await expect(service.assertCanChat(3)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    users.findOne.mockResolvedValue({
      id: 3,
      mutedUntil: new Date(Date.now() - 60_000),
    });
    await expect(service.assertCanChat(3)).resolves.toBeUndefined();
  });

  it('only accepts a message report when the message belongs to the reported user', async () => {
    users.findOne.mockResolvedValue({ id: 9 });
    messages.findOne.mockResolvedValue({
      id: 50,
      text: 'selam',
      roomName: 'Oda',
      user: { id: 7 },
    });

    await expect(
      service.report(3, { targetUserId: 9, reason: 'spam', messageId: 50 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    messages.findOne.mockResolvedValue({
      id: 50,
      text: 'reklam linki',
      roomName: 'Oda',
      user: { id: 9 },
    });
    await service.report(3, { targetUserId: 9, reason: 'spam', messageId: 50 });
    expect(reports.save).toHaveBeenCalledWith(
      expect.objectContaining({
        messageText: 'reklam linki',
        roomName: 'Oda',
        reason: 'spam',
      }),
    );
  });

  it('does not let an admin ban another admin or themselves', async () => {
    await expect(service.banUser(1, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    users.findOne.mockResolvedValue({ id: 2, role: 'admin' });
    await expect(service.banUser(1, 2)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(users.update).not.toHaveBeenCalled();
  });

  it('disconnects the live sockets of a banned user', async () => {
    users.findOne.mockResolvedValue({ id: 5, role: 'user', username: 'x' });
    (users as unknown as { manager: unknown }).manager = {
      transaction: jest.fn((run: (m: unknown) => Promise<void>) =>
        run({ update: jest.fn() }),
      ),
    };

    await service.banUser(1, 5, 'spam');
    expect(realtime.disconnectUser).toHaveBeenCalledWith(
      5,
      'Hesabın askıya alındı.',
    );
  });

  it('does not let a banned user chat', async () => {
    users.findOne.mockResolvedValue({ id: 5, bannedAt: new Date() });
    await expect(service.assertCanChat(5)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('paginates the report list and always returns the paged shape', async () => {
    const findAndCount = jest.fn().mockResolvedValue([[{ id: 1 }], 41]);
    (reports as unknown as { findAndCount: jest.Mock }).findAndCount = findAndCount;
    const result = await service.listReports('open', 2, 500);
    expect(result).toEqual({ items: [{ id: 1 }], total: 41, page: 2, pageSize: 100 });
    const [[args]] = findAndCount.mock.calls as [[unknown]];
    expect(args).toMatchObject({ where: { status: 'open' }, skip: 100, take: 100 });

    const defaults = await service.listReports('all');
    expect(defaults).toMatchObject({ page: 1, pageSize: 25 });
  });
});
