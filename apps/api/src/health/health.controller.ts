import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Health check endpoint untuk liveness/readiness probe (mis. load balancer). */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /health — laporkan status service & konektivitas DB.
  @Get()
  async health() {
    let db = 'down';
    try {
      // Query ringan untuk memastikan koneksi database hidup.
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
    return { status: 'ok', db, ts: new Date().toISOString() };
  }
}
