import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity'; 
import { UsersModule } from './users/users.module';
import { SensorsGateway } from './sensors.gateway'; // 1. Gateway import edildi
import { LobbiesModule } from './lobbies/lobbies.module';
import { Lobby } from './lobbies/lobby.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'enes_admin',
      password: 'studylounge_secret',
      database: 'studylounge',
      entities: [User, Lobby], // Hem User hem de Lobby burada tanımlı olmalı
      synchronize: true,
    }),
    UsersModule,
    LobbiesModule, // LobbiesModule buraya eklendi
  ],
  controllers: [],
  providers: [SensorsGateway], // Gateway buraya eklendi
})
export class AppModule {}