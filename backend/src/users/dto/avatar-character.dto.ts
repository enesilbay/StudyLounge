import { IsInt, Max, Min } from 'class-validator';
import { AVATAR_CHARACTER_COUNT } from '../avatar-characters';

/** Hazir karakter avatari secimi. */
export class AvatarCharacterDto {
  @IsInt()
  @Min(1)
  @Max(AVATAR_CHARACTER_COUNT)
  character: number;
}
