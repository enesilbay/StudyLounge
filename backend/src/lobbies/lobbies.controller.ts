import { Controller, Get, Post, Body } from '@nestjs/common';
import { LobbiesService } from './lobbies.service';
import { Lobby } from './lobby.entity';

@Controller('lobbies')
export class LobbiesController {
  constructor(private readonly lobbiesService: LobbiesService) {}

  @Get()
  async getAllLobbies() {
    return this.lobbiesService.findAll();
  }

  @Post()
  async createLobby(@Body() lobbyData: Partial<Lobby>) {
    return this.lobbiesService.create(lobbyData);
  }
}