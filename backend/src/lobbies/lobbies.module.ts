import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LobbiesController } from './lobbies.controller';
import { LobbiesService } from './lobbies.service';
import { Lobby } from './lobby.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lobby]), UsersModule],
  controllers: [LobbiesController],
  providers: [LobbiesService],
  exports: [LobbiesService],
})
export class LobbiesModule {}
