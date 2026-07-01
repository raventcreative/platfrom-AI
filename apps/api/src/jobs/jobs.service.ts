import { InjectQueue } from '@nestjs/bullmq';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobAgent, JobStatus, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { AuthContext } from '../auth/auth.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateDto } from './dto/generate.dto';
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

  /**
   * Push an existing job onto the worker queue.
   * `secrets` (mis. apiKey "bring your own key") ikut di payload antrian (Redis)
   * — sengaja TIDAK di kolom DB Job.input agar tak persist & tak bocor via GET.
   */
  async enqueue(
    jobId: string,
    agent: JobAgent,
    secrets?: { apiKey?: string; model?: string },
  ) {
    await this.queue.add(
      agent,
      { jobId, ...(secrets ?? {}) },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  /** Convenience: create + enqueue in one call. */
  async createAndEnqueue(
    brandId: string,
    agent: JobAgent,
    input: Prisma.InputJsonValue,
    secrets?: { apiKey?: string; model?: string },
  ) {
    const job = await this.create(brandId, agent, input);
    await this.enqueue(job.id, agent, secrets);
    return job;
  }

  /** Generate berbasis form: validasi brand milik org, buat + antrikan job. */
  async generate(auth: AuthContext, dto: GenerateDto) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: dto.brandId },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.orgId !== auth.orgId) throw new ForbiddenException();

    const job = await this.createAndEnqueue(
      brand.id,
      dto.agent as JobAgent,
      {
        content: dto.input ?? '',
        ...(dto.provider ? { provider: dto.provider } : {}),
      },
      { apiKey: dto.apiKey, model: dto.model },
    );
    return { jobId: job.id };
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

  /** Hapus satu job dari riwayat; pastikan job milik org pemanggil. */
  async remove(auth: AuthContext, id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { brand: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.brand.orgId !== auth.orgId) throw new ForbiddenException();

    await this.prisma.job.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Riwayat generate sebuah brand (job terminal saja: SUCCEEDED/FAILED),
   * terbaru dulu. Dipakai UI untuk menampilkan history & membandingkan hasil.
   */
  async listForBrand(auth: AuthContext, brandId: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.orgId !== auth.orgId) throw new ForbiddenException();

    return this.prisma.job.findMany({
      where: {
        brandId,
        status: { in: [JobStatus.SUCCEEDED, JobStatus.FAILED] },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        agent: true,
        status: true,
        input: true,
        output: true,
        error: true,
        tokensUsed: true,
        createdAt: true,
      },
    });
  }
}
