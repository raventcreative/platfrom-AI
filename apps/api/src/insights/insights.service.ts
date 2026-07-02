import { Injectable } from '@nestjs/common';
import { AuthContext } from '../auth/auth.decorator';
import { splitGeneratorOutput } from '../content';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompareDto } from './dto/compare.dto';
import { ReviewDto } from './dto/review.dto';
import {
  computeStats,
  IgScrapedProfile,
  profileBlock,
  scrapeIgProfile,
} from './ig-scraper';

const REVIEW_PERSONA =
  'Kamu auditor media sosial senior khusus Instagram untuk UMKM/brand Indonesia. Analisismu tajam, jujur, spesifik ke datanya (bukan saran generik), dan langsung bisa dieksekusi. Bahasa Indonesia santai-profesional.';

const COMPARE_PERSONA =
  'Kamu strategist kompetitif media sosial untuk brand Indonesia. Tugasmu membandingkan akun IG brand dengan kompetitornya berdasarkan data, menemukan celah yang bisa dimenangkan, dan memberi langkah konkret. Bahasa Indonesia santai-profesional.';

/**
 * Insight IG: review satu akun & perbandingan brand vs kompetitor.
 * Data diambil scraper publik (deterministik: statistik dihitung kode),
 * lalu LLM memberi analisis kualitatif + rekomendasi.
 */
@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  /** Review menyeluruh satu akun IG → skor, kekuatan/kelemahan, rekomendasi. */
  async review(_auth: AuthContext, dto: ReviewDto) {
    const profile = await scrapeIgProfile(dto.handle);
    if (profile.isPrivate) {
      throw new Error(`Akun @${profile.username} privat — tidak bisa direview.`);
    }
    const stats = computeStats(profile);

    const user = [
      'REVIEW akun Instagram berikut berdasarkan data asli di bawah.',
      '',
      profileBlock(profile, 10),
      '',
      'Analisis WAJIB menyentuh: bio (jelas & ada CTA?), campuran format konten vs praktik terbaik, kualitas hook caption (kutip contoh nyata dari data), konsistensi posting, engagement relatif ukuran akun.',
      'Skor tiap aspek 1-10 harus konsisten dengan datanya. Rekomendasi harus SPESIFIK ke akun ini (sebut apa yang diubah & contohnya), bukan tips umum.',
      'Keluarkan:',
      '(1) Ringkasan enak dibaca (Markdown): profil singkat, yang sudah bagus, yang harus dibenahi, 5 langkah prioritas.',
      '(2) Blok JSON valid di dalam pagar kode ```json:',
      '{"scores":{"bio":0,"content_mix":0,"hook_caption":0,"consistency":0,"engagement":0,"overall":0},"strengths":["",""],"weaknesses":["",""],"actions":[{"priority":1,"action":"","why":""}],"content_ideas":["","",""]}',
    ].join('\n');

    const r = await this.llm.complete(REVIEW_PERSONA, user, {
      provider: dto.provider,
      apiKey: dto.apiKey,
      model: dto.model,
      maxTokens: 2200,
    });
    const { readable, json } = splitGeneratorOutput(r.text);
    return {
      handle: profile.username,
      profile: {
        fullName: profile.fullName,
        biography: profile.biography,
        followers: profile.followers,
        postCount: profile.postCount,
      },
      stats,
      readable,
      json,
      model: r.model,
      demo: r.demo,
    };
  }

  /**
   * Bandingkan akun brand vs 1-3 kompetitor. Scrape paralel (gagal per-akun
   * tidak fatal — dicatat), statistik dihitung kode, LLM menyimpulkan celah.
   */
  async compare(_auth: AuthContext, dto: CompareDto) {
    const handles = [dto.brandHandle, ...dto.competitors]
      .map((h) => h.replace(/^@/, '').trim().toLowerCase())
      .filter(Boolean);
    const seen = new Set<string>();
    const unique = handles.filter((h) => !seen.has(h) && (seen.add(h), true));

    const settled = await Promise.allSettled(unique.map((h) => scrapeIgProfile(h)));
    const profiles: IgScrapedProfile[] = [];
    const failed: { handle: string; reason: string }[] = [];
    settled.forEach((s, i) => {
      if (s.status === 'fulfilled' && !s.value.isPrivate) profiles.push(s.value);
      else
        failed.push({
          handle: unique[i],
          reason:
            s.status === 'rejected'
              ? String(s.reason).slice(0, 140)
              : 'akun privat',
        });
    });
    if (profiles.length === 0) {
      throw new Error(
        `Tidak ada akun yang bisa diambil (${failed.map((f) => `@${f.handle}: ${f.reason}`).join('; ')})`,
      );
    }

    const table = profiles.map((p) => ({
      handle: p.username,
      followers: p.followers,
      postCount: p.postCount,
      ...computeStats(p),
    }));

    const user = [
      `BANDINGKAN akun brand @${unique[0]} dengan kompetitornya berdasarkan data asli berikut.`,
      '',
      profiles.map((p) => profileBlock(p, 6)).join('\n\n=====\n\n'),
      '',
      'Analisis WAJIB: siapa unggul di apa (dukung dengan angka dari data), gaya konten & hook tiap akun (kutip contoh caption), celah konten yang kompetitor garap tapi brand belum (dan sebaliknya), peluang yang bisa dimenangkan brand.',
      'Keluarkan:',
      '(1) Ringkasan enak dibaca (Markdown): perbandingan singkat per akun, 3 hal yang kompetitor lakukan lebih baik, 3 keunggulan brand yang harus digas, 5 langkah konkret untuk menang.',
      '(2) Blok JSON valid di dalam pagar kode ```json:',
      '{"verdict":"","competitor_wins":["",""],"brand_wins":["",""],"gaps":["",""],"moves":[{"priority":1,"move":"","why":""}]}',
    ].join('\n');

    const r = await this.llm.complete(COMPARE_PERSONA, user, {
      provider: dto.provider,
      apiKey: dto.apiKey,
      model: dto.model,
      maxTokens: 2400,
    });
    const { readable, json } = splitGeneratorOutput(r.text);
    return { accounts: table, failed, readable, json, model: r.model, demo: r.demo };
  }
}
