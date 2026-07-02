import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { BrandCategory, JobAgent, JobStatus } from '@prisma/client';
import { Job } from 'bullmq';
import {
  agentToOutputType,
  buildBrandProfile,
  buildSystemPrompt,
  buildUserPrompt,
  buildVoiceUserPrompt,
  splitGeneratorOutput,
  VOICE_SYSTEM_PROMPT,
} from '../content';
import {
  formatIgProfile,
  InstagramService,
} from '../instagram/instagram.service';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { AGENT_QUEUE } from './jobs.constants';

type JobInput = {
  conversationId?: string;
  content?: string;
  provider?: string;
  igHandle?: string;
  samples?: string[];
};

/** Subset kolom brand (+relasi) yang dipakai worker — struktural, hasil query Prisma assignable. */
type BrandWithContext = {
  id: string;
  name: string;
  niche: string | null;
  description: string | null;
  platforms: string[];
  category: BrandCategory;
  profile: unknown;
  voiceProfile: {
    toneAttributes: string[];
    styleSummary: string | null;
    preferredWords: string[];
    avoidWords: string[];
  } | null;
  kit: {
    colors: string[];
    fonts: string[];
    guidelines: string | null;
  } | null;
};

type RunResult = {
  output: Record<string, unknown>;
  reply: string;
  tokensUsed: number;
};

/**
 * Content Engine worker.
 * - Generator (script/carousel/storyboard/caption/ideas): rakit system prompt
 *   (profil brand + playbook + compliance) → LLM → simpan hasil + balas chat.
 * - BRANDVOICE ("training"): ambil konten IG (scrape Apify / contoh manual) →
 *   LLM ekstrak brand voice profile → simpan ke BrandVoiceProfile +
 *   Brand.profile sehingga otomatis disuntik ke semua generate berikutnya.
 */
@Processor(AGENT_QUEUE)
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly ig: InstagramService,
  ) {
    super();
  }

  async process(job: Job<{ jobId: string; apiKey?: string; model?: string }>) {
    const { jobId, apiKey, model } = job.data;
  private loadBrand(brandId: string) {
    return this.prisma.brand.findUnique({
      where: { id: brandId },
      include: { voiceProfile: true, kit: true },
    });
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
      const brand = await this.loadBrand(record.brandId);
      if (!brand) throw new Error(`Brand ${record.brandId} not found`);

      const input = (record.input ?? {}) as unknown as JobInput;

      const result = await this.llm.complete(system, user, {
        provider: input.provider,
        apiKey,
        model,
      });
      const { readable, json } = splitGeneratorOutput(result.text);

      const output = {
        type: outputType,
        model: result.model,
        demo: result.demo,
        readable,
        json,
      };
      const result =
        record.agent === 'BRANDVOICE'
          ? await this.runBrandVoice(brand, input)
          : await this.runGenerator(brand, record.agent, input);

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.SUCCEEDED,
          output: result.output as object,
          tokensUsed: result.tokensUsed || null,
        },
      });

      // Tampilkan hasil di balasan chat (kalau job berasal dari pesan).
      await this.prisma.message.updateMany({
        where: { jobId },
        data: { content: result.reply },
      });

      this.logger.log(`Job ${jobId} (${record.agent}) selesai.`);
      return result.output;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.FAILED, error: message },
      });
      await this.prisma.message.updateMany({
        where: { jobId },
        data: { content: `Maaf, proses gagal: ${message}` },
      });
      this.logger.error(`Job ${jobId} (${record.agent}) gagal: ${message}`);
      throw err;
    }
  }

  /* ── Generator (script/carousel/storyboard/caption/ideas) ─────────── */

  private async runGenerator(
    brand: BrandWithContext,
    agent: JobAgent,
    input: JobInput,
  ): Promise<RunResult> {
    const outputType = agentToOutputType(agent);
    const system = buildSystemPrompt(
      this.brandProfileText(brand),
      brand.category,
    );
    const user = buildUserPrompt(outputType, input.content ?? '');

    const result = await this.llm.complete(system, user);
    const { readable, json } = splitGeneratorOutput(result.text);

    return {
      output: {
        type: outputType,
        model: result.model,
        demo: result.demo,
        readable,
        json,
      },
      reply: readable,
      tokensUsed: result.tokensUsed,
    };
  }

  /* ── BrandVoice "training" ────────────────────────────────────────── */

  private async runBrandVoice(
    brand: BrandWithContext,
    input: JobInput,
  ): Promise<RunResult> {
    const handle =
      input.igHandle ??
      input.content?.match(/@([A-Za-z0-9._]{2,30})/)?.[1];
    const samples = (input.samples ?? []).filter(
      (s) => typeof s === 'string' && s.trim(),
    );

    // Kumpulkan bahan analisis: hasil scrape IG dan/atau contoh caption manual.
    const parts: string[] = [];
    if (handle) {
      try {
        const profile = await this.ig.fetchProfile(handle);
        parts.push(formatIgProfile(profile));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!samples.length) throw new Error(`Scraping @${handle} gagal: ${msg}`);
        parts.push(
          `(Scraping @${handle} gagal: ${msg} — analisis lanjut memakai contoh caption manual.)`,
        );
      }
    }
    if (samples.length) {
      parts.push(
        'CONTOH CAPTION (dikirim manual):\n' +
          samples.map((s) => `---\n${s.trim()}`).join('\n'),
      );
    }
    if (!parts.length) {
      throw new Error(
        'Sertakan handle IG (mis. "pelajari brand dari IG @brandku") atau contoh caption untuk dianalisis.',
      );
    }

    const result = await this.llm.complete(
      VOICE_SYSTEM_PROMPT,
      buildVoiceUserPrompt(this.brandProfileText(brand), parts.join('\n\n')),
    );
    const { readable, json } = splitGeneratorOutput(result.text);

    let reply = readable;
    if (!result.demo && json && typeof json === 'object') {
      await this.persistVoiceProfile(brand, json);
      reply +=
        '\n\n✅ Brand voice profile tersimpan — otomatis dipakai di semua generate berikutnya untuk brand ini.';
    } else if (result.demo) {
      reply +=
        '\n\n(Mode demo — profil TIDAK disimpan. Set ANTHROPIC_API_KEY untuk analisis sungguhan.)';
    } else {
      reply +=
        '\n\n⚠️ Output analisis tidak berisi JSON valid — profil belum tersimpan, coba ulangi.';
    }

    return {
      output: {
        type: 'brandvoice',
        model: result.model,
        demo: result.demo,
        readable,
        json,
        igHandle: handle ?? null,
        sampleCount: samples.length,
      },
      reply,
      tokensUsed: result.tokensUsed,
    };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private async persistVoiceProfile(brand: BrandWithContext, raw: any) {
    const arr = (v: unknown): string[] =>
      Array.isArray(v)
        ? v.filter((x) => typeof x === 'string' && x.trim())
        : [];
    const str = (v: unknown): string =>
      typeof v === 'string' ? v.trim() : '';

    const voiceData = {
      toneAttributes: arr(raw.tone_attributes),
      styleSummary: str(raw.style_summary) || null,
      preferredWords: [
        ...arr(raw.signature_phrases),
        ...arr(raw.preferred_words),
      ],
      avoidWords: arr(raw.avoid_words),
      status: 'READY' as const,
    };
    await this.prisma.brandVoiceProfile.upsert({
      where: { brandId: brand.id },
      update: voiceData,
      create: { brandId: brand.id, ...voiceData },
    });

    // Simpan detail tambahan ke profil intake — ikut tersuntik ke prompt.
    const profile: Record<string, unknown> = {
      ...((brand.profile as Record<string, unknown> | null) ?? {}),
    };
    const setIf = (key: string, v: unknown) => {
      const text = Array.isArray(v)
        ? arr(v).join(' · ')
        : str(v);
      if (text) profile[key] = text;
    };
    setIf('Sapaan ke audiens', raw.sapaan);
    setIf('Frasa signature', raw.signature_phrases);
    setIf('Penggunaan emoji', raw.emoji_usage);
    setIf('Pola hook khas brand', raw.hook_patterns);
    setIf('Content pillars terlihat', raw.content_pillars);
    setIf('Do (dari analisis voice)', raw.do);
    setIf("Don't (dari analisis voice)", raw.dont);
    const caps = arr(raw.sample_captions);
    if (caps.length) {
      profile['Contoh caption asli brand (tiru gayanya)'] = caps.join('\n---\n');
    }
    await this.prisma.brand.update({
      where: { id: brand.id },
      data: { profile: profile as object },
    });
  }

  private brandProfileText(brand: BrandWithContext): string {
    return buildBrandProfile({
      name: brand.name,
      niche: brand.niche,
      description: brand.description,
      platforms: brand.platforms,
      voice: brand.voiceProfile,
      kit: brand.kit,
      profile: brand.profile,
    });
  }
}
