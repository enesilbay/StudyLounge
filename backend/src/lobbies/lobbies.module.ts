import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LobbiesController } from './lobbies.controller';
import { LobbiesService } from './lobbies.service';
import { Lobby } from './lobby.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lobby])],
  controllers: [LobbiesController],
  providers: [LobbiesService],
})
export class LobbiesModule {}
