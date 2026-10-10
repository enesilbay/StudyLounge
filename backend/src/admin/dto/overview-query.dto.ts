import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { OVERVIEW_PERIODS } from '../admin-overview.service';
import type { OverviewPeriod } from '../admin-overview.service';

export class OverviewQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(OVERVIEW_PERIODS)
  period?: OverviewPeriod;
}
