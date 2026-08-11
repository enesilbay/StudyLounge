import { Module } from '@nestjs/common';
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
import { MailModule } from './mail/mail.module';
import { MessagesModule } from './messages/messages.module';
import { Message } from './messages/message.entity';
import { DirectMessage } from './messages/direct-message.entity';
import { NotificationsService } from './notifications/notifications.service';
import { SensorsGateway } from './sensors.gateway';
import { DailyAnalytics } from './users/daily-analytics.entity';
import { Friendship } from './users/friendship.entity';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbHost = getConfigString(configService, 'DB_HOST', 'localhost');
        const dbSsl =
          getConfigBoolean(configService, 'DB_SSL', false) ||
          dbHost.includes('neon.tech');
        const dbName = getConfigString(configService, 'DB_NAME', 'studylounge');
        const dbUser = getConfigString(configService, 'DB_USER', 'enes_admin');

        return {
          type: 'postgres',
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
            Friendship,
            DailyAnalytics,
            Message,
            DirectMessage,
          ],
          autoLoadEntities: true,
          synchronize: getConfigString(configService, 'NODE_ENV', 'development') !== 'production',
        };
      },
    }),
    UsersModule,
    LobbiesModule,
    MessagesModule,
    MailModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, SensorsGateway, NotificationsService],
})
export class AppModule {}
