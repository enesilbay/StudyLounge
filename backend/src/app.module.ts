import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity'; 
import { Friendship } from './users/friendship.entity'; // 1. Friendship import edildi
import { UsersModule } from './users/users.module';
import { SensorsGateway } from './sensors.gateway'; 
import { LobbiesModule } from './lobbies/lobbies.module';
import { Lobby } from './lobbies/lobby.entity';
import { MessagesModule } from './messages/messages.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'enes_admin',
      password: 'studylounge_secret',
      database: 'studylounge',
      // 2. Friendship entity'si buraya eklendi
      entities: [User, Lobby, Friendship], 
      // 3. İleride yeni bir tablo eklersen bir daha hata vermesin diye bu ayar açıldı:
      autoLoadEntities: true, 
      synchronize: true,
    }),
    UsersModule,
    LobbiesModule, 
    MessagesModule,
    AuthModule,
  ],
  controllers: [],
  providers: [SensorsGateway], 
})
export class AppModule {}