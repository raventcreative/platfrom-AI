import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthContext } from '../auth/auth.decorator';
import { buildBrandProfile, splitGeneratorOutput } from '../content';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { AutomateDto } from './dto/automate.dto';
import { GenerateImageDto } from './dto/generate-image.dto';

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

  /**
   * Otomasi GAMBAR 2 tahap (BEBERAPA gambar sekaligus):
   *   Tahap 1 — brief → N konsep berbeda (prompt gambar + caption) via LLM.
   *   Tahap 2 — tiap prompt → OpenAI Images → gambar (data URL), dijalankan paralel.
   * Selalu memakai OpenAI (satu-satunya yang punya image gen di sini).
   */
  async runImage(auth: AuthContext, dto: GenerateImageDto) {
    const brandText = await this.brandContext(auth, dto.brandId);
    const referenceImage = await this.brandReferenceImage(dto.brandId);
    const aspect = dto.aspect ?? 'square';
    const count = Math.min(Math.max(dto.count ?? 3, 1), 4); // batasi 1–4

    // ── Tahap 1: brief → N konsep (prompt + caption) via LLM OpenAI ──
    const s1 = await this.llm.complete(
      PERSONA,
      imagePromptSpec(brandText, dto.brief, aspect, count, dto.style),
      { provider: 'openai', apiKey: dto.apiKey, maxTokens: 1600 },
    );
    const { json } = splitGeneratorOutput(s1.text);
    const concepts = normalizeConcepts(json, s1.text, count);

    // ── Tahap 2: tiap konsep → gambar (paralel; gagal per-item tidak fatal) ──
    const settled = await Promise.allSettled(
      concepts.map((c) =>
        this.llm.generateImage(c.image_prompt, {
          apiKey: dto.apiKey,
          model: dto.model,
          aspect,
          referenceImage, // acuan visual dari brand guideline (bila ada)
        }),
      ),
    );

    const results = concepts.map((c, i) => {
      const r = settled[i];
      const img = r.status === 'fulfilled' ? r.value : null;
      return {
        imagePrompt: c.image_prompt,
        caption: c.caption ?? '',
        hashtags: c.hashtags ?? [],
        image: img?.dataUrl ?? null, // null bila demo / gagal
        size: img?.size ?? '',
        model: img?.model ?? 'demo',
        error: r.status === 'rejected' ? String(r.reason).slice(0, 200) : undefined,
      };
    });

    // Simpan ke riwayat (termasuk data URL gambar) agar bisa dilihat lagi.
    const saved = await this.prisma.imageGeneration.create({
      data: {
        orgId: auth.orgId,
        brandId: dto.brandId ?? null,
        brief: dto.brief,
        aspect,
        style: dto.style ?? null,
        count: results.length,
        results: results as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, createdAt: true },
    });

    return {
      id: saved.id,
      createdAt: saved.createdAt,
      aspect,
      count: results.length,
      demo: s1.demo || results.every((r) => !r.image),
      results,
    };
  }

  /** Ambil data URL gambar referensi brand (dari profile.reference_image), bila ada. */
  private async brandReferenceImage(brandId?: string): Promise<string | undefined> {
    if (!brandId) return undefined;
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: { profile: true },
    });
    const profile = brand?.profile as Record<string, unknown> | null;
    const ref = profile?.reference_image;
    return typeof ref === 'string' && ref.startsWith('data:image') ? ref : undefined;
  }

  /** Riwayat generasi gambar (terbaru dulu), opsional difilter per-brand. */
  async listImages(auth: AuthContext, brandId?: string) {
    return this.prisma.imageGeneration.findMany({
      where: { orgId: auth.orgId, ...(brandId ? { brandId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
  }

  /** Hapus satu entri riwayat gambar (harus milik org yang sama). */
  async deleteImage(auth: AuthContext, id: string) {
    const rec = await this.prisma.imageGeneration.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Riwayat tidak ditemukan');
    if (rec.orgId !== auth.orgId) throw new ForbiddenException();
    await this.prisma.imageGeneration.delete({ where: { id } });
    return { ok: true };
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

// Platform default per format bila user tidak mengisi.
function defaultPlatform(format: string): string {
  return format === 'carousel' ? 'Instagram' : format === 'post' ? 'Instagram' : 'IG Reels';
}

// Bungkus profil brand jadi blok teks untuk disisipkan ke prompt (kosong bila tak ada).
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

const ASPECT_LABEL: Record<string, string> = {
  square: 'kotak 1:1 (feed IG)',
  portrait: 'potret 4:5 / 9:16 (story/reels cover)',
  landscape: 'lanskap 16:9',
};

/** Tahap 1 (image): brief → N konsep GAMBAR (prompt Inggris + caption + hashtag). */
function imagePromptSpec(
  brandText: string,
  brief: string,
  aspect: string,
  count: number,
  style?: string,
): string {
  return [
    `Buat ${count} KONSEP GAMBAR sosial media yang BERBEDA-BEDA (variasi angle/komposisi/mood) — format ${ASPECT_LABEL[aspect] ?? aspect} — dari BRIEF berikut.`,
    brandBlock(brandText),
    `\nBRIEF: ${brief}`,
    style ? `GAYA VISUAL: ${style}` : '',
    '',
    'Keluarkan HANYA blok JSON valid di dalam pagar kode ```json (tanpa teks lain), skema:',
    `{"images":[${'{"image_prompt":"<prompt detail BAHASA INGGRIS untuk image generator: subjek utama, komposisi, gaya/art style, pencahayaan, palet warna sesuai brand, mood, latar; sebut teks singkat on-image bila relevan>","caption":"<caption Bahasa Indonesia siap posting>","hashtags":["tag1","tag2"]}'}, ... total ${count} item BERBEDA]}`,
    '',
    'Catatan: tiap image_prompt harus deskriptif & spesifik (bukan kalimat perintah), berbeda satu sama lain, aman untuk brand, tanpa merek/logo pihak ketiga.',
  ]
    .filter(Boolean)
    .join('\n');
}

type Concept = { image_prompt: string; caption?: string; hashtags?: string[] };

/**
 * Normalisasi hasil parse Tahap 1 jadi array konsep. Menangani beberapa bentuk
 * yang mungkin dikeluarkan LLM: {images:[...]}, array langsung, atau objek tunggal.
 * Fallback: pakai teks mentah sebagai satu prompt bila JSON gagal.
 */
function normalizeConcepts(json: unknown, rawText: string, count: number): Concept[] {
  const asConcept = (o: any): Concept | null => {
    const p = (o?.image_prompt ?? o?.prompt ?? '').toString().trim();
    return p ? { image_prompt: p, caption: o?.caption, hashtags: o?.hashtags } : null;
  };

  const keep = (c: Concept | null): c is Concept => c !== null;
  let list: Concept[] = [];
  const j = json as any;
  if (Array.isArray(j?.images)) list = j.images.map(asConcept).filter(keep);
  else if (Array.isArray(j)) list = j.map(asConcept).filter(keep);
  else if (j && (j.image_prompt || j.prompt)) {
    const c = asConcept(j);
    if (c) list = [c];
  }

  // Fallback bila kosong: satu konsep dari teks mentah (mode demo/JSON gagal).
  if (list.length === 0) {
    list = [{ image_prompt: stripFences(rawText) || 'social media promo image' }];
  }
  return list.slice(0, count);
}

/** Buang pagar kode dari teks (fallback bila spec JSON gagal diparse). */
function stripFences(s: string): string {
  return s.replace(/```(?:json)?/gi, '').trim();
}
