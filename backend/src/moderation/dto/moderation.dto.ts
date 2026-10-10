import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { REPORT_REASONS } from '../report.entity';
import type { ReportReason } from '../report.entity';

export class CreateReportDto {
  @Type(() => Number)
  @IsInt()
  targetUserId: number;

  @IsIn(REPORT_REASONS)
  reason: ReportReason;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  details?: string;

  /** Oda mesajı şikayetinde mesajın id'si. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  messageId?: number;
}

export class ReportsQueryDto {
  @IsOptional()
  @IsIn(['open', 'resolved', 'dismissed', 'all'])
  status?: 'open' | 'resolved' | 'dismissed' | 'all';
}

export class ResolveReportDto {
  @IsIn(['resolved', 'dismissed'])
  status: 'resolved' | 'dismissed';
}

/** Yönetici işleminin gerekçesi; işlem kaydına yazılır. */
export class AdminReasonDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class MuteUserDto extends AdminReasonDto {
  /** Susturma süresi (saat), en fazla 30 gün. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  hours: number;
}
