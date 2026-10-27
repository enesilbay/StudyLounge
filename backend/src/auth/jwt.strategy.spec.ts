import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock; touchLastSeen: jest.Mock };

  beforeEach(() => {
    usersService = {
      findById: jest.fn(),
      touchLastSeen: jest.fn().mockResolvedValue(undefined),
    };
    const config = {
      get: (key: string) =>
        key === 'JWT_SECRET' ? 'test-secret-test-secret-test-secret-1' : undefined,
    } as unknown as ConfigService;
    strategy = new JwtStrategy(usersService as unknown as UsersService, config);
  });

  const payload = { sub: 7, email: 'ada@example.com', username: 'ada' };

  it('accepts a token whose version matches the user', async () => {
    usersService.findById.mockResolvedValue({ id: 7, tokenVersion: 2 });

    await expect(strategy.validate({ ...payload, tv: 2 })).resolves.toMatchObject({
      id: 7,
    });
  });

  it('treats a token without a version as version 0', async () => {
    usersService.findById.mockResolvedValue({ id: 7, tokenVersion: 0 });

    await expect(strategy.validate(payload)).resolves.toMatchObject({ id: 7 });
  });

  it('rejects an old token after the password changed (401)', async () => {
    usersService.findById.mockResolvedValue({ id: 7, tokenVersion: 1 });

    await expect(
      strategy.validate({ ...payload, tv: 0 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects banned and missing users', async () => {
    usersService.findById.mockResolvedValueOnce({
      id: 7,
      tokenVersion: 0,
      bannedAt: new Date(),
    });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    usersService.findById.mockResolvedValueOnce(null);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
