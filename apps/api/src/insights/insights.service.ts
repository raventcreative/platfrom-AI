import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthContext } from '../auth/auth.decorator';
import { buildBrandProfile, splitGeneratorOutput } from '../content';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { InsightDto } from './dto/insight.dto';
import { ScraperService } from './scraper.service';

type Prompt = { system: string; user: string };

/**
 * Alat "insight" berbasis LLM: cari kompetitor, audit IG (strength/weakness),
 * inspirasi konten, dan education insight. Untuk audit IG memakai data live
 * dari ScraperService bila dikonfigurasi; jika tidak, memakai data yang
 * ditempel user + pengetahuan AI.
 */
@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly scraper: ScraperService,
  ) {}

  async run(auth: AuthContext, dto: InsightDto) {
    const brandText = await this.brandContext(auth, dto.brandId);
    const params = dto.params ?? {};

    let prompt: Prompt;
    let liveData = false;

    switch (dto.type) {
      case 'competitor':
        prompt = competitorPrompt(brandText, params);
        break;
      case 'ig_audit': {
        const scraped = await this.scraper.fetchInstagram(params.handle);
        liveData = scraped != null;
        prompt = igAuditPrompt(brandText, params, scraped);
        break;
      }
      case 'inspiration':
        prompt = inspirationPrompt(brandText, params);
        break;
      case 'education':
        prompt = educationPrompt(brandText, params);
        break;
      case 'content_intel': {
        const handles = splitHandles(params.handles);
        const scrapedList = await this.scraper.fetchInstagramMany(handles);
        liveData = scrapedList.length > 0;
        prompt = contentIntelPrompt(brandText, params, scrapedList);
        break;
      }
      case 'ig_insight': {
        const handles = splitHandles(params.handles);
        const scrapedList = await this.scraper.fetchInstagramMany(handles);
        liveData = scrapedList.length > 0;
        prompt = igInsightPrompt(brandText, params, scrapedList);
        break;
      }
      case 'ig_research': {
        // Scrape akun user + akun kompetitor (bila handle diberi & scraper aktif).
        const mine = await this.scraper.fetchInstagram(params.myHandle);
        const compScraped = await this.scraper.fetchInstagramMany(
          splitHandles(params.competitors),
        );
        liveData = mine != null || compScraped.length > 0;
        prompt = igResearchPrompt(brandText, params, mine, compScraped);
        break;
      }
      default:
        throw new NotFoundException('Jenis insight tidak dikenal');
    }

    const result = await this.llm.complete(prompt.system, prompt.user, {
      provider: dto.provider,
      apiKey: dto.apiKey,
      model: dto.model,
      // Insight = output panjang + JSON terstruktur; beri ruang token lebih.
      maxTokens: 4000,
    });

    // Objek JSON dipakai internal untuk kartu; teks tampilan DIBERSIHKAN dari
    // blok ```json (termasuk yang ter-truncate) agar tak muncul di UI.
    const { json } = splitGeneratorOutput(result.text);
    const text = stripJsonBlocks(result.text);

    return {
      type: dto.type,
      text,
      json, // objek terstruktur untuk dirender jadi kartu di UI (bisa null)
      model: result.model,
      demo: result.demo,
      liveData, // true bila memakai data scraper sungguhan
      scraperConfigured: this.scraper.configured,
    };
  }

  /** Rangkai teks profil brand (bila brandId diberikan & milik org). */
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

// ── Prompt builders ────────────────────────────────────────────────
const PERSONA =
  'Kamu analis strategi digital marketing & riset pasar senior untuk agency konten di Indonesia. Jawab ringkas, konkret, actionable, dalam Bahasa Indonesia.';

/** Hapus blok kode ```json (tertutup maupun ter-truncate) dari teks tampilan. */
function stripJsonBlocks(s: string): string {
  return s
    .replace(/```json[\s\S]*?```/gi, '') // blok json tertutup
    .replace(/```json[\s\S]*$/i, '') // blok json ter-truncate di akhir
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Pisah string handle "a, @b" menjadi array bersih. */
function splitHandles(raw?: string): string[] {
  return (raw ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
}

/**
 * IG Competitor Insight — fokus MENGGALI INSIGHT dari akun kompetitor IG.
 * Output JSON ketat agar bisa dirender jadi kartu di UI.
 */
function igInsightPrompt(
  brandText: string,
  p: Record<string, string>,
  scraped: { handle: string; data: unknown }[],
): Prompt {
  const dataBlock = scraped.length
    ? `\nDATA AKUN (live dari scraper — SUMBER UTAMA analisis; pakai angka & konten nyata):\n${JSON.stringify(scraped).slice(0, 9000)}`
    : p.pasted
      ? `\nDATA YANG DITEMPEL USER (bio/caption/hook/metrik contoh konten kompetitor):\n${p.pasted.slice(0, 9000)}`
      : '\n(Tidak ada data mentah — analisis berdasar handle/niche + pengetahuan umum; tandai bagian yang tidak pasti.)';

  return {
    system: PERSONA,
    user: [
      'Tugas: GALI INSIGHT dari akun-akun kompetitor Instagram berikut.',
      brandBlock(brandText),
      p.handles ? `\nAkun kompetitor: ${p.handles}` : '',
      p.niche ? `\nNiche/kategori: ${p.niche}` : '',
      dataBlock,
      '',
      'Analisis mendalam & bandingkan antar akun: content pillars, POLA HOOK yang sering dipakai + kenapa nempel, campuran FORMAT (Reels/Carousel/Story/Feed), pola/frekuensi posting, PENDORONG ENGAGEMENT (apa yang bikin views/likes/komentar tinggi), tema yang perform, kekuatan & kelemahan, lalu CELAH yang bisa direbut brand kita + rekomendasi langkah (plays).',
      '',
      'Keluarkan: (1) versi enak dibaca dengan heading jelas; (2) blok JSON valid di dalam pagar kode ```json (WAJIB, ikuti skema persis):',
      '{"accounts":[{"handle":"","niche_fit":"","positioning":"","est_followers":"","note":""}],"content_pillars":[],"top_hooks":[{"hook":"","why_works":""}],"format_mix":[{"format":"","share":""}],"posting_cadence":"","engagement_drivers":[],"strengths":[],"weaknesses":[],"gaps_to_exploit":[],"recommended_plays":[{"play":"","rationale":""}]}',
    ].join('\n'),
  };
}

function brandBlock(brandText: string): string {
  return brandText
    ? `\n\n================ PROFIL BRAND ================\n${brandText}\n=============================================`
    : '';
}

function competitorPrompt(
  brandText: string,
  p: Record<string, string>,
): Prompt {
  return {
    system: PERSONA,
    user: [
      'Tugas: temukan & analisis KOMPETITOR untuk brand berikut.',
      brandBlock(brandText),
      p.notes ? `\nCatatan tambahan dari user: ${p.notes}` : '',
      p.area ? `\nFokus area/pasar: ${p.area}` : '',
      '',
      'Keluarkan 5-8 kompetitor relevan. Untuk tiap kompetitor beri: nama, kenapa jadi kompetitor, positioning/USP, perkiraan kekuatan, dan CELAH yang bisa dimanfaatkan brand kita.',
      'Format: (1) versi enak dibaca (daftar bernomor); (2) blok JSON valid di dalam pagar kode ```json:',
      '{"competitors":[{"name":"","why":"","positioning":"","strength":"","gap_to_exploit":""}]}',
    ].join('\n'),
  };
}

function igAuditPrompt(
  brandText: string,
  p: Record<string, string>,
  scraped: unknown | null,
): Prompt {
  const dataBlock = scraped
    ? `\nDATA AKUN (dari scraper, dipakai sebagai sumber utama):\n${JSON.stringify(scraped).slice(0, 6000)}`
    : p.pasted
      ? `\nDATA YANG DITEMPEL USER (bio/caption/contoh konten):\n${p.pasted.slice(0, 6000)}`
      : '\n(Tidak ada data mentah — analisis berdasarkan handle & pengetahuan umum; beri disclaimer bila tidak yakin.)';

  return {
    system: PERSONA,
    user: [
      `Tugas: AUDIT akun Instagram ${p.handle ? '@' + p.handle.replace(/^@/, '') : '(handle tidak diberikan)'} untuk mengetahui STRENGTH & WEAKNESS.`,
      brandBlock(brandText),
      dataBlock,
      '',
      'Analisis: (a) Strength, (b) Weakness, (c) Opportunity, (d) Threat (SWOT); content pillars yang terlihat; kualitas hook/caption/visual; konsistensi & frekuensi; lalu 3-5 rekomendasi konkret yang bisa ditiru/dihindari brand kita.',
      'Format: (1) versi enak dibaca; (2) blok JSON valid ```json:',
      '{"account":"","strengths":[],"weaknesses":[],"opportunities":[],"threats":[],"content_pillars":[],"recommendations":[]}',
    ].join('\n'),
  };
}

function inspirationPrompt(
  brandText: string,
  p: Record<string, string>,
): Prompt {
  return {
    system: PERSONA,
    user: [
      'Tugas: beri INSPIRASI KONTEN segar & relevan (bukan sekadar ide generik) untuk brand berikut.',
      brandBlock(brandText),
      p.theme ? `\nTema/arah yang diminta: ${p.theme}` : '',
      p.platform ? `\nPlatform: ${p.platform}` : '',
      '',
      'Berikan 8-10 inspirasi. Tiap item: judul/angle, format (Reels/Carousel/Story/Foto), hook 1 baris, ringkasan eksekusi, dan referensi tren/pola yang menginspirasi.',
      'Keluarkan sebagai teks Markdown rapi (heading/daftar). JANGAN sertakan blok JSON atau kode.',
    ].join('\n'),
  };
}

function contentIntelPrompt(
  brandText: string,
  p: Record<string, string>,
  scraped: { handle: string; data: unknown }[],
): Prompt {
  const dataBlock = scraped.length
    ? `\nDATA KOMPETITOR (live dari scraper — pakai sebagai sumber utama analisis):\n${JSON.stringify(
        scraped,
      ).slice(0, 9000)}`
    : p.pasted
      ? `\nDATA YANG DITEMPEL USER (link/caption/contoh konten kompetitor):\n${p.pasted.slice(0, 9000)}`
      : '\n(Tidak ada data mentah — pakai handle/niche + pengetahuan umum; beri disclaimer bila tak yakin.)';

  return {
    system: PERSONA,
    user: [
      'Tugas: RISET KOMPETITOR INSTAGRAM + RENCANA KONTEN MARKETING (alur: research → analyze → create).',
      brandBlock(brandText),
      p.niche ? `\nNiche/kategori: ${p.niche}` : '',
      p.area ? `\nArea/pasar: ${p.area}` : '',
      p.handles ? `\nKandidat kompetitor (handle IG): ${p.handles}` : '',
      p.notes ? `\nCatatan tambahan: ${p.notes}` : '',
      p.goal ? `\nTujuan konten: ${p.goal}` : '',
      dataBlock,
      '',
      'Hasilkan TIGA bagian:',
      '1) KOMPETITOR — 5-8 akun IG relevan: @handle, kenapa kompetitor, positioning/USP, estimasi performa & audiens, dan celah yang bisa direbut.',
      '2) POLA KONTEN MENANG — dari konten mereka: tipe hook yang sering dipakai, format (Reels/Carousel/Story), tema/pillar, gaya visual & caption, frekuensi/pola posting, dan APA yang bikin perform.',
      '3) RENCANA KONTEN MARKETING (untuk brand kita) — 5-7 ide/skrip SIAP PAKAI yang mengadaptasi pola menang itu ke voice & produk brand kita. Tiap item: judul/angle, format, hook 1 baris, ringkasan eksekusi/skrip singkat, dan CTA.',
      '',
      'Format: (1) versi enak dibaca (3 bagian di atas dengan heading jelas); (2) blok JSON valid di dalam pagar kode ```json:',
      '{"competitors":[{"handle":"","why":"","positioning":"","performance":"","gap_to_exploit":""}],"winning_patterns":{"hooks":[],"formats":[],"pillars":[],"caption_style":"","posting_pattern":""},"content_plan":[{"title":"","format":"","hook":"","execution":"","cta":""}]}',
    ].join('\n'),
  };
}

/**
 * IG Research all-in-one: review akun IG user + temukan kompetitor + riset
 * pola konten kompetitor + rencana aksi. Output JSON ketat → kartu di UI.
 */
function igResearchPrompt(
  brandText: string,
  p: Record<string, string>,
  mine: unknown | null,
  competitors: { handle: string; data: unknown }[],
): Prompt {
  const myBlock = mine
    ? `\nDATA AKUN SAYA (live dari scraper — sumber utama review):\n${JSON.stringify(mine).slice(0, 5000)}`
    : p.pasted
      ? `\nDATA AKUN SAYA / catatan (ditempel user):\n${p.pasted.slice(0, 5000)}`
      : '\n(Tidak ada data mentah akun saya — review berdasar handle/niche + pengetahuan umum; tandai yang tak pasti.)';
  const compBlock = competitors.length
    ? `\nDATA KOMPETITOR (live dari scraper):\n${JSON.stringify(competitors).slice(0, 5000)}`
    : '';

  return {
    system: PERSONA,
    user: [
      'Tugas ALL-IN-ONE untuk akun Instagram saya:',
      `Akun saya: ${p.myHandle ? '@' + p.myHandle.replace(/^@/, '') : '(tidak diberikan)'}`,
      p.niche ? `Niche/kategori: ${p.niche}` : '',
      p.competitors ? `Kandidat kompetitor (bila ada): ${p.competitors}` : '',
      brandBlock(brandText),
      myBlock,
      compBlock,
      '',
      'Kerjakan 4 hal:',
      '1) REVIEW AKUN SAYA — ringkasan, kekuatan, kelemahan, peluang, content pillars yang terlihat, dan rekomendasi perbaikan konkret.',
      '2) TEMUKAN KOMPETITOR — 5-8 akun IG kompetitor relevan (kalau user tak memberi handle, usulkan berdasar niche): @handle, kenapa kompetitor, positioning, estimasi followers, dan celah yang bisa direbut.',
      '3) RISET KOMPETITOR — pola konten menang lintas kompetitor: hook yang sering dipakai + kenapa nempel, campuran format, content pillars, pola/frekuensi posting, dan pendorong engagement.',
      '4) RENCANA AKSI untuk akun saya — 5-7 langkah konkret (plays) memanfaatkan celah + pola menang, disesuaikan brand saya.',
      '',
      'Keluarkan: (1) versi enak dibaca dengan heading jelas per bagian; (2) blok JSON valid di dalam pagar kode ```json (WAJIB, skema persis):',
      '{"my_account":{"handle":"","summary":"","strengths":[],"weaknesses":[],"opportunities":[],"content_pillars":[],"recommendations":[]},"competitors":[{"handle":"","why":"","positioning":"","est_followers":"","gap_to_exploit":""}],"competitor_research":{"winning_hooks":[{"hook":"","why_works":""}],"format_mix":[{"format":"","share":""}],"content_pillars":[],"posting_cadence":"","engagement_drivers":[]},"action_plan":[{"play":"","rationale":""}]}',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

function educationPrompt(
  brandText: string,
  p: Record<string, string>,
): Prompt {
  return {
    system: PERSONA,
    user: [
      'Tugas: EDUCATION INSIGHT — rangkum pembelajaran, tren, dan best-practice marketing/konten yang relevan untuk tim brand ini agar makin jago.',
      brandBlock(brandText),
      p.topic ? `\nTopik yang diminta: ${p.topic}` : '',
      '',
      'Berikan: 5-7 insight/pelajaran penting (dengan alasan singkat & cara terapkan), plus 3 action item minggu ini.',
      'Keluarkan sebagai teks Markdown rapi (heading/daftar). JANGAN sertakan blok JSON atau kode.',
    ].join('\n'),
  };
}
