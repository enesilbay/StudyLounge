import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../moderation/roles.guard';
import { User } from '../users/user.entity';
import { AdminUsersService } from './admin-users.service';
import {
  ActionsQueryDto,
  AdminDeleteUserDto,
  AdminReasonOnlyDto,
  GrantPremiumDto,
  SetRoleDto,
  UsersQueryDto,
} from './dto/admin-users.dto';

/**
 * Yönetici: kullanıcı listesi, ayrıntı ve hesap işlemleri. Yalnızca `admin` rolüne açık.
 * Susturma ve yasak uçları ModerationModule'deki `admin/users/:id/mute|ban`'dadır.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get()
  list(@Query() query: UsersQueryDto) {
    return this.adminUsers.list(query);
  }

  // `:id`'den önce tanımlanmalı.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="studylounge-kullanicilar.csv"',
  )
  export(@CurrentUser() admin: User, @Query() query: UsersQueryDto) {
    return this.adminUsers.exportCsv(admin.id, query);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.adminUsers.detail(id);
  }

  @Patch(':id/role')
  setRole(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetRoleDto,
  ) {
    return this.adminUsers.setRole(admin.id, id, body.role, body.reason);
  }

  @Post(':id/premium')
  grantPremium(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GrantPremiumDto,
  ) {
    return this.adminUsers.grantPremium(admin.id, id, body.plan, body.reason);
  }

  @Post(':id/premium/revoke')
  revokePremium(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminReasonOnlyDto,
  ) {
    return this.adminUsers.revokePremium(admin.id, id, body.reason);
  }

  @Post(':id/verify-email')
  verifyEmail(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminReasonOnlyDto,
  ) {
    return this.adminUsers.verifyEmail(admin.id, id, body.reason);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Delete(':id')
  remove(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminDeleteUserDto,
  ) {
    return this.adminUsers.deleteUser(
      admin.id,
      id,
      body.confirmation,
      body.reason,
    );
  }
}

/** Yönetici işlem kaydı (salt okur). */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/actions')
export class AdminActionsController {
  constructor(private readonly audit: AdminAuditService) {}

  @Get()
  list(@Query() query: ActionsQueryDto) {
    return this.audit.list({
      action: query.action,
      targetId: query.targetId,
      page: query.page,
      pageSize: 50,
    });
  }
}
