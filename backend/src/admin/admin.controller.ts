import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../moderation/roles.guard';
import { AdminOverviewService } from './admin-overview.service';
import { OverviewQueryDto } from './dto/overview-query.dto';

/** Yönetici paneli: genel bakış. Yalnızca `admin` rolüne açık. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/overview')
export class AdminOverviewController {
  constructor(private readonly overviewService: AdminOverviewService) {}

  @Get()
  overview(@Query() query: OverviewQueryDto) {
    return this.overviewService.getOverview(query.period ?? 30);
  }

  /** Menüdeki rozetler için hafif sayım. */
  @Get('pending')
  pending() {
    return this.overviewService.getPending();
  }
}
