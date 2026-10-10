import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { Message } from '../messages/message.entity';
import { Friendship } from '../users/friendship.entity';
import { User } from '../users/user.entity';
import { Block } from './block.entity';
import { AdminController, ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { Report } from './report.entity';
import { RolesGuard } from './roles.guard';

/**
 * Engelleme, şikayet ve yönetici işlemleri. Diğer modüllere bağımlı değildir
 * (yalnızca entity'ler); böylece Users/Messages modülleri bunu döngüsüz kullanır.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Block, Report, User, Friendship, Message]),
    AdminAuditModule,
  ],
  controllers: [ModerationController, AdminController],
  providers: [ModerationService, RolesGuard],
  exports: [ModerationService],
})
export class ModerationModule {}
