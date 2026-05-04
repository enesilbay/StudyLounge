import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  // Express altyapısını kullandığımızı belirtiyoruz
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.enableCors();

  // ── YENİ: Fotoğrafları dış dünyaya (mobil uygulamamıza) açıyoruz ──
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(3000);
}
bootstrap();