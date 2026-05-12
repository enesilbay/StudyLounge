import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class VerifyLobbyPasswordDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lobbyId: number;

  @IsOptional()
  @IsString()
  @MaxLength(72)
  password?: string;
}
