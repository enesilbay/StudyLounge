import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../moderation/roles.guard';
import { User } from '../users/user.entity';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './announcements.dto';
import { AnnouncementsService } from './announcements.service';

/** Giriş yapmış herkes: şu an yayındaki duyurular. */
@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get('active')
  active() {
    return this.announcements.active();
  }
}

/** Yönetici: duyuru yazma, düzenleme ve silme. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/announcements')
export class AdminAnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list() {
    return this.announcements.list();
  }

  @Post()
  create(@CurrentUser() admin: User, @Body() body: CreateAnnouncementDto) {
    return this.announcements.create(admin.id, body);
  }

  @Patch(':id')
  update(@CurrentUser() admin: User, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateAnnouncementDto) {
    return this.announcements.update(admin.id, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() admin: User, @Param('id', ParseIntPipe) id: number) {
    return this.announcements.remove(admin.id, id);
  }
}
