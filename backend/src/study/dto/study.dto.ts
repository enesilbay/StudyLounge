import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Ders renkleri web'de tema token'larına çevrilen anahtarlardır (sabit hex yok). */
export const SUBJECT_COLORS = ['blue', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'violet', 'red'] as const;
export type SubjectColor = (typeof SUBJECT_COLORS)[number];

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateSubjectDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsIn(SUBJECT_COLORS)
  color?: SubjectColor;
}

export class UpdateSubjectDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsIn(SUBJECT_COLORS)
  color?: SubjectColor;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class SessionsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

export class UpdateGoalsDto {
  /** Günlük hedef (dakika), 0 = kapalı, en fazla 12 saat. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  dailyGoalMinutes?: number;

  /** Haftalık hedef (dakika), 0 = kapalı, en fazla 84 saat. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5040)
  weeklyGoalMinutes?: number;
}

export class CreateTaskDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subjectId?: number | null;

  @IsOptional()
  @IsBoolean()
  current?: boolean;
}

export class UpdateTaskDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsBoolean()
  current?: boolean;

  /** null gönderilirse görev dersten ayrılır. */
  @IsOptional()
  @IsInt()
  subjectId?: number | null;
}

export class CreateScheduledSessionDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title: string;

  @IsDateString()
  startsAt: string;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(240)
  durationMinutes: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lobbyId?: number;

  /** Davet edilecek arkadaşlar (en fazla 10). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  inviteeIds?: number[];
}

export class RespondInviteDto {
  @IsIn(['accepted', 'declined'])
  status: 'accepted' | 'declined';
}
