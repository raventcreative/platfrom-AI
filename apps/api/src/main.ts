import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';

/** Entry point: buat aplikasi Nest, pasang konfigurasi global, lalu jalankan server HTTP. */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Naikkan limit body: brand bisa menyimpan gambar referensi base64 (beberapa MB).
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));
  // Semua route diberi prefix /api/v1.
  app.setGlobalPrefix('api/v1');
  // Izinkan CORS dari origin frontend (WEB_ORIGIN), default terbuka untuk dev.
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? '*' });
  // ValidationPipe global: buang field asing (whitelist) & transform payload ke tipe DTO.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Dokumentasi OpenAPI: /api/v1/docs (UI) & /api/v1/docs-json (spec untuk gen tipe web).
  setupSwagger(app);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ProdPilot API on http://localhost:${port}/api/v1`);
}

bootstrap();
