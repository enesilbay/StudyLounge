import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import {
  AdminReasonDto,
  CreateReportDto,
  MuteUserDto,
  ReportsQueryDto,
  ResolveReportDto,
} from './dto/moderation.dto';
import { ModerationService } from './moderation.service';
import { Roles, RolesGuard } from './roles.guard';

@UseGuards(JwtAuthGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('blocks')
  listBlocked(@CurrentUser() user: User) {
    return this.moderationService.listBlocked(user.id);
  }

  @Post('blocks/:userId')
  block(
    @CurrentUser() user: User,
    @Param('userId', ParseIntPipe) targetId: number,
  ) {
    return this.moderationService.block(user.id, targetId);
  }

  @Delete('blocks/:userId')
  unblock(
    @CurrentUser() user: User,
    @Param('userId', ParseIntPipe) targetId: number,
  ) {
    return this.moderationService.unblock(user.id, targetId);
  }

  @Post('reports')
  report(@CurrentUser() user: User, @Body() body: CreateReportDto) {
    return this.moderationService.report(user.id, body);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('reports')
  reports(@Query() query: ReportsQueryDto) {
    return this.moderationService.listReports(query.status ?? 'open');
  }

  @Patch('reports/:id')
  resolve(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ResolveReportDto,
  ) {
    return this.moderationService.resolveReport(admin.id, id, body.status);
  }

  @Post('users/:id/mute')
  mute(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: MuteUserDto,
  ) {
    return this.moderationService.muteUser(
      admin.id,
      id,
      body.hours,
      body.reason,
    );
  }

  @Delete('users/:id/mute')
  unmute(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminReasonDto,
  ) {
    return this.moderationService.unmuteUser(admin.id, id, body.reason);
  }

  @Post('users/:id/ban')
  ban(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminReasonDto,
  ) {
    return this.moderationService.banUser(admin.id, id, body.reason);
  }

  @Delete('users/:id/ban')
  unban(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminReasonDto,
  ) {
    return this.moderationService.unbanUser(admin.id, id, body.reason);
  }
}
