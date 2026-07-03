import { Controller, Get, HttpException, Param } from '@nestjs/common';
import { computeStats, scrapeIgProfile } from './ig-scraper';

/**
 * Proxy scrape profil publik Instagram untuk frontend (browser tidak bisa
 * fetch instagram.com langsung karena CORS). SENGAJA tanpa AuthGuard:
 * hanya meneruskan data publik IG, tidak menyentuh data org/user manapun —
 * dipakai prototype Content Engine untuk fitur training & riset.
 */
@Controller('ig')
export class IgController {
  // GET /ig/:handle — profil + statistik + post terbaru (data publik).
  @Get(':handle')
  async profile(@Param('handle') handle: string) {
    try {
      const p = await scrapeIgProfile(handle);
      return { ...p, stats: computeStats(p) };
    } catch (e) {
      // 502: sumber eksternal gagal (rate-limit, akun privat/tak ada, dst).
      throw new HttpException(String((e as Error).message ?? e), 502);
    }
  }
}
