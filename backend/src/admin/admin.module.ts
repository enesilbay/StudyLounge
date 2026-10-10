import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from '../feedback/feedback.entity';
import { Lobby } from '../lobbies/lobby.entity';
import { Report } from '../moderation/report.entity';
import { RolesGuard } from '../moderation/roles.guard';
import { StudySession } from '../study/study-session.entity';
import { User } from '../users/user.entity';
import { AdminOverviewService } from './admin-overview.service';
import { AdminOverviewController } from './admin.controller';

/** Yönetici paneli için salt okur özetler (genel bakış). */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, StudySession, Lobby, Report, Feedback]),
  ],
  controllers: [AdminOverviewController],
  providers: [AdminOverviewService, RolesGuard],
})
export class AdminModule {}
