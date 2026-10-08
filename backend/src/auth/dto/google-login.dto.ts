import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GoogleLoginDto {
  /** Google Identity Services'in verdigi ID token (JWT). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  credential: string;
}
