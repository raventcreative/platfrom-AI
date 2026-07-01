import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { AGENT_QUEUE } from './jobs.constants';
import { JobsController } from './jobs.controller';
import { JobsProcessor } from './jobs.processor';
import { JobsService } from './jobs.service';

/**
 * Feature module job: mendaftarkan antrian AGENT_QUEUE, controller, service (producer),
 * dan processor (consumer). JobsService diekspor agar bisa dipakai modul lain.
 */
@Module({
  imports: [BullModule.registerQueue({ name: AGENT_QUEUE }), LlmModule],
  controllers: [JobsController],
  providers: [JobsService, JobsProcessor],
  exports: [JobsService],
})
export class JobsModule {}
