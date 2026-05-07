import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { Friendship } from './friendship.entity'; // EKLENDİ
import { DailyAnalytics } from './daily-analytics.entity';

@Module({
  // EKLENDİ: Friendship tablosu TypeOrmModule içine yazıldı
  imports: [TypeOrmModule.forFeature([User, Friendship, DailyAnalytics])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}