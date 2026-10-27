import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LobbiesController } from './lobbies.controller';
import { LobbiesService } from './lobbies.service';
import { LobbyCleanupService } from './lobby-cleanup.service';
import { Lobby } from './lobby.entity';
import { LobbyAccess } from './lobby-access.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lobby, LobbyAccess]), UsersModule],
  controllers: [LobbiesController],
  providers: [LobbiesService, LobbyCleanupService],
  exports: [LobbiesService],
})
export class LobbiesModule {}
