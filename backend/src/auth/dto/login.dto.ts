import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  /**
   * E-posta ya da kullanici adi. Alan adi, eski istemcilerle (mobil, onceki web)
   * uyumlu kalsin diye "email" olarak korunur.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
