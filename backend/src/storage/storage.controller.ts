import { Controller, Get, Param, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { StorageService } from './storage.service';

/** Yuklenen dosyalari sunar. Adresler eskisi gibi /uploads/<anahtar>; depo gizli kalir. */
@SkipThrottle()
@Controller('uploads')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get(':key')
  async serve(@Param('key') key: string, @Res() res: Response) {
    const file = await this.storageService.get(key);
    const inline =
      file.contentType.startsWith('image/') ||
      file.contentType === 'application/pdf';
    res.setHeader('Content-Type', file.contentType);
    if (file.contentLength !== undefined) {
      res.setHeader('Content-Length', String(file.contentLength));
    }
    // Anahtarlar benzersiz ve degismez; tarayici uzun sure onbellege alabilir.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // Resim ve PDF sayfada acilir; diger belgeler indirilir (tarayicida calistirilmaz).
    res.setHeader('Content-Disposition', inline ? 'inline' : 'attachment');
    file.body.on('error', () => res.destroy());
    file.body.pipe(res);
  }
}
