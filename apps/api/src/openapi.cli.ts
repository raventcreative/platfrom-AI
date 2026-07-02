// Generator OpenAPI offline: boot Nest dalam PREVIEW MODE (provider tidak
// di-instantiate → tidak konek Postgres/Redis), bangun dokumen dari metadata,
// tulis ke apps/api/openapi.json. Dipanggil oleh `npm run gen:api`.
//
// Harus dijalankan dari hasil BUILD (dist), bukan ts-node, agar plugin
// @nestjs/swagger (di nest-cli.json) sudah menyuntik metadata DTO.
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './swagger';

async function main() {
  const app = await NestFactory.create(AppModule, { preview: true, logger: false });
  app.setGlobalPrefix('api/v1');
  const document = buildOpenApiDocument(app);
  const out = join(__dirname, '..', 'openapi.json');
  writeFileSync(out, JSON.stringify(document, null, 2));
  // eslint-disable-next-line no-console
  console.log(`OpenAPI ditulis ke ${out}`);
  await app.close();
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
