/**
 * Publish video ke TikTok via Content Posting API (Direct Post).
 *
 * Syarat (dari sisi user):
 *  - TikTok Developer App + login OAuth user, scope: video.publish.
 *  - App harus lolos audit TikTok untuk Direct Post (sebelum audit hanya bisa
 *    SELF_ONLY / draft). Kami default privacy SELF_ONLY biar aman saat testing.
 *  - Video di-tarik dari URL publik (PULL_FROM_URL) — domain URL harus terverifikasi
 *    di TikTok Developer Portal, atau pakai FILE_UPLOAD (tidak dipakai di sini).
 *
 * Mode dryRun: balikin request tanpa memanggil API.
 */

import type { PublishResult } from './meta-publish';

const TT_INIT = 'https://open.tiktokapis.com/v2/post/publish/video/init/';

export type TiktokPublishInput = {
  accessToken: string;
  videoUrl: string;
  caption?: string;
  privacy?: 'SELF_ONLY' | 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR';
  dryRun?: boolean;
};

export async function publishTiktok(input: TiktokPublishInput): Promise<PublishResult> {
  const { accessToken, videoUrl, caption, privacy, dryRun } = input;
  if (!accessToken)
    return { platform: 'tiktok', ok: false, error: 'Access Token TikTok wajib diisi.' };
  if (!videoUrl)
    return { platform: 'tiktok', ok: false, error: 'Butuh URL video PUBLIK (TikTok cuma menerima video).' };

  const body = {
    post_info: {
      title: (caption ?? '').slice(0, 2200),
      privacy_level: privacy ?? 'SELF_ONLY',
      disable_comment: false,
      disable_duet: false,
      disable_stitch: false,
    },
    source_info: {
      source: 'PULL_FROM_URL',
      video_url: videoUrl,
    },
  };

  if (dryRun) {
    return {
      platform: 'tiktok',
      ok: true,
      dryRun: true,
      id: 'DRYRUN_TT_PUBLISH',
      request: { url: TT_INIT, body },
    };
  }

  let res: Response;
  try {
    res = await fetch(TT_INIT, {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + accessToken,
        'content-type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { platform: 'tiktok', ok: false, error: 'Gagal hubungi TikTok: ' + String(e).slice(0, 100) };
  }
  const j: any = await res.json().catch(() => null);
  const err = j?.error;
  // TikTok balikin error.code === 'ok' saat sukses
  if (!res.ok || (err && err.code && err.code !== 'ok')) {
    return {
      platform: 'tiktok',
      ok: false,
      error: (err?.message || err?.code || `HTTP ${res.status}`) + '',
    };
  }
  const publishId: string | undefined = j?.data?.publish_id;
  return {
    platform: 'tiktok',
    ok: true,
    id: publishId,
    // status upload bisa dicek via /v2/post/publish/status/fetch/ (butuh polling terpisah)
    url: undefined,
  };
}
