import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { RolesGuard } from '../moderation/roles.guard';
import { Announcement } from './announcement.entity';
import { AdminAnnouncementsController, AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

/** Uygulama üstü duyurular ve yönetici ucu. */
@Module({
  imports: [TypeOrmModule.forFeature([Announcement]), AdminAuditModule],
  controllers: [AnnouncementsController, AdminAnnouncementsController],
  providers: [AnnouncementsService, RolesGuard],
})
export class AnnouncementsModule {}
