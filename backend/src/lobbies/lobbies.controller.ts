import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import { CreateLobbyDto } from './dto/create-lobby.dto';
import { UpdateLobbyDto } from './dto/update-lobby.dto';
import { VerifyLobbyPasswordDto } from './dto/verify-lobby-password.dto';
import { LobbiesService } from './lobbies.service';

@UseGuards(JwtAuthGuard)
@Controller('lobbies')
export class LobbiesController {
  constructor(private readonly lobbiesService: LobbiesService) {}

  @Get()
  async getAllLobbies() {
    return this.lobbiesService.findAll();
  }

  @Post()
  async createLobby(
    @CurrentUser() user: User,
    @Body() lobbyData: CreateLobbyDto,
  ) {
    return this.lobbiesService.create(lobbyData, user.id);
  }

  // Oda sahibi: açıklama, kategori, şifre ve kapasite. Çıkarma/kilitleme/kapatma socket ile yapılır.
  @Patch(':id')
  async updateLobby(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLobbyDto,
  ) {
    return this.lobbiesService.update(user.id, id, body);
  }

  @Post('verify-password')
  async verifyPassword(
    @CurrentUser() user: User,
    @Body() body: VerifyLobbyPasswordDto,
  ) {
    return this.lobbiesService.verifyPassword(
      body.lobbyId,
      body.password,
      user.id,
    );
  }
}
