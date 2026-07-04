/**
 * Scraper profil publik Instagram TANPA login/API berbayar (best-effort).
 * Memakai endpoint web_profile_info + header lengkap (x-ig-app-id, sec-fetch-*)
 * — tanpa header itu IG menolak dengan "SecFetch Policy violation".
 * Hanya data PUBLIK. IG bisa rate-limit/blok → lempar Error dengan pesan jelas
 * supaya UI bisa menampilkan fallback yang ramah.
 */

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
};

export async function scrapeIgProfile(handle: string): Promise<IgScrapedProfile> {
  const username = handle.replace(/^@/, '').trim().toLowerCase();
  if (!username) throw new Error('Handle IG kosong.');

  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
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
      },
    });
  } catch (e) {
    throw new Error(`Gagal menghubungi Instagram: ${String(e).slice(0, 120)}`);
  }
  if (res.status === 404) throw new Error(`Akun @${username} tidak ditemukan.`);
  if (!res.ok) {
    throw new Error(
      `Instagram membalas ${res.status} — kemungkinan rate-limit/diblok sementara. Coba lagi 1-2 menit.`,
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
