import { Controller, Get, HttpException, Param } from '@nestjs/common';
import { engagementStats } from './engagement';
import { computeStats, scrapeIgProfile } from './ig-scraper';

/**
 * Proxy scrape profil publik Instagram untuk frontend (browser tidak bisa
 * fetch instagram.com langsung karena CORS). SENGAJA tanpa AuthGuard:
 * hanya meneruskan data publik IG, tidak menyentuh data org/user manapun —
 * dipakai prototype Content Engine untuk fitur training & riset.
 */
@Controller('ig')
export class IgController {
  // GET /ig/:handle — profil + statistik + engagement (total view/likes, ER, konten viral).
  @Get(':handle')
  async profile(@Param('handle') handle: string) {
    try {
      const p = await scrapeIgProfile(handle);
      return {
        ...p,
        platform: 'instagram',
        stats: computeStats(p),
        engagement: engagementStats(p.followers ?? 0, p.posts),
      };
    } catch (e) {
      // 502: sumber eksternal gagal (rate-limit, akun privat/tak ada, dst).
      throw new HttpException(String((e as Error).message ?? e), 502);
    }
  }
}
