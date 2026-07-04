import { Body, Controller, Post } from '@nestjs/common';
import {
  publishFacebook,
  publishInstagram,
  type PublishResult,
} from './meta-publish';
import { publishTiktok } from './tiktok-publish';

/**
 * Cross-post: kirim 1 konten ke beberapa platform sekaligus (IG + FB + TikTok).
 * SENGAJA tanpa AuthGuard — dipakai prototype Content Engine. Kredensial (token
 * akun bisnis user) dikirim per-request dari browser, tidak disimpan di server.
 *
 * dryRun=true → tidak memanggil API mana pun; balikin request yang akan dikirim
 * (buat menguji alur tanpa token asli).
 */

type Creds = {
  metaToken?: string; // Page Access Token (dipakai IG & FB)
  igUserId?: string;
  fbPageId?: string;
  tiktokToken?: string;
};

type CrossPostDto = {
  platforms?: string[]; // ['instagram','facebook','tiktok']
  caption?: string;
  mediaUrl?: string; // URL publik gambar/video
  mediaType?: 'image' | 'video';
  creds?: Creds;
  dryRun?: boolean;
};

@Controller('publish')
export class PublishController {
  // POST /publish/all — cross-post ke semua platform terpilih, balikin hasil per-platform.
  @Post('all')
  async all(@Body() dto: CrossPostDto) {
    const platforms = Array.isArray(dto.platforms) ? dto.platforms : [];
    const creds = dto.creds ?? {};
    const isVideo = dto.mediaType === 'video';
    const caption = dto.caption ?? '';
    const mediaUrl = dto.mediaUrl ?? '';
    const dryRun = !!dto.dryRun;

    const jobs: Promise<PublishResult>[] = [];

    if (platforms.includes('instagram')) {
      jobs.push(
        publishInstagram({
          igUserId: creds.igUserId ?? '',
          accessToken: creds.metaToken ?? '',
          caption,
          imageUrl: isVideo ? undefined : mediaUrl,
          videoUrl: isVideo ? mediaUrl : undefined,
          dryRun,
        }),
      );
    }
    if (platforms.includes('facebook')) {
      jobs.push(
        publishFacebook({
          pageId: creds.fbPageId ?? '',
          accessToken: creds.metaToken ?? '',
          message: caption,
          imageUrl: isVideo ? undefined : mediaUrl || undefined,
          dryRun,
        }),
      );
    }
    if (platforms.includes('tiktok')) {
      jobs.push(
        publishTiktok({
          accessToken: creds.tiktokToken ?? '',
          videoUrl: mediaUrl,
          caption,
          dryRun,
        }),
      );
    }

    const results = await Promise.all(jobs);
    return {
      dryRun,
      okCount: results.filter((r) => r.ok).length,
      total: results.length,
      results,
    };
  }
}
