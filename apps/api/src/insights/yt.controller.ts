import { Controller, Get, HttpException, Param } from '@nestjs/common';
import { scrapeYoutubeChannel } from './youtube-scraper';

/**
 * Proxy scrape channel publik YouTube untuk frontend (browser tak bisa fetch
 * youtube.com langsung karena CORS). Tanpa AuthGuard: hanya data publik.
 *
 * Batasan jujur: daftar video channel hanya kasih VIEWS per video. Likes &
 * komentar per video butuh halaman watch / YouTube Data API — di sini null.
 */
@Controller('youtube')
export class YtController {
  // GET /youtube/:handle — subscriber + jumlah video + video terbaru (views).
  @Get(':handle')
  async channel(@Param('handle') handle: string) {
    try {
      const c = await scrapeYoutubeChannel(handle);
      const posts = c.videos.map((v) => ({
        shortcode: v.videoId,
        title: v.title,
        likes: v.likes,
        comments: v.comments,
        views: v.views,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
      }));
      const totalViews = posts.reduce((a, p) => a + (p.views ?? 0), 0);
      const avgViews = posts.length ? Math.round(totalViews / posts.length) : null;
      return {
        platform: 'youtube',
        username: c.handle,
        title: c.title,
        followers: c.subscribers, // subscriber = "followers"
        videoCount: c.videoCount,
        sampled: posts.length,
        totalViews,
        avgViews,
        posts,
        note: 'YouTube publik: views per video tersedia, tapi likes/komentar per video butuh YouTube Data API. Subscriber = followers.',
      };
    } catch (e) {
      throw new HttpException(String((e as Error).message ?? e), 502);
    }
  }
}
