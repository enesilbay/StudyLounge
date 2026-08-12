import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @MaxLength(120)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  token: string;

  @IsString()
  @MinLength(8, { message: 'Yeni şifreniz en az 8 karakter olmalıdır.' })
  @MaxLength(72)
  newPass: string;
}
