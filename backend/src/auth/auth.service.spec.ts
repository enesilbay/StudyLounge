import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../mail/mail.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    create: jest.Mock;
    login: jest.Mock;
    findByEmail: jest.Mock;
    updateResetToken: jest.Mock;
    updatePassword: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };

  const user: User = {
    id: 7,
    username: 'ada',
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    isPremium: false,
    totalFocusMinutes: 0,
    avatarUrl: '',
    expoPushToken: '',
    resetPasswordToken: null,
    resetPasswordExpires: null,
  };

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      login: jest.fn(),
      findByEmail: jest.fn(),
      updateResetToken: jest.fn(),
      updatePassword: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: MailService,
          useValue: { sendResetPasswordEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a user and signs a standard JWT payload', async () => {
    usersService.create.mockResolvedValue(user);

    const result = await service.register({
      username: 'ada',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secret123',
    });

    expect(usersService.create).toHaveBeenCalledWith({
      username: 'ada',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secret123',
    });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 7,
      email: 'ada@example.com',
      username: 'ada',
    });
    expect(result).toEqual({
      success: true,
      user,
      access_token: 'signed.jwt',
    });
  });

  it('logs in with valid credentials', async () => {
    usersService.login.mockResolvedValue(user);

    const result = await service.login('ada@example.com', 'secret123');

    expect(usersService.login).toHaveBeenCalledWith(
      'ada@example.com',
      'secret123',
    );
    expect(result.access_token).toBe('signed.jwt');
  });

  it('rejects invalid login credentials', async () => {
    usersService.login.mockResolvedValue(null);

    await expect(
      service.login('ada@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
