import { Module } from '@nestjs/common';
import { AdminAuditModule } from '../admin-audit/admin-audit.module';
import { RolesGuard } from '../moderation/roles.guard';
import { UsersModule } from '../users/users.module';
import { AdminOverviewService } from './admin-overview.service';
import { AdminUsersService } from './admin-users.service';
import { AdminOverviewController } from './admin.controller';
import {
  AdminActionsController,
  AdminUsersController,
} from './admin-users.controller';

/** Yönetici paneli: genel bakış, kullanıcı yönetimi ve işlem kaydı. */
@Module({
  imports: [UsersModule, AdminAuditModule],
  controllers: [
    AdminOverviewController,
    AdminUsersController,
    AdminActionsController,
  ],
  providers: [AdminOverviewService, AdminUsersService, RolesGuard],
})
export class AdminModule {}
