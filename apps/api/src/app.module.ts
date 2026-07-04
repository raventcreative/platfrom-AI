import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { ConversationsModule } from './conversations/conversations.module';
import { GenerateModule } from './generate/generate.module';
import { HealthController } from './health/health.controller';
import { InsightsModule } from './insights/insights.module';
import { JobsModule } from './jobs/jobs.module';
import { OrgModule } from './org/org.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublishModule } from './publish/publish.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    GenerateModule,
    InsightsModule,
    PublishModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
