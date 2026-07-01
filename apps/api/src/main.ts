import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** Entry point: buat aplikasi Nest, pasang konfigurasi global, lalu jalankan server HTTP. */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Semua route diberi prefix /api/v1.
  app.setGlobalPrefix('api/v1');
  // Izinkan CORS dari origin frontend (WEB_ORIGIN), default terbuka untuk dev.
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? '*' });
  // ValidationPipe global: buang field asing (whitelist) & transform payload ke tipe DTO.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ProdPilot API on http://localhost:${port}/api/v1`);
}

bootstrap();
