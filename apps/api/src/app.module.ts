import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AutomationModule } from './automation/automation.module';
import { BrandsModule } from './brands/brands.module';
import { ConversationsModule } from './conversations/conversations.module';
import { HealthController } from './health/health.controller';
import { InsightsModule } from './insights/insights.module';
import { JobsModule } from './jobs/jobs.module';
import { OrgModule } from './org/org.module';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Root module aplikasi: merangkai konfigurasi global, koneksi antrian BullMQ (Redis),
 * serta seluruh feature module (auth, org, brands, conversations, jobs).
 */
@Module({
  imports: [
    // Muat variabel environment secara global (tersedia di seluruh modul).
    ConfigModule.forRoot({ isGlobal: true }),
    // Koneksi BullMQ ke Redis untuk antrian job agent.
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    PrismaModule,
    AuthModule,
    OrgModule,
    BrandsModule,
    ConversationsModule,
    JobsModule,
    InsightsModule,
    AutomationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
