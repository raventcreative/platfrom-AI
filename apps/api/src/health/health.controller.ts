import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    let db = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
    return {
      status: 'ok',
      db,
      ts: new Date().toISOString(),
      // debug sementara: apakah key env terbaca proses ini
      env: {
        cwd: process.cwd(),
        openai: (process.env.OPENAI_API_KEY ?? '').slice(0, 8) || '(kosong)',
        anthropic: (process.env.ANTHROPIC_API_KEY ?? '').slice(0, 8) || '(kosong)',
      },
    };
  }
}
