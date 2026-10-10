import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { FEEDBACK_KINDS } from '../feedback.entity';
import type { FeedbackKind } from '../feedback.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateFeedbackDto {
  @IsIn(FEEDBACK_KINDS)
  kind: FeedbackKind;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Mesajını yaz.' })
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  page?: string;
}

export class FeedbackQueryDto {
  @IsOptional()
  @IsIn(['open', 'done', 'all'])
  status?: 'open' | 'done' | 'all';
}

export class UpdateFeedbackDto {
  @IsIn(['open', 'done'])
  status: 'open' | 'done';
}
