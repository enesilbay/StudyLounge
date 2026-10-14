import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ANNOUNCEMENT_TONES } from './announcement.entity';
import type { AnnouncementTone } from './announcement.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAnnouncementDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Duyuru metnini yaz.' })
  @MaxLength(280)
  message: string;

  @IsOptional()
  @IsIn(ANNOUNCEMENT_TONES)
  tone?: AnnouncementTone;

  /** Boşsa hemen başlar. */
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsISO8601()
  endsAt: string;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Duyuru metnini yaz.' })
  @MaxLength(280)
  message?: string;

  @IsOptional()
  @IsIn(ANNOUNCEMENT_TONES)
  tone?: AnnouncementTone;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}
