import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { LobbiesService } from './lobbies.service';
import { Lobby } from './lobby.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
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