import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../moderation/roles.guard';
import { AdminOverviewService } from './admin-overview.service';

/** Yönetici paneli: genel bakış. Yalnızca `admin` rolüne açık. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/overview')
export class AdminOverviewController {
  constructor(private readonly overviewService: AdminOverviewService) {}

  @Get()
  overview() {
    return this.overviewService.getOverview();
  }
}
