// Saat dilimsiz tarihleri her ortamda UTC oku/yaz (bkz. config/pg-utc.ts).
import './config/pg-utc';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as os from 'os';
import { ConfigService } from '@nestjs/config';
import { getConfigNumber, getConfigString } from './config/env';
import { parseCorsOrigins } from './config/cors';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Render gibi bir proxy arkasinda istek sinirlayici gercek istemci IP'sini gorsun.
  app.set('trust proxy', 1);
  // Guvenlik basliklari. /uploads dosyalari web istemcisinde (baska origin) acildigi icin
  // kaynaklar cross-origin okunabilir kalir.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 1. CORS Ayari: Production ortaminda * yerine acikca belirtilmis bir origin beklenir.
  const isProduction = configService.get('NODE_ENV') === 'production';
  const origins = parseCorsOrigins(
    configService.get('CORS_ORIGIN'),
    configService.get('CORS_ORIGIN_PATTERN'),
  );

  let originValue: (string | RegExp)[] | string | boolean = origins ?? '*';

  if (isProduction && !origins) {
    console.warn('WARNING: CORS_ORIGIN is not set properly for production. Disabling CORS origins.');
    originValue = false; // Production'da guvenlik geregi acikca belirtilmezse kapat
  }

  app.enableCors({
    origin: originValue,
  });

  // 2. Statik Dosyalar: PDF ve diger yuklemelerin URL uzerinden acilmasi icin.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const port = getConfigNumber(configService, 'PORT', 3000);
  const host = getConfigString(configService, 'HOST', '0.0.0.0');

  // KRITIK GUNCELLEME: '0.0.0.0' ekleyerek agdaki diger cihazlarin (telefonun)
  // bu bilgisayara erisebilmesine izin veriyoruz.
  await app.listen(port, host);

  // IP Adresini dinamik bulma
  const interfaces = os.networkInterfaces();
  let localIp = '127.0.0.1';
  // Öncelikle gerçek Ethernet/Wi‑Fi kartını bulmaya çalışıyoruz.
  // Docker/WSL sanal ağları (192.168.56.*, 172.* vb.) ve
  // "vEthernet"/"Virtual" isimli arayüzler atlanır.
  for (const name of Object.keys(interfaces)) {
    // Atla: sanal ağlar ve vEthernet
    if (name.toLowerCase().includes('vEthernet') || name.toLowerCase().includes('virtual') || name.toLowerCase().includes('docker')) {
      continue;
    }
    for (const iface of interfaces[name] ?? []) {
      if (
        iface.family === 'IPv4' &&
        !iface.internal &&
        // Docker Desktop’ın tipik IP bloğu 192.168.56.*
        !iface.address.startsWith('192.168.56.') &&
        !iface.address.startsWith('172.')
      ) {
        localIp = iface.address;
        // En uygun IP bulundu, döngüyü kır
        break;
      }
    }
    if (localIp !== '127.0.0.1') {
      break;
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
// test