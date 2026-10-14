import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../moderation/roles.guard';
import { User } from '../users/user.entity';
import { AdminRoomsService } from './admin-rooms.service';
import {
  AdminReasonOnlyDto,
  RoomLockDto,
  RoomOwnerDto,
} from './dto/admin-users.dto';

/** Yönetici: oda listesi ve oda işlemleri. Yalnızca `admin` rolüne açık. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/rooms')
export class AdminRoomsController {
  constructor(private readonly rooms: AdminRoomsService) {}

  @Get()
  list() {
    return this.rooms.list();
  }

  @Patch(':id/lock')
  setLocked(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RoomLockDto,
  ) {
    return this.rooms.setLocked(admin.id, id, body.locked, body.reason);
  }

  @Patch(':id/owner')
  transferOwner(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RoomOwnerDto,
  ) {
    return this.rooms.transferOwner(admin.id, id, body.userId, body.reason);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Delete(':id')
  close(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminReasonOnlyDto,
  ) {
    return this.rooms.close(admin.id, id, body.reason);
  }
}
