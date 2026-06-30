import { InjectQueue } from '@nestjs/bullmq';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobAgent, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { AuthContext } from '../auth/auth.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AGENT_QUEUE } from './jobs.constants';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(AGENT_QUEUE) private readonly queue: Queue,
  ) {}

  /** Persist a Job row (QUEUED) without pushing to the queue yet. */
  async create(brandId: string, agent: JobAgent, input: Prisma.InputJsonValue) {
    return this.prisma.job.create({ data: { brandId, agent, input } });
  }

  /** Push an existing job onto the worker queue. */
  async enqueue(jobId: string, agent: JobAgent) {
    await this.queue.add(
      agent,
      { jobId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  /** Convenience: create + enqueue in one call. */
  async createAndEnqueue(
    brandId: string,
    agent: JobAgent,
    input: Prisma.InputJsonValue,
  ) {
    const job = await this.create(brandId, agent, input);
    await this.enqueue(job.id, agent);
    return job;
  }

  async get(auth: AuthContext, id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { brand: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.brand.orgId !== auth.orgId) throw new ForbiddenException();

    const { brand, ...rest } = job;
    return rest;
  }
}
