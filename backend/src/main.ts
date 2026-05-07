import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. CORS Ayarı: Olmazsa olmaz. Mobil cihazların bağlantı izni almasını sağlar.
  app.enableCors();

  // 2. Statik Dosyalar: PDF ve diğer yüklemelerin URL üzerinden açılması için.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const port = 3000;

  // 🚀 KRİTİK GÜNCELLEME: '0.0.0.0' ekleyerek ağdaki diğer cihazların (telefonun) 
  // bu bilgisayara erişebilmesine izin veriyoruz.
  await app.listen(port, '0.0.0.0');
  
  console.log(`---`);
  console.log(`🚀 StudyLounge Backend Yayında!`);
  console.log(`📡 Ağ Adresin (Terminaline Göre): http://192.168.1.17:${port}`);
  console.log(`📁 Statik Dosyalar: http://192.168.1.17:${port}/uploads/`);
  console.log(`---`);
}
bootstrap();