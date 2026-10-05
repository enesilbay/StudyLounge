import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lobby } from '../lobbies/lobby.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { DailyAnalytics } from '../users/daily-analytics.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { ScheduledSession, ScheduledSessionInvite } from './scheduled-session.entity';
import { ScheduledSessionsController } from './scheduled-sessions.controller';
import { ScheduledSessionsService } from './scheduled-sessions.service';
import { StudySession } from './study-session.entity';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';
import { Subject } from './subject.entity';
import { Task } from './task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

/** Faz 2: dersler, oturum geçmişi, hedefler, görevler ve planlı oturumlar. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Subject, StudySession, Task, ScheduledSession, ScheduledSessionInvite, DailyAnalytics, User, Lobby]),
    UsersModule,
  ],
  controllers: [StudyController, TasksController, ScheduledSessionsController],
  providers: [StudyService, TasksService, ScheduledSessionsService, NotificationsService],
  exports: [StudyService],
})
export class StudyModule {}
