import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobAgent, JobStatus, Prisma } from '@prisma/client';
import type { Response } from 'express';
import { AuthContext } from '../auth/auth.decorator';
import {
  buildBrandProfile,
  buildSystemPrompt,
  buildUserPrompt,
  outputTypeToAgent,
  splitGeneratorOutput,
} from '../content';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateDto } from './dto/generate.dto';

/** Agent konten yang tampil di riwayat generate. */
const CONTENT_AGENTS: JobAgent[] = [
  'SCRIPT',
  'CAROUSEL',
  'STORYBOARD',
  'CAPTION',
  'IDEAS',
];

/** Arahan singkat per tahap funnel — disisipkan ke daily input bila dipilih. */
const FUNNEL_HINT: Record<'TOFU' | 'MOFU' | 'BOFU', string> = {
  TOFU: 'TOFU/awareness — tarik audiens baru: angkat masalah & edukasi ringan, hook luas, jangan hard-selling',
  MOFU: 'MOFU/consideration — bangun kepercayaan: edukasi mendalam, bandingkan solusi, bukti/testimoni, soft CTA',
  BOFU: 'BOFU/conversion — dorong beli: tonjolkan penawaran & urgency, jawab keraguan, CTA kuat',
};

/**
 * Generator konten LANGSUNG (tanpa antrean) supaya hasil cepat:
 *   - runSync: satu request → hasil penuh (fallback bila streaming tak tersedia).
 *   - runStream: SSE — potongan teks dialirkan real-time ke UI.
 * Kedua jalur menyimpan hasil ke tabel Job (status SUCCEEDED) sebagai riwayat.
 */
@Injectable()
export class GenerateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  /** Susun system+user prompt dari brand + dto (dipakai sync & stream). */
  private async buildPrompts(auth: AuthContext, dto: GenerateDto) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: dto.brandId },
      include: { voiceProfile: true, kit: true },
    });
    if (!brand) throw new NotFoundException('Brand tidak ditemukan');
    if (brand.orgId !== auth.orgId) throw new ForbiddenException();

    const profileText = buildBrandProfile({
      name: brand.name,
      niche: brand.niche,
      description: brand.description,
      platforms: brand.platforms,
      voice: brand.voiceProfile,
      kit: brand.kit,
      profile: brand.profile,
    });

    // Daily input terstruktur dari field minimal UI.
    const daily = [
      dto.funnel ? `TAHAP FUNNEL: ${FUNNEL_HINT[dto.funnel]}` : '',
      dto.product?.trim() ? `Produk fokus: ${dto.product.trim()}` : '',
      dto.topic?.trim() ? `Topik/brief: ${dto.topic.trim()}` : '',
      dto.extra?.trim() ? `Catatan: ${dto.extra.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      brand,
      system: buildSystemPrompt(profileText, brand.category),
      user: buildUserPrompt(dto.type, daily || 'Buat dari profil brand.'),
      daily,
    };
  }

  /** Simpan hasil (atau kegagalan) sebagai baris Job — riwayat generate. */
  private saveHistory(
    brandId: string,
    dto: GenerateDto,
    result:
      | { ok: true; readable: string; json: unknown; model: string; demo: boolean }
      | { ok: false; error: string },
  ) {
    return this.prisma.job.create({
      data: {
        brandId,
        agent: outputTypeToAgent(dto.type),
        status: result.ok ? JobStatus.SUCCEEDED : JobStatus.FAILED,
        input: {
          type: dto.type,
          topic: dto.topic ?? '',
          product: dto.product ?? '',
          funnel: dto.funnel ?? '',
          extra: dto.extra ?? '',
        } as Prisma.InputJsonValue,
        ...(result.ok
          ? {
              output: {
                readable: result.readable,
                json: result.json,
                model: result.model,
                demo: result.demo,
              } as Prisma.InputJsonValue,
            }
          : { error: result.error.slice(0, 500) }),
      },
      select: { id: true, createdAt: true },
    });
  }

  /** Generate sinkron: kembalikan hasil penuh sekali jalan. */
  async runSync(auth: AuthContext, dto: GenerateDto) {
    const { brand, system, user } = await this.buildPrompts(auth, dto);
    try {
      const r = await this.llm.complete(system, user, {
        provider: dto.provider,
        apiKey: dto.apiKey,
        model: dto.model,
      });
      const { readable, json } = splitGeneratorOutput(r.text);
      const saved = await this.saveHistory(brand.id, dto, {
        ok: true,
        readable,
        json,
        model: r.model,
        demo: r.demo,
      });
      return {
        jobId: saved.id,
        type: dto.type,
        readable,
        json,
        model: r.model,
        demo: r.demo,
      };
    } catch (e) {
      await this.saveHistory(brand.id, dto, { ok: false, error: String(e) });
      throw e;
    }
  }

  /**
   * Generate STREAMING via SSE. Event yang dikirim (tiap baris "data: {json}"):
   *   {t:"chunk", d:"..."}                        — potongan teks
   *   {t:"done", jobId, readable, json, model, demo} — hasil final (sudah tersimpan)
   *   {t:"error", message}                        — bila gagal
   */
  async runStream(auth: AuthContext, dto: GenerateDto, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const send = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    let brandId = '';
    try {
      const { brand, system, user } = await this.buildPrompts(auth, dto);
      brandId = brand.id;

      let full = '';
      const gen = this.llm.stream(system, user, {
        provider: dto.provider,
        apiKey: dto.apiKey,
        model: dto.model,
      });
      // Iterasi manual supaya nilai return generator (model/demo) ikut terbaca.
      for (;;) {
        const { value, done } = await gen.next();
        if (done) {
          const meta = value ?? { model: 'unknown', demo: false };
          const { readable, json } = splitGeneratorOutput(full);
          const saved = await this.saveHistory(brand.id, dto, {
            ok: true,
            readable,
            json,
            model: meta.model,
            demo: meta.demo,
          });
          send({
            t: 'done',
            jobId: saved.id,
            readable,
            json,
            model: meta.model,
            demo: meta.demo,
          });
          break;
        }
        full += value;
        send({ t: 'chunk', d: value });
      }
    } catch (e) {
      if (brandId) {
        await this.saveHistory(brandId, dto, { ok: false, error: String(e) }).catch(
          () => undefined,
        );
      }
      send({ t: 'error', message: String(e).slice(0, 400) });
    } finally {
      res.end();
    }
  }

  /** Riwayat generate (job konten terminal) sebuah brand, terbaru dulu. */
  async history(auth: AuthContext, brandId: string) {
    await this.assertBrand(auth, brandId);
    return this.prisma.job.findMany({
      where: {
        brandId,
        agent: { in: CONTENT_AGENTS },
        status: { in: [JobStatus.SUCCEEDED, JobStatus.FAILED] },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        agent: true,
        status: true,
        input: true,
        output: true,
        error: true,
        createdAt: true,
      },
    });
  }

  /** Hapus satu entri riwayat (cek kepemilikan org via brand). */
  async deleteHistory(auth: AuthContext, id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { brand: { select: { orgId: true } } },
    });
    if (!job) throw new NotFoundException('Riwayat tidak ditemukan');
    if (job.brand.orgId !== auth.orgId) throw new ForbiddenException();
    await this.prisma.job.delete({ where: { id } });
    return { ok: true };
  }

  private async assertBrand(auth: AuthContext, brandId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: { orgId: true },
    });
    if (!brand) throw new NotFoundException('Brand tidak ditemukan');
    if (brand.orgId !== auth.orgId) throw new ForbiddenException();
  }
}
