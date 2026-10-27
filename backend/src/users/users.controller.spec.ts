import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ModerationService } from '../moderation/moderation.service';
import { MailService } from '../mail/mail.service';
import { RealtimeService } from '../realtime/realtime.service';
import type { User } from './user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: Record<string, jest.Mock>;
  let jwtService: { sign: jest.Mock };
  let mailService: { sendVerificationEmail: jest.Mock };
  let realtime: { emitToUser: jest.Mock; disconnectUser: jest.Mock };
  let moderation: { assertNotBlocked: jest.Mock };

  const me = { id: 1, username: 'ada', avatarUrl: '' } as User;

  beforeEach(async () => {
    usersService = {
      updateAccountSettings: jest.fn(),
      deleteAccount: jest.fn(),
      sendFriendRequest: jest.fn(),
      findIdByUsername: jest.fn().mockResolvedValue(2),
      respondToRequest: jest.fn(),
      removeFriend: jest.fn(),
      areFriends: jest.fn(),
      hasPassword: jest.fn().mockResolvedValue(false),
      findById: jest.fn().mockResolvedValue({ fullName: 'Ada' }),
      getUserPushTokens: jest.fn().mockResolvedValue([]),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt') };
    mailService = { sendVerificationEmail: jest.fn().mockResolvedValue(true) };
    realtime = { emitToUser: jest.fn(), disconnectUser: jest.fn() };
    moderation = { assertNotBlocked: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: NotificationsService,
          useValue: { sendNotification: jest.fn() },
        },
        { provide: ModerationService, useValue: moderation },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: StorageService,
          useValue: { put: jest.fn(), removeByUrl: jest.fn() },
        },
        { provide: MailService, useValue: mailService },
        { provide: RealtimeService, useValue: realtime },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('PUT /users/me/settings', () => {
    const open = { id: 1, email: 'new@example.com', username: 'ada', tokenVersion: 4 };

    it('mails the code to the new address and asks the client to verify', async () => {
      usersService.updateAccountSettings.mockResolvedValue({
        user: open,
        emailChanged: true,
        passwordChanged: false,
        verificationCode: '123456',
      });

      const result = await controller.updateAccountSettings(me, {});

      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        'new@example.com',
        '123456',
      );
      expect(result).toEqual({
        success: true,
        user: open,
        access_token: 'signed.jwt',
        emailVerificationRequired: true,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        email: 'new@example.com',
        username: 'ada',
        tv: 4,
      });
      expect(realtime.disconnectUser).not.toHaveBeenCalled();
    });

    it('drops live sockets when the password changed', async () => {
      usersService.updateAccountSettings.mockResolvedValue({
        user: open,
        emailChanged: false,
        passwordChanged: true,
        verificationCode: null,
      });

      const result = await controller.updateAccountSettings(me, {});

      expect(realtime.disconnectUser).toHaveBeenCalledWith(1);
      expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(result.emailVerificationRequired).toBe(false);
    });
  });

  it('adds hasPassword to /users/me without exposing the hash', async () => {
    usersService.findById.mockResolvedValue({ id: 1, fullName: 'Ada' });
    usersService.hasPassword.mockResolvedValue(true);

    const result = await controller.getMe(me);

    expect(result.user).toEqual({ id: 1, fullName: 'Ada', hasPassword: true });
  });

  it('disconnects the sockets of a deleted account', async () => {
    await controller.deleteMe(me, { confirmation: 'ada' });
    expect(realtime.disconnectUser).toHaveBeenCalledWith(1);
  });

  it('notifies the receiver of a friend request without leaking user rows', async () => {
    usersService.sendFriendRequest.mockResolvedValue({
      id: 9,
      status: 'pending',
      sender: { id: 1, email: 'a@x.com' },
      receiver: { id: 2, email: 'b@x.com' },
    });

    const result = await controller.sendRequest(me, { receiverUsername: 'grace' });

    expect(realtime.emitToUser).toHaveBeenCalledWith(2, 'friend_request', {
      fromUserId: 1,
      fromUsername: 'ada',
    });
    expect(result.data).toEqual({ id: 9, status: 'pending' });
  });

  it('tells the sender when a request is accepted, not when rejected', async () => {
    usersService.respondToRequest.mockResolvedValueOnce({
      id: 9,
      status: 'accepted',
      sender: { id: 2 },
      receiver: { id: 1 },
    });
    await controller.respondRequest(me, { requestId: 9, status: 'accepted' });
    expect(realtime.emitToUser).toHaveBeenCalledWith(2, 'friend_accepted', {
      userId: 1,
      username: 'ada',
    });

    realtime.emitToUser.mockClear();
    usersService.respondToRequest.mockResolvedValueOnce({
      id: 10,
      status: 'rejected',
      sender: { id: 3 },
      receiver: { id: 1 },
    });
    await controller.respondRequest(me, { requestId: 10, status: 'rejected' });
    expect(realtime.emitToUser).not.toHaveBeenCalled();
  });

  it('removes a friend', async () => {
    await controller.removeFriend(me, 2);
    expect(usersService.removeFriend).toHaveBeenCalledWith(1, 2);
  });

  it('only lets friends nudge each other', async () => {
    usersService.areFriends.mockResolvedValue(false);
    await expect(controller.nudgeFriend(me, 2)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    usersService.areFriends.mockResolvedValue(true);
    await expect(controller.nudgeFriend(me, 2)).resolves.toMatchObject({
      success: true,
    });
    expect(moderation.assertNotBlocked).toHaveBeenCalledWith(1, 2);
  });
});
