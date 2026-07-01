import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthContext } from '../auth/auth.decorator';
import { buildBrandProfile, splitGeneratorOutput } from '../content';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { AutomateDto } from './dto/automate.dto';

const PERSONA =
  'Kamu produser konten media sosial senior di agency Indonesia. Presisi, actionable, Bahasa Indonesia.';

const FORMAT_LABEL: Record<string, string> = {
  reels: 'Reels/TikTok (video pendek)',
  carousel: 'Carousel Instagram',
  post: 'Single post / feed',
};

/**
 * Otomasi 2 tahap:
 *   Tahap 1 — brief (prompt) → SPEC JSON terstruktur.
 *   Tahap 2 — SPEC JSON → reel/post final siap produksi.
 */
@Injectable()
export class AutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  async run(auth: AuthContext, dto: AutomateDto) {
    const brandText = await this.brandContext(auth, dto.brandId);
    const llmOpts = {
      provider: dto.provider,
      apiKey: dto.apiKey,
      model: dto.model,
      maxTokens: 3000,
    };
    const platform = dto.platform || defaultPlatform(dto.format);

    // ── Tahap 1: brief → SPEC JSON ──────────────────────────────
    const s1 = await this.llm.complete(
      PERSONA,
      specPrompt(brandText, dto.brief, dto.format, platform),
      llmOpts,
    );
    const { json: spec } = splitGeneratorOutput(s1.text);

    // ── Tahap 2: SPEC JSON → reel/post final ────────────────────
    const specForPrompt = spec
      ? JSON.stringify(spec)
      : stripFences(s1.text); // fallback bila JSON gagal diparse
    const s2 = await this.llm.complete(
      PERSONA,
      buildPrompt(brandText, specForPrompt, dto.format, platform),
      llmOpts,
    );
    const { readable, json: production } = splitGeneratorOutput(s2.text);

    return {
      format: dto.format,
      platform,
      spec, // JSON spec dari tahap 1 (ditampilkan sebagai "prompt → JSON")
      output: { readable, json: production }, // hasil reel/post final
      model: s2.model,
      demo: s2.demo,
    };
  }

  private async brandContext(
    auth: AuthContext,
    brandId?: string,
  ): Promise<string> {
    if (!brandId) return '';
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      include: { voiceProfile: true, kit: true },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.orgId !== auth.orgId) throw new ForbiddenException();
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

function defaultPlatform(format: string): string {
  return format === 'carousel' ? 'Instagram' : format === 'post' ? 'Instagram' : 'IG Reels';
}

function brandBlock(brandText: string): string {
  return brandText
    ? `\n\n===== PROFIL BRAND =====\n${brandText}\n========================`
    : '';
}

/** Tahap 1: ubah brief jadi SPEC JSON (schema seragam untuk semua format). */
function specPrompt(
  brandText: string,
  brief: string,
  format: string,
  platform: string,
): string {
  return [
    `Ubah BRIEF berikut menjadi SPEC JSON konten untuk ${FORMAT_LABEL[format]} di ${platform}.`,
    brandBlock(brandText),
    `\nBRIEF: ${brief}`,
    '',
    'Rangkum jadi spesifikasi yang cukup untuk memproduksi kontennya. Keluarkan HANYA blok JSON valid di dalam pagar kode ```json (tanpa teks lain), skema:',
    '{"format":"' + format + '","platform":"' + platform + '","goal":"","angle":"","target_audience":"","key_message":"","hook_options":["",""],"key_points":["",""],"cta":"","tone":"","sound_or_visual_mood":"","compliance_notes":""}',
  ].join('\n');
}

/** Tahap 2: dari SPEC JSON, produksi reel/post final. */
function buildPrompt(
  brandText: string,
  specJson: string,
  format: string,
  platform: string,
): string {
  const productionSchema =
    format === 'reels'
      ? '{"type":"reels","platform":"","duration_sec":0,"hooks":["",""],"scenes":[{"scene":1,"visual":"","voiceover":"","onscreen_text":"","duration_sec":0}],"cta":"","caption":"","hashtags":[],"sound_suggestion":""}'
      : format === 'carousel'
        ? '{"type":"carousel","platform":"Instagram","title":"","slides":[{"slide":1,"role":"hook","headline":"","subtext":"","visual":""}],"caption":"","hashtags":[]}'
        : '{"type":"post","platform":"","visual_concept":"","caption":"","hashtags":[],"cta":""}';

  return [
    `Dari SPEC JSON berikut, PRODUKSI ${FORMAT_LABEL[format]} final yang siap dieksekusi.`,
    brandBlock(brandText),
    `\nSPEC JSON:\n${specJson}`,
    '',
    'Patuhi voice & compliance brand. Keluarkan:',
    '(1) versi enak dibaca dalam Markdown rapi (hook, ' +
      (format === 'reels'
        ? 'tabel scene: Scene|Visual|Voiceover|Teks on-screen|Durasi, CTA, caption, hashtag, saran sound'
        : format === 'carousel'
          ? 'daftar slide 1..n, caption, hashtag'
          : 'konsep visual, caption, hashtag, CTA') +
      ');',
    '(2) blok JSON produksi valid di dalam pagar kode ```json, skema:',
    productionSchema,
  ].join('\n');
}

/** Buang pagar kode dari teks (fallback bila spec JSON gagal diparse). */
function stripFences(s: string): string {
  return s.replace(/```(?:json)?/gi, '').trim();
}
