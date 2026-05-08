import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as os from 'os';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. CORS Ayari: Olmazsa olmaz. Mobil cihazlarin baglanti izni almasini saglar.
  app.enableCors();

  // 2. Statik Dosyalar: PDF ve diger yuklemelerin URL uzerinden acilmasi icin.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const port = 3000;

  // KRITIK GUNCELLEME: '0.0.0.0' ekleyerek agdaki diger cihazlarin (telefonun)
  // bu bilgisayara erisebilmesine izin veriyoruz.
  await app.listen(port, '0.0.0.0');

  // IP Adresini dinamik bulma
  const interfaces = os.networkInterfaces();
  let localIp = '127.0.0.1';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (
        iface.family === 'IPv4' &&
        !iface.internal &&
        !name.includes('vEthernet') &&
        !name.includes('Virtual')
      ) {
        localIp = iface.address;
        break;
      }
    }
  }

  console.log(`---`);
  console.log(`🚀 StudyLounge Backend Yayinda!`);
  console.log(`📡 Ag Adresin (Terminaline Gore): http://${localIp}:${port}`);
  console.log(`📁 Statik Dosyalar: http://${localIp}:${port}/uploads/`);
  console.log(`---`);
}
bootstrap().catch((err) => {
  console.error('Uygulama başlatılamadı:', err);
});
