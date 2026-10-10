import { Module } from '@nestjs/common';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  getConfigBoolean,
  getConfigNumber,
  getConfigString,
} from './config/env';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { LobbiesModule } from './lobbies/lobbies.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Lobby } from './lobbies/lobby.entity';
import { LobbyAccess } from './lobbies/lobby-access.entity';
import { MailModule } from './mail/mail.module';
import { MessagesModule } from './messages/messages.module';
import { Message } from './messages/message.entity';
import { DirectMessage } from './messages/direct-message.entity';
import { NotificationsService } from './notifications/notifications.service';
import { PaymentsModule } from './payments/payments.module';
import { RtcModule } from './rtc/rtc.module';
import { SensorsGateway } from './sensors.gateway';
import { DailyAnalytics } from './users/daily-analytics.entity';
import { Friendship } from './users/friendship.entity';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';
import { WhiteboardModule } from './whiteboard/whiteboard.module';
import { StorageModule } from './storage/storage.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AdminModule } from './admin/admin.module';
import { RoomTimerModule } from './room-timer/room-timer.module';
import { ScheduleModule } from '@nestjs/schedule';
import { StudyModule } from './study/study.module';
import { ModerationModule } from './moderation/moderation.module';
import { LeagueModule } from './league/league.module';
import { WeeklyResult } from './league/weekly-result.entity';
import { Feedback } from './feedback/feedback.entity';
import { Payment } from './payments/payment.entity';
import { Block } from './moderation/block.entity';
import { Report } from './moderation/report.entity';
import { Subject } from './study/subject.entity';
import { StudySession } from './study/study-session.entity';
import { Task } from './study/task.entity';
import { ScheduledSession, ScheduledSessionInvite } from './study/scheduled-session.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Render/Neon gibi servisler baglantiyi tek URL olarak verir; varsa
        // DB_HOST/DB_USER/... yerine o kullanilir.
        const databaseUrl = getConfigString(configService, 'DATABASE_URL', '');
        const dbHost = databaseUrl
          ? new URL(databaseUrl).hostname
          : getConfigString(configService, 'DB_HOST', 'localhost');
        const dbSsl =
          getConfigBoolean(configService, 'DB_SSL', false) ||
          databaseUrl.includes('sslmode=require') ||
          dbHost.includes('neon.tech') ||
          dbHost.includes('render.com') ||
          dbHost.includes('render.internal') ||
          dbHost.startsWith('dpg-');
        const dbName = getConfigString(configService, 'DB_NAME', 'studylounge');
        const dbUser = getConfigString(configService, 'DB_USER', 'enes_admin');

        return {
          type: 'postgres',
          url: databaseUrl || undefined,
          host: dbHost,
          port: getConfigNumber(configService, 'DB_PORT', 5432),
          username: dbUser,
          password: getConfigString(
            configService,
            'DB_PASSWORD',
            'studylounge_secret',
          ),
          database: dbName,
          ssl: dbSsl ? { rejectUnauthorized: false } : false,
          entities: [
            User,
            Lobby,
            LobbyAccess,
            Friendship,
            DailyAnalytics,
            Message,
            DirectMessage,
            Subject,
            StudySession,
            Task,
            ScheduledSession,
            ScheduledSessionInvite,
            Block,
            Report,
            WeeklyResult,
            Feedback,
            Payment,
          ],
          autoLoadEntities: true,
          // Bos bir veritabaninda (or. yeni Render PostgreSQL) tablolari kurmak
          // icin DB_RUN_MIGRATIONS=true verilir; bekleyen migration'lar acilista
          // sirayla calisir. Varsayilan kapali: mevcut veritabanlarina dokunmaz.
          migrations: [join(__dirname, 'migrations', '*.js')],
          migrationsRun: getConfigBoolean(
            configService,
            'DB_RUN_MIGRATIONS',
            false,
          ),
          synchronize:
            getConfigString(configService, 'NODE_ENV', 'development') !==
            'production',
        };
      },
    }),
    UsersModule,
    LobbiesModule,
    MessagesModule,
    MailModule,
    AuthModule,
    PaymentsModule,
    RtcModule,
    WhiteboardModule,
    StorageModule,
    FeedbackModule,
    AdminModule,
    RoomTimerModule,
    ScheduleModule.forRoot(),
    StudyModule,
    ModerationModule,
    LeagueModule,
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }],
      errorMessage: 'Çok fazla deneme yaptın. Bir dakika bekleyip tekrar dene.',
      // Uçtan uca testler kısa sürede çok giriş yapar; yalnızca üretim dışında kapatılabilir.
      skipIf: () => process.env.THROTTLE_DISABLED === 'true' && process.env.NODE_ENV !== 'production',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SensorsGateway,
    NotificationsService,
    // Tum HTTP uclari icin IP basina genel sinir; auth uclari kendi siki sinirlarini kullanir.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
//test
