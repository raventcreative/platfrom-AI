/**
 * Publish ke Instagram & Facebook via Meta Graph API (resmi).
 *
 * Syarat (dari sisi user):
 *  - Akun IG Business/Creator yang tertaut ke sebuah Facebook Page.
 *  - Meta App dengan izin: instagram_content_publish, pages_manage_posts.
 *  - Long-lived Page Access Token.
 *  - MEDIA HARUS berupa URL publik (Graph API menarik dari URL, bukan upload byte).
 *
 * Mode dryRun: tidak memanggil API — balikin request yang AKAN dikirim (token disamarkan)
 * supaya alur UI bisa diuji tanpa kredensial asli.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export type PublishResult = {
  platform: 'instagram' | 'facebook' | 'tiktok';
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
  dryRun?: boolean;
  request?: unknown;
};

export type IgPublishInput = {
  igUserId: string;
  accessToken: string;
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  dryRun?: boolean;
};

async function graphPost(url: string, params: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

/** Poll status container video IG sampai FINISHED (Reels butuh transcoding dulu). */
async function waitIgContainer(
  creationId: string,
  accessToken: string,
  tries = 10,
  delayMs = 2500,
): Promise<{ ready: boolean; error?: string }> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(
      `${GRAPH}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`,
    );
    const j: any = await res.json().catch(() => null);
    const code = j?.status_code;
    if (code === 'FINISHED') return { ready: true };
    if (code === 'ERROR' || code === 'EXPIRED')
      return { ready: false, error: j?.status || 'container ' + code };
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { ready: false, error: 'container belum siap setelah beberapa kali cek (video terlalu besar?)' };
}

export async function publishInstagram(input: IgPublishInput): Promise<PublishResult> {
  const { igUserId, accessToken, caption, imageUrl, videoUrl, dryRun } = input;
  if (!igUserId || !accessToken)
    return { platform: 'instagram', ok: false, error: 'IG User ID & Access Token wajib diisi.' };
  if (!imageUrl && !videoUrl)
    return { platform: 'instagram', ok: false, error: 'Butuh URL media PUBLIK (image_url / video_url).' };

  const isVideo = !!videoUrl;
  const createUrl = `${GRAPH}/${igUserId}/media`;
  const publishUrl = `${GRAPH}/${igUserId}/media_publish`;
  const containerParams: Record<string, string> = { caption: caption ?? '', access_token: accessToken };
  if (isVideo) {
    containerParams.media_type = 'REELS';
    containerParams.video_url = videoUrl!;
  } else {
    containerParams.image_url = imageUrl!;
  }

  if (dryRun) {
    return {
      platform: 'instagram',
      ok: true,
      dryRun: true,
      id: 'DRYRUN_IG_CONTAINER',
      request: { createUrl, publishUrl, params: { ...containerParams, access_token: '***' } },
    };
  }

  // 1) Buat media container
  const c = await graphPost(createUrl, containerParams);
  if (!c.ok || !c.json?.id)
    return {
      platform: 'instagram',
      ok: false,
      error: c.json?.error?.message || `Gagal buat container (${c.status}).`,
    };
  const creationId: string = c.json.id;

  // 2) Video → tunggu transcoding selesai
  if (isVideo) {
    const w = await waitIgContainer(creationId, accessToken);
    if (!w.ready)
      return { platform: 'instagram', ok: false, id: creationId, error: w.error };
  }

  // 3) Publish
  const p = await graphPost(publishUrl, { creation_id: creationId, access_token: accessToken });
  if (!p.ok || !p.json?.id)
    return {
      platform: 'instagram',
      ok: false,
      id: creationId,
      error: p.json?.error?.message || `Gagal publish (${p.status}).`,
    };
  return {
    platform: 'instagram',
    ok: true,
    id: p.json.id,
    url: `https://www.instagram.com/p/${p.json.id}/`,
  };
}

export type FbPublishInput = {
  pageId: string;
  accessToken: string;
  message?: string;
  imageUrl?: string;
  linkUrl?: string;
  dryRun?: boolean;
};

export async function publishFacebook(input: FbPublishInput): Promise<PublishResult> {
  const { pageId, accessToken, message, imageUrl, linkUrl, dryRun } = input;
  if (!pageId || !accessToken)
    return { platform: 'facebook', ok: false, error: 'Page ID & Access Token wajib diisi.' };

  // Foto → /photos (pakai url). Tanpa foto → /feed (message + link opsional).
  const isPhoto = !!imageUrl;
  const endpoint = isPhoto ? `${GRAPH}/${pageId}/photos` : `${GRAPH}/${pageId}/feed`;
  const params: Record<string, string> = { access_token: accessToken };
  if (isPhoto) {
    params.url = imageUrl!;
    if (message) params.caption = message;
  } else {
    params.message = message ?? '';
    if (linkUrl) params.link = linkUrl;
  }

  if (dryRun) {
    return {
      platform: 'facebook',
      ok: true,
      dryRun: true,
      id: 'DRYRUN_FB_POST',
      request: { endpoint, params: { ...params, access_token: '***' } },
    };
  }

  const r = await graphPost(endpoint, params);
  const id = r.json?.post_id || r.json?.id;
  if (!r.ok || !id)
    return {
      platform: 'facebook',
      ok: false,
      error: r.json?.error?.message || `Gagal posting FB (${r.status}).`,
    };
  return { platform: 'facebook', ok: true, id, url: `https://www.facebook.com/${id}` };
}
