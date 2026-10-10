import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ADMIN_ACTIONS } from '../../admin-audit/admin-action.entity';
import type { AdminActionType } from '../../admin-audit/admin-action.entity';
import {
  PREMIUM_GRANTS,
  USER_FILTERS,
  USER_ROLES,
  USER_SORTS,
} from '../admin-users.rules';
import type {
  PremiumGrant,
  UserFilter,
  UserRole,
  UserSort,
} from '../admin-users.rules';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UsersQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  /** Virgülle ayrılmış filtreler, ör. `premium,unverified`. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : value,
  )
  @IsIn(USER_FILTERS, { each: true })
  filters?: UserFilter[];

  @IsOptional()
  @IsIn(USER_SORTS)
  sort?: UserSort;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

class ReasonDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class SetRoleDto extends ReasonDto {
  @IsIn(USER_ROLES)
  role: UserRole;
}

export class GrantPremiumDto extends ReasonDto {
  @IsIn(PREMIUM_GRANTS)
  plan: PremiumGrant;
}

export class AdminReasonOnlyDto extends ReasonDto {}

export class AdminDeleteUserDto {
  /** Kullanıcı adı aynen yazılmalı. */
  @IsString()
  @IsNotEmpty()
  confirmation: string;

  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Silme gerekçesini yaz.' })
  @MaxLength(500)
  reason: string;
}

export class ActionsQueryDto {
  @IsOptional()
  @IsIn(ADMIN_ACTIONS)
  action?: AdminActionType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  targetId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;
}
