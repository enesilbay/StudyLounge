import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  getConfigBoolean,
  getConfigNumber,
  getConfigString,
} from './config/env';
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
        return {
          type: 'postgres',
          host: getConfigString(configService, 'DB_HOST', 'localhost'),
          port: getConfigNumber(configService, 'DB_PORT', 5432),
          username: getConfigString(configService, 'DB_USER', 'enes_admin'),
          password: getConfigString(
            configService,
            'DB_PASSWORD',
            'studylounge_secret',
          ),
          database: getConfigString(configService, 'DB_NAME', 'studylounge'),
          ssl: getConfigBoolean(configService, 'DB_SSL', false)
            ? { rejectUnauthorized: false }
            : false,
          entities: [
            User,
            Lobby,
            Friendship,
            DailyAnalytics,
            Message,
            DirectMessage,
          ],
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    UsersModule,
    LobbiesModule,
    MessagesModule,
    MailModule,
    AuthModule,
  ],
  controllers: [],
  providers: [SensorsGateway, NotificationsService],
})
export class AppModule {}
