import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import { CreateScheduledSessionDto, RespondInviteDto } from './dto/study.dto';
import { ScheduledSessionsService } from './scheduled-sessions.service';

@UseGuards(JwtAuthGuard)
@Controller('scheduled-sessions')
export class ScheduledSessionsController {
  constructor(private readonly scheduledSessionsService: ScheduledSessionsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.scheduledSessionsService.listUpcoming(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() body: CreateScheduledSessionDto) {
    return this.scheduledSessionsService.create(user.id, body);
  }

  @Post(':id/respond')
  respond(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number, @Body() body: RespondInviteDto) {
    return this.scheduledSessionsService.respond(user.id, id, body.status);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.scheduledSessionsService.remove(user.id, id);
  }
}
