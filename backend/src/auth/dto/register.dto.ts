import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

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
}
