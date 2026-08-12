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
    findById: jest.Mock;
    updateResetToken: jest.Mock;
    updatePassword: jest.Mock;
    updateVerificationToken: jest.Mock;
    markEmailAsVerified: jest.Mock;
  };
  let mailService: {
    sendVerificationEmail: jest.Mock;
    sendResetPasswordEmail: jest.Mock;
    sendPasswordChangeCodeEmail: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };

  const user: User = {
    id: 7,
    username: 'ada',
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    isEmailVerified: true,
    emailVerificationToken: '123456',
    isPremium: false,
    totalFocusMinutes: 0,
    avatarUrl: '',
    expoPushToken: '',
    resetPasswordToken: null,
    resetPasswordExpires: null,
  } as User;

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      login: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateResetToken: jest.fn(),
      updatePassword: jest.fn(),
      updateVerificationToken: jest.fn(),
      markEmailAsVerified: jest.fn(),
    };
    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
      sendPasswordChangeCodeEmail: jest.fn().mockResolvedValue(true),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a user and sends verification email', async () => {
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
    expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
      'ada@example.com',
      '123456',
    );
    expect(result).toEqual({
      success: true,
      requiresVerification: true,
      email: 'ada@example.com',
      message:
        'Kayıt başarılı! Lütfen e-postanıza gönderilen 6 haneli doğrulama kodunu girin.',
    });
  });

  it('verifies email with valid code and returns access_token', async () => {
    usersService.findByEmail.mockResolvedValue(user);
    usersService.findById.mockResolvedValue(user);

    const result = await service.verifyEmail('ada@example.com', '123456');

    expect(usersService.markEmailAsVerified).toHaveBeenCalledWith(7);
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 7,
      email: 'ada@example.com',
      username: 'ada',
    });
    expect(result).toEqual({
      success: true,
      user,
      access_token: 'signed.jwt',
      message: 'E-posta adresiniz başarıyla doğrulandı!',
    });
  });

  it('logs in with valid credentials when verified', async () => {
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
