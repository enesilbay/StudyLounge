import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lobby } from '../lobbies/lobby.entity';
import { DailyAnalytics } from '../users/daily-analytics.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { StudySession } from './study-session.entity';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';
import { Subject } from './subject.entity';
import { Task } from './task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

/** Faz 2: dersler, oturum geçmişi, hedefler ve görevler. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Subject, StudySession, Task, DailyAnalytics, User, Lobby]),
    UsersModule,
  ],
  controllers: [StudyController, TasksController],
  providers: [StudyService, TasksService],
  exports: [StudyService],
})
export class StudyModule {}
