import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { Job } from 'bullmq';
import {
  agentToOutputType,
  buildBrandProfile,
  buildSystemPrompt,
  buildUserPrompt,
  splitGeneratorOutput,
} from '../content';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { AGENT_QUEUE } from './jobs.constants';

type JobInput = { conversationId?: string; content?: string };

/**
 * Content Engine worker. Merakit system prompt (profil brand + playbook +
 * compliance) + user prompt (generator + daily input), memanggil LLM, lalu
 * menyimpan output (readable + JSON) dan memperbarui balasan di chat.
 */
@Processor(AGENT_QUEUE)
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {
    super();
  }

  async process(job: Job<{ jobId: string }>) {
    const { jobId } = job.data;

    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.RUNNING },
    });

    const record = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!record) throw new Error(`Job ${jobId} not found`);

    try {
      const brand = await this.prisma.brand.findUnique({
        where: { id: record.brandId },
        include: { voiceProfile: true, kit: true },
      });
      if (!brand) throw new Error(`Brand ${record.brandId} not found`);

      const input = (record.input ?? {}) as unknown as JobInput;
      const outputType = agentToOutputType(record.agent);

      const brandProfile = buildBrandProfile({
        name: brand.name,
        niche: brand.niche,
        description: brand.description,
        platforms: brand.platforms,
        voice: brand.voiceProfile,
        kit: brand.kit,
        profile: brand.profile,
      });

      const system = buildSystemPrompt(brandProfile, brand.category);
      const user = buildUserPrompt(outputType, input.content ?? '');

      const result = await this.llm.complete(system, user);
      const { readable, json } = splitGeneratorOutput(result.text);

      const output = {
        type: outputType,
        model: result.model,
        demo: result.demo,
        readable,
        json,
      };

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.SUCCEEDED,
          output,
          tokensUsed: result.tokensUsed || null,
        },
      });

      // Tampilkan hasil di balasan chat (kalau job berasal dari pesan).
      await this.prisma.message.updateMany({
        where: { jobId },
        data: { content: readable },
      });

      this.logger.log(
        `Job ${jobId} (${record.agent}) selesai${result.demo ? ' [demo]' : ''}.`,
      );
      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.FAILED, error: message },
      });
      await this.prisma.message.updateMany({
        where: { jobId },
        data: { content: `Maaf, generate gagal: ${message}` },
      });
      this.logger.error(`Job ${jobId} (${record.agent}) gagal: ${message}`);
      throw err;
    }
  }
}
