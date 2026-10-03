import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoomTimerService } from './room-timer.service';

@UseGuards(JwtAuthGuard)
@Controller('room-timer')
export class RoomTimerController {
  constructor(private readonly roomTimerService: RoomTimerService) {}

  /** Odada calisan ortak sayac varsa durumunu dondurur (yoksa timer: null). */
  @Get(':roomName')
  getTimer(@Param('roomName') roomName: string) {
    return { timer: this.roomTimerService.snapshot(roomName) };
  }
}
