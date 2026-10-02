import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhiteboardService } from './whiteboard.service';

@UseGuards(JwtAuthGuard)
@Controller('whiteboard')
export class WhiteboardController {
  constructor(private readonly whiteboardService: WhiteboardService) {}

  /** Odada acik bir PDF tahtasi varsa durumunu dondurur (yoksa board: null). */
  @Get(':roomName')
  getBoard(@Param('roomName') roomName: string) {
    return { board: this.whiteboardService.getState(roomName) };
  }
}
