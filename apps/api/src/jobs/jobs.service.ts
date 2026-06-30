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

  /** Persist a Job row and enqueue it for a worker to pick up. */
  async enqueue(brandId: string, agent: JobAgent, input: Prisma.InputJsonValue) {
    const job = await this.prisma.job.create({
      data: { brandId, agent, input },
    });

    await this.queue.add(
      agent,
      { jobId: job.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

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
