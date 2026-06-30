import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AGENT_QUEUE } from './jobs.constants';

/**
 * Sprint 1 stub worker. It transitions the Job through RUNNING -> SUCCEEDED
 * and returns a placeholder output. Real agents (research/script/carousel/
 * video) plug in here in later sprints by switching on `record.agent`.
 */
@Processor(AGENT_QUEUE)
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ jobId: string }>) {
    const { jobId } = job.data;

    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.RUNNING },
    });

    const record = await this.prisma.job.findUnique({ where: { id: jobId } });

    const output = {
      placeholder: true,
      message: `Agent "${record?.agent}" belum diimplementasi (Sprint 1 scaffold).`,
      echo: record?.input ?? null,
    };

    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.SUCCEEDED, output },
    });

    this.logger.log(`Job ${jobId} (${record?.agent}) selesai (stub).`);
    return output;
  }
}
