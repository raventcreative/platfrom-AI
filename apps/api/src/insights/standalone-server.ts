/**
 * standalone-server.ts — server RISET ringan buat fitur "Ambil otomatis".
 *
 * Kenapa ada: fitur engagement/konten-viral (tabel like·view per post) butuh
 * data dari IG/TikTok/YouTube. Browser NGGAK BISA fetch situs itu langsung
 * (diblok CORS), jadi butuh server perantara. Server penuh (apps/api) butuh
 * Postgres + Redis — kelewat berat cuma buat scrape angka publik. File ini
 * cuma pakai logika scraper (fetch murni), TANPA database/Redis/NestJS.
 *
 * Jalankan (dari folder apps/api):
 *   npm run riset
 * lalu di aplikasi: ⚙️ → Backend Riset = http://localhost:4000 → Simpan.
 * Sekarang tombol "🔗 Ambil otomatis" di tiap kompetitor & akunmu bakal jalan.
 *
 * Endpoint (sama persis dengan apps/api): GET /api/v1/ig|tiktok|youtube/:handle
 */
import { createServer } from 'node:http';
import { computeStats, scrapeIgProfile } from './ig-scraper';
import { engagementStats } from './engagement';
import { scrapeTiktokProfile } from './tiktok-scraper';
import { scrapeYoutubeChannel } from './youtube-scraper';

const PORT = Number(process.env.RISET_PORT ?? 4000);

// ── handler per platform: balikin JSON dengan bentuk SAMA seperti controller NestJS ──
async function igHandler(handle: string) {
  const p = await scrapeIgProfile(handle);
  return {
    ...p,
    platform: 'instagram',
    stats: computeStats(p),
    engagement: engagementStats(p.followers ?? 0, p.posts),
  };
}

async function tiktokHandler(handle: string) {
  const p = await scrapeTiktokProfile(handle);
  const avgLikes = p.hearts != null && p.videoCount ? Math.round(p.hearts / p.videoCount) : null;
  const engagementPct =
    p.followers && avgLikes != null ? Number(((avgLikes / p.followers) * 100).toFixed(2)) : null;
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
    posts: [],
    note: 'TikTok publik hanya kasih agregat. Angka per-video/views butuh provider data (Apify) atau isi manual.',
  };
}

async function youtubeHandler(handle: string) {
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
    followers: c.subscribers,
    videoCount: c.videoCount,
    sampled: posts.length,
    totalViews,
    avgViews,
    posts,
    note: 'YouTube publik: views per video tersedia, tapi likes/komentar per video butuh YouTube Data API. Subscriber = followers.',
  };
}

const ROUTES: Record<string, (h: string) => Promise<unknown>> = {
  ig: igHandler,
  instagram: igHandler,
  tiktok: tiktokHandler,
  youtube: youtubeHandler,
};

const server = createServer(async (req, res) => {
  // CORS: izinkan dipanggil dari file:// (Origin "null") maupun localhost web app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  const send = (code: number, body: unknown) => {
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
  };

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const parts = url.pathname.replace(/^\/+/, '').split('/'); // ["api","v1","ig","<handle>"]
  const idx = parts.indexOf('v1');
  const platform = idx >= 0 ? parts[idx + 1] : parts[0];
  const handle = decodeURIComponent(idx >= 0 ? parts[idx + 2] ?? '' : parts[1] ?? '');

  if (url.pathname === '/' || url.pathname === '/health') {
    send(200, { ok: true, service: 'riset-standalone', endpoints: ['/api/v1/ig/:handle', '/api/v1/tiktok/:handle', '/api/v1/youtube/:handle'] });
    return;
  }
  const fn = ROUTES[platform];
  if (!fn) {
    send(404, { message: `Rute nggak dikenal: /${platform}. Pakai ig / tiktok / youtube.` });
    return;
  }
  if (!handle) {
    send(400, { message: 'Handle kosong. Contoh: /api/v1/ig/natgeo' });
    return;
  }
  const t0 = Date.now();
  try {
    const data = await fn(handle);
    console.log(`✓ ${platform}/${handle} (${Date.now() - t0}ms)`);
    send(200, data);
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    console.log(`✗ ${platform}/${handle} — ${msg.slice(0, 100)}`);
    // 502: sumber eksternal (IG/TikTok/YT) gagal — rate-limit/blok/akun privat. Sama seperti apps/api.
    send(502, { message: msg });
  }
});

server.listen(PORT, () => {
  console.log(`\n🔎 Server Riset jalan di http://localhost:${PORT}`);
  console.log('   Di aplikasi: ⚙️ → Backend Riset = http://localhost:' + PORT + ' → Simpan.');
  console.log('   Endpoint: /api/v1/ig/:handle · /api/v1/tiktok/:handle · /api/v1/youtube/:handle');
  console.log('   (Ctrl+C buat stop)\n');
});
