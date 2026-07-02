// Setup dokumentasi OpenAPI (Swagger) untuk API.
// - UI interaktif di  GET /api/v1/docs       (uji endpoint langsung dari browser)
// - Spec JSON di       GET /api/v1/docs-json  (dipakai `npm run gen:api` di web
//   untuk generate tipe TypeScript → koneksi backend↔frontend jadi type-safe)
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

// Konfigurasi dokumen dipisah agar dipakai ulang oleh generator CLI (openapi.cli.ts).
export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('ProdPilot API')
    .setDescription('AIpreneur Content Engine — kontrak API v1 untuk web Next.js')
    .setVersion('1.0')
    .addBearerAuth() // header Authorization: Bearer <token>
    .build();
}

// Bangun objek OpenAPI dari metadata controller/DTO.
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildOpenApiConfig());
}

// Pasang UI + endpoint JSON pada aplikasi yang sedang berjalan.
export function setupSwagger(app: INestApplication): void {
  const document = buildOpenApiDocument(app);
  // Path relatif terhadap global prefix (api/v1) → /api/v1/docs & /api/v1/docs-json
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true },
  });
}
