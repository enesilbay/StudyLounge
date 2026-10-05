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
import { RoomTimerModule } from './room-timer/room-timer.module';

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
    RoomTimerModule,
  ],
  controllers: [AppController],
  providers: [AppService, SensorsGateway, NotificationsService],
})
export class AppModule {}
//test
