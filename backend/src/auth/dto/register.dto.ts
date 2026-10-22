import {
  IsEmail,
  IsIn,
  IsOptional,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AVATAR_GROUPS } from '../../users/avatar-characters';
import type { AvatarGroup } from '../../users/avatar-characters';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message:
      'Kullanici adinda sadece harf, rakam ve alt cizgi (_) kullanilabilir.',
  })
  username: string;

  @IsEmail()
  @MaxLength(120)
  email: string;

  @IsString()
  @MinLength(8, { message: 'Şifreniz en az 8 karakter olmalıdır.' })
  @MaxLength(72)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  fullName: string;

  /**
   * Istege bagli: baslangic avatarinin secilecegi grup. Kaydedilmez; yalnizca
   * bu gruptan rastgele bir karakter avatarUrl'e yazilir.
   */
  @IsOptional()
  @IsIn(AVATAR_GROUPS)
  avatarGroup?: AvatarGroup;
}
