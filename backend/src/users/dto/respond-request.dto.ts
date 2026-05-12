import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class RespondRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestId: number;

  @IsIn(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';
}
