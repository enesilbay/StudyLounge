import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  roomName: string;
}
