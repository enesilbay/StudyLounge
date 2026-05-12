import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UploadMessageFileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  roomName: string;
}
