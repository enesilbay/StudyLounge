import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Oda sahibinin değiştirebileceği ayarlar. Ad değiştirilemez: sohbet geçmişi ve
 * canlı oda durumu (masalar, tahta, sayaç) oda adına bağlı.
 */
export class UpdateLobbyDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  /** Şifreli odaya geçerken ya da şifreyi değiştirirken gönderilir. */
  @IsOptional()
  @IsString()
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(250)
  maxUsers?: number;
}
