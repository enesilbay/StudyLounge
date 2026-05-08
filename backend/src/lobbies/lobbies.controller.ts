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

  @Post('verify-password')
  async verifyPassword(@Body() body: { lobbyId: number; password?: string }) {
    return this.lobbiesService.verifyPassword(body.lobbyId, body.password);
  }
}
