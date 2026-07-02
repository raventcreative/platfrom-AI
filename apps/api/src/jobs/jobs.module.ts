import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { InstagramModule } from '../instagram/instagram.module';
import { LlmModule } from '../llm/llm.module';
import { AGENT_QUEUE } from './jobs.constants';
import { JobsController } from './jobs.controller';
import { JobsProcessor } from './jobs.processor';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: AGENT_QUEUE }),
    LlmModule,
    InstagramModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JobsProcessor],
  exports: [JobsService],
})
export class JobsModule {}
