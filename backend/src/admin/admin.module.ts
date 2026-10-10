import { Module } from '@nestjs/common';
import { RolesGuard } from '../moderation/roles.guard';
import { AdminOverviewService } from './admin-overview.service';
import { AdminOverviewController } from './admin.controller';

/** Yönetici paneli için salt okur özetler (genel bakış). */
@Module({
  controllers: [AdminOverviewController],
  providers: [AdminOverviewService, RolesGuard],
})
export class AdminModule {}
