import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RtcService } from './rtc.service';

@UseGuards(JwtAuthGuard)
@Controller('rtc')
export class RtcController {
  constructor(private readonly rtcService: RtcService) {}

  @Get('ice-servers')
  getIceServers() {
    return { iceServers: this.rtcService.getIceServers() };
  }
}
