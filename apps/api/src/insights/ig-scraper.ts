/**
 * Scraper profil publik Instagram TANPA login/API berbayar (best-effort).
 * Memakai endpoint web_profile_info + header lengkap (x-ig-app-id, sec-fetch-*)
 * — tanpa header itu IG menolak dengan "SecFetch Policy violation".
 * Hanya data PUBLIK. IG bisa rate-limit/blok → lempar Error dengan pesan jelas
 * supaya UI bisa menampilkan fallback yang ramah.
 */

import { parseHumanCount } from './youtube-scraper';

export type IgScrapedPost = {
  shortcode: string;
  type: 'carousel' | 'video' | 'image';
  caption: string;
  likes: number | null;
  comments: number | null;
  views: number | null; // play count untuk video/Reels (foto = null)
  takenAt: number | null; // unix seconds
};

export type IgScrapedProfile = {
  username: string;
  fullName: string;
  biography: string;
  followers: number | null;
  following: number | null;
  postCount: number | null;
  isPrivate: boolean;
  posts: IgScrapedPost[];
  note?: string; // catatan (mis. dari fallback / akun privat)
  partial?: boolean; // true = cuma agregat (followers), angka per-post tak terbaca
};

/** Bersihkan input jadi username IG bersih: buang URL, @, query, slash, spasi. */
export function cleanIgHandle(handle: string): string {
  let s = String(handle || '').trim();
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  s = s.replace(/^instagram\.com\//i, '');
  s = s.replace(/[?#].*$/, ''); // buang query/hash
  s = s.replace(/^@+/, '').replace(/\/+$/, '');
  s = s.split('/')[0]; // ambil segmen pertama (buang /reels, /tagged, dst)
  return s.trim().toLowerCase();
}

/** Ambil followers/following/postCount dari og:description IG (fallback logged-out, jalan utk akun privat). */
export function parseIgOgDescription(
  html: string,
): { followers: number | null; following: number | null; postCount: number | null } | null {
  const m =
    html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
  if (!m) return null;
  const txt = m[1];
  const grab = (re: RegExp): number | null => {
    const x = txt.match(re);
    return x ? parseHumanCount(x[1]) : null;
  };
  const followers = grab(/([\d.,]+\s*[kmb]?)\s*(?:followers|pengikut)/i);
  const following = grab(/([\d.,]+\s*[kmb]?)\s*(?:following|mengikuti|diikuti)/i);
  const postCount = grab(/([\d.,]+\s*[kmb]?)\s*(?:posts|kiriman|postingan)/i);
  if (followers == null && following == null && postCount == null) return null;
  return { followers, following, postCount };
}

// STRATEGI 1: endpoint web_profile_info — data lengkap (followers + per-post likes/komen/views).
async function scrapeIgViaApi(username: string): Promise<IgScrapedProfile> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  const headers = {
    'x-ig-app-id': '936619743392459', // app-id web publik IG
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'x-requested-with': 'XMLHttpRequest',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    referer: `https://www.instagram.com/${username}/`,
    origin: 'https://www.instagram.com',
  };
  // IG sering rate-limit sesaat → coba maks 2x dengan jeda, retry HANYA untuk status transient (429/5xx).
  let res: Response | undefined;
  let lastErr = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1200));
    try {
      res = await fetch(url, { headers });
    } catch (e) {
      lastErr = `Gagal menghubungi Instagram: ${String(e).slice(0, 100)}`;
      continue; // error jaringan → retry
    }
    if (res.status === 404) throw new Error(`Akun @${username} tidak ditemukan.`);
    if (res.ok) break;
    lastErr = `Instagram membalas ${res.status}`;
    if (![429, 500, 502, 503, 504].includes(res.status)) break; // 401/403 = blok tegas → stop
  }
  if (!res || !res.ok) {
    throw new Error(
      `${lastErr || 'Instagram tidak merespons'} — kemungkinan rate-limit/diblok sementara oleh Instagram (umum untuk scrape dari server). Coba lagi 1-2 menit, atau isi angka manual.`,
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('Respons Instagram tidak bisa dibaca (kemungkinan login wall).');
  }
  const u = data?.data?.user;
  if (!u) throw new Error(`Akun @${username} tidak ditemukan atau tidak publik.`);

  const edges = u?.edge_owner_to_timeline_media?.edges ?? [];
  const posts: IgScrapedPost[] = edges.map((e: any) => {
    const n = e?.node ?? {};
    const type: IgScrapedPost['type'] =
      n.__typename === 'GraphSidecar'
        ? 'carousel'
        : n.is_video
          ? 'video'
          : 'image';
    return {
      shortcode: n.shortcode ?? '',
      type,
      caption: n?.edge_media_to_caption?.edges?.[0]?.node?.text ?? '',
      likes: n?.edge_liked_by?.count ?? n?.edge_media_preview_like?.count ?? null,
      comments: n?.edge_media_to_comment?.count ?? null,
      views: n?.video_view_count ?? n?.video_play_count ?? null,
      takenAt: n?.taken_at_timestamp ?? null,
    };
  });

  return {
    username,
    fullName: u.full_name ?? '',
    biography: u.biography ?? '',
    followers: u?.edge_followed_by?.count ?? null,
    following: u?.edge_follow?.count ?? null,
    postCount: u?.edge_owner_to_timeline_media?.count ?? null,
    isPrivate: Boolean(u.is_private),
    posts,
  };
}

// STRATEGI 2 (fallback): baca HTML profil → og:description. Hanya AGREGAT (followers/following/
// jumlah post), tanpa per-post — tapi jalan walau API diblok & untuk akun privat. UA "facebookexternalhit"
// bikin IG menyajikan meta tag preview dengan bersih.
async function scrapeIgViaHtml(username: string): Promise<IgScrapedProfile> {
  const url = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  let res: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1000));
    try {
      res = await fetch(url, {
        headers: {
          'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'accept-language': 'en-US,en;q=0.9',
        },
      });
    } catch {
      continue;
    }
    if (res.ok) break;
  }
  if (!res || !res.ok) throw new Error(`halaman IG membalas ${res ? res.status : 'timeout'}`);
  const html = await res.text();
  const og = parseIgOgDescription(html);
  if (!og || og.followers == null) throw new Error('data profil tak ada di halaman (login wall).');
  return {
    username,
    fullName: '',
    biography: '',
    followers: og.followers,
    following: og.following,
    postCount: og.postCount,
    isPrivate: false,
    posts: [],
    partial: true,
    note: 'Angka per-post IG lagi nggak bisa ditarik otomatis (API diblok / akun privat). Followers udah keisi — isi like/komen/view manual buat hitung ER & konten viral.',
  };
}

// Orchestrator: coba API dulu (lengkap), gagal → fallback HTML (agregat). Dua-duanya gagal → error jelas.
export async function scrapeIgProfile(handle: string): Promise<IgScrapedProfile> {
  const username = cleanIgHandle(handle);
  if (!username) throw new Error('Handle IG kosong.');
  try {
    const full = await scrapeIgViaApi(username);
    // API sukses tapi post kosong (akun privat / IG sembunyiin) → lengkapi followers dari HTML kalau perlu
    if (!full.posts.length) {
      full.partial = true;
      if (full.followers == null) {
        try {
          const alt = await scrapeIgViaHtml(username);
          full.followers = full.followers ?? alt.followers;
          full.following = full.following ?? alt.following;
          full.postCount = full.postCount ?? alt.postCount;
        } catch {
          /* biarkan; tetap balikin data API seadanya */
        }
      }
      full.note =
        full.note ||
        'Angka per-post IG nggak kebaca (akun privat / dibatasi). Followers ada — isi like/komen/view manual buat ER & konten viral.';
    }
    return full;
  } catch (apiErr) {
    try {
      return await scrapeIgViaHtml(username); // fallback: minimal followers kebaca
    } catch {
      throw new Error(
        `${String((apiErr as Error).message || apiErr)} — kemungkinan rate-limit/diblok Instagram atau akun privat. Coba lagi 1-2 menit, cek ejaan @handle, atau isi angka manual.`,
      );
    }
  }
}

/** Statistik deterministik dari post terbaru — dihitung di kode, bukan oleh AI. */
export function computeStats(p: IgScrapedProfile) {
  const posts = p.posts;
  const n = posts.length;
  const mix = { carousel: 0, video: 0, image: 0 };
  let likeSum = 0;
  let likeN = 0;
  let comSum = 0;
  let comN = 0;
  for (const post of posts) {
    mix[post.type]++;
    if (post.likes != null) {
      likeSum += post.likes;
      likeN++;
    }
    if (post.comments != null) {
      comSum += post.comments;
      comN++;
    }
  }
  const avgLikes = likeN ? Math.round(likeSum / likeN) : null;
  const avgComments = comN ? Math.round(comSum / comN) : null;
  // Engagement rate kasar per post: (avg likes + avg comments) / followers.
  const engagementPct =
    p.followers && avgLikes != null
      ? Number((((avgLikes + (avgComments ?? 0)) / p.followers) * 100).toFixed(2))
      : null;
  // Frekuensi posting: rentang waktu post terbaru → post/minggu.
  const times = posts.map((x) => x.takenAt).filter((t): t is number => t != null);
  let postsPerWeek: number | null = null;
  if (times.length >= 2) {
    const spanDays = (Math.max(...times) - Math.min(...times)) / 86400;
    if (spanDays > 0) postsPerWeek = Number(((n - 1) / (spanDays / 7)).toFixed(1));
  }
  return { sampled: n, mix, avgLikes, avgComments, engagementPct, postsPerWeek };
}

/** Rangkai profil + statistik + caption jadi blok teks untuk prompt LLM. */
export function profileBlock(p: IgScrapedProfile, maxCaptions = 8): string {
  const s = computeStats(p);
  const lines = [
    `AKUN @${p.username}${p.fullName ? ` (${p.fullName})` : ''}`,
    p.biography ? `Bio: ${p.biography}` : '',
    `Followers: ${p.followers ?? '?'} | Following: ${p.following ?? '?'} | Total post: ${p.postCount ?? '?'}`,
    `Sampel ${s.sampled} post terbaru → carousel ${s.mix.carousel}, video ${s.mix.video}, foto ${s.mix.image}`,
    s.avgLikes != null ? `Rata-rata likes: ${s.avgLikes}${s.avgComments != null ? ` | komentar: ${s.avgComments}` : ''}` : '',
    s.engagementPct != null ? `Engagement rate kasar: ${s.engagementPct}%` : '',
    s.postsPerWeek != null ? `Frekuensi posting: ~${s.postsPerWeek} post/minggu` : '',
    '',
    'CAPTION TERBARU:',
    ...p.posts
      .filter((x) => x.caption.trim())
      .slice(0, maxCaptions)
      .map(
        (x, i) =>
          `${i + 1}. [${x.type}${x.likes != null ? `, ${x.likes} likes` : ''}] ${x.caption.slice(0, 400)}`,
      ),
  ];
  return lines.filter(Boolean).join('\n');
}
