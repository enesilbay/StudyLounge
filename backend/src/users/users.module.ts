import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { SignOptions } from 'jsonwebtoken';
import { getConfigString, getJwtSecret } from '../config/env';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { Friendship } from './friendship.entity';
import { DailyAnalytics } from './daily-analytics.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  // EKLENDİ: Friendship tablosu TypeOrmModule içine yazıldı
  imports: [
    TypeOrmModule.forFeature([User, Friendship, DailyAnalytics]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = getConfigString(
          configService,
          'JWT_EXPIRES_IN',
          '7d',
        ) as SignOptions['expiresIn'];

        return {
          secret: getJwtSecret(configService),
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  providers: [UsersService, NotificationsService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
