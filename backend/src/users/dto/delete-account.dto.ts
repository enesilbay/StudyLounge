import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  /** Onay icin kullanici adinin aynisi yazilir. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  confirmation: string;

  /** Sifresi olan hesaplarda zorunlu; yalnizca Google ile giris yapan hesapta sifre yoktur. */
  @IsOptional()
  @IsString()
  @MaxLength(72)
  password?: string;
}
