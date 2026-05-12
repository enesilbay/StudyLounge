import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateLobbyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  icon: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ValidateIf((dto: CreateLobbyDto) => dto.isPrivate === true)
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(250)
  maxUsers?: number;

  @IsOptional()
  @IsBoolean()
  isPremiumOnly?: boolean;
}
