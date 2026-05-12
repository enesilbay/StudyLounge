import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateAccountSettingsDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message:
      'Kullanici adinda sadece harf, rakam ve alt cizgi (_) kullanilabilir.',
  })
  username?: string;

  @ValidateIf((dto: UpdateAccountSettingsDto) => !!dto.newPassword)
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  newPassword?: string;
}
