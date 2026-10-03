import { Module } from '@nestjs/common';
import { RoomTimerController } from './room-timer.controller';
import { RoomTimerService } from './room-timer.service';

@Module({
  controllers: [RoomTimerController],
  providers: [RoomTimerService],
  exports: [RoomTimerService],
})
export class RoomTimerModule {}
