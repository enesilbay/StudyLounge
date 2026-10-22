import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { join } from 'path';
import { AVATAR_FILE_PATTERN } from './avatar-characters';

/** Hazir karakter avatarlarini sunar (/avatars/avatar-01.webp ... avatar-10.webp). */
@SkipThrottle()
@Controller('avatars')
export class AvatarsController {
  @Get(':file')
  serve(@Param('file') file: string, @Res() res: Response) {
    if (!AVATAR_FILE_PATTERN.test(file)) {
      throw new NotFoundException();
    }
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.sendFile(join(__dirname, '..', 'assets', 'avatars', file));
  }
}
