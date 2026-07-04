// Muat .env PALING AWAL (sebelum modul lain dievaluasi) — deterministik,
// tidak bergantung urutan inisialisasi ConfigModule.
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Longgarkan limit body (profil brand bisa berisi teks panjang).
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.setGlobalPrefix('api/v1');
  // CORS: endpoint proxy IG/TikTok dipakai langsung dari browser (prototype bisa
  // dibuka via file:// → origin 'null', atau dari port statis apa pun). Data yang
  // diekspos publik & tanpa cookie/kredensial, jadi default-nya IZINKAN SEMUA origin
  // (reflect balik). Kalau WEB_ORIGIN diset (comma-separated), baru dibatasi ke daftar itu.
  const allowList = (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl / same-origin / file:// tanpa Origin
      if (!allowList.length) return cb(null, true); // default: semua origin diizinkan
      return cb(null, allowList.includes(origin)); // WEB_ORIGIN diset → batasi ke daftar
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ProdPilot API on http://localhost:${port}/api/v1`);
}

bootstrap();
