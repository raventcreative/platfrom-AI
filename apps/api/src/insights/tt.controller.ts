import { Controller, Get, HttpException, Param } from '@nestjs/common';
import { scrapeTiktokProfile } from './tiktok-scraper';

/**
 * Proxy scrape profil publik TikTok untuk frontend (browser tidak bisa fetch
 * tiktok.com langsung karena CORS). Tanpa AuthGuard: hanya data publik agregat.
 *
 * Batasan jujur: HTML profil TikTok hanya kasih AGREGAT (followers, total likes,
 * jumlah video). Angka per-video (views/likes tiap video) butuh provider data
 * bertandatangan (mis. Apify) — belum diaktifkan di sini. avgLikes = perkiraan
 * kasar dari total likes / jumlah video.
 */
@Controller('tiktok')
export class TtController {
  // GET /tiktok/:handle — agregat publik + engagement rate kasar.
  @Get(':handle')
  async profile(@Param('handle') handle: string) {
    try {
      const p = await scrapeTiktokProfile(handle);
      const avgLikes =
        p.hearts != null && p.videoCount
          ? Math.round(p.hearts / p.videoCount)
          : null;
      // ER kasar per akun: rata-rata likes / followers (per-video tak tersedia dari scrape publik)
      const engagementPct =
        p.followers && avgLikes != null
          ? Number(((avgLikes / p.followers) * 100).toFixed(2))
          : null;
      return {
        platform: 'tiktok',
        username: p.username,
        nickname: p.nickname,
        followers: p.followers,
        totalLikes: p.hearts,
        videoCount: p.videoCount,
        verified: p.verified,
        avgLikes,
        engagementPct,
        posts: [], // per-video butuh provider bertandatangan; isi manual kalau perlu detail viral
        note: 'TikTok publik hanya kasih agregat. Angka per-video/views butuh provider data (Apify) atau isi manual.',
      };
    } catch (e) {
      throw new HttpException(String((e as Error).message ?? e), 502);
    }
  }
}
