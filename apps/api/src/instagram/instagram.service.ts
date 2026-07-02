import { Injectable, Logger } from '@nestjs/common';

export interface IgPost {
  caption: string;
  hashtags: string[];
  likes?: number;
  comments?: number;
  type?: string;
  url?: string;
}

export interface IgProfile {
  username: string;
  fullName?: string;
  biography?: string;
  followers?: number;
  posts: IgPost[];
}

/**
 * Pengambil data publik Instagram via Apify (provider scraping).
 * - Set APIFY_TOKEN untuk mengaktifkan; tanpa token fitur nonaktif dan
 *   pemanggil harus memakai contoh caption manual (samples).
 * - Actor default: apify~instagram-profile-scraper (bisa diganti via
 *   APIFY_IG_ACTOR). Normalizer di bawah toleran terhadap dua bentuk
 *   output umum (profile + latestPosts, atau daftar post langsung).
 * - Hanya data PUBLIK; hormati ToS platform (lihat PRD §14).
 */
@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly token = process.env.APIFY_TOKEN;
  private readonly actor =
    process.env.APIFY_IG_ACTOR ?? 'apify~instagram-profile-scraper';
  private readonly limit = Number(process.env.IG_POSTS_LIMIT ?? 12);

  get enabled(): boolean {
    return Boolean(this.token);
  }

  async fetchProfile(handle: string): Promise<IgProfile> {
    if (!this.token) {
      throw new Error(
        'APIFY_TOKEN belum diset — scraping IG nonaktif. Alternatif: kirim contoh caption manual (samples).',
      );
    }
    const username = handle.replace(/^@/, '').trim();
    const url = `https://api.apify.com/v2/acts/${this.actor}/run-sync-get-dataset-items?token=${encodeURIComponent(this.token)}`;

    // Input mencakup dua gaya actor sekaligus; field yang tidak dikenal diabaikan actor.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        usernames: [username],
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: 'posts',
        resultsLimit: this.limit,
      }),
    });
    if (!res.ok) {
      throw new Error(
        `Apify ${res.status}: ${(await res.text()).slice(0, 300)}`,
      );
    }

    const items = (await res.json()) as unknown[];
    const profile = normalizeIgItems(items, username, this.limit);
    if (!profile.posts.length) {
      throw new Error(
        `Tidak ada post publik yang terambil untuk @${username}. Cek ejaan handle & pastikan akunnya publik.`,
      );
    }
    this.logger.log(`IG @${username}: ${profile.posts.length} post terambil.`);
    return profile;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeIgItems(
  items: unknown[],
  username: string,
  limit: number,
): IgProfile {
  const profile: IgProfile = { username, posts: [] };
  for (const raw of items ?? []) {
    const it = raw as any;
    if (!it || typeof it !== 'object') continue;
    if (Array.isArray(it.latestPosts)) {
      // bentuk instagram-profile-scraper: objek profil + latestPosts
      profile.fullName = it.fullName ?? profile.fullName;
      profile.biography = it.biography ?? profile.biography;
      profile.followers = it.followersCount ?? profile.followers;
      for (const p of it.latestPosts) profile.posts.push(normalizePost(p));
    } else if (it.caption != null || it.type != null || it.shortCode != null) {
      // bentuk instagram-scraper: daftar post langsung
      profile.posts.push(normalizePost(it));
    }
  }
  profile.posts = profile.posts
    .filter((p) => p.caption && p.caption.trim())
    .slice(0, limit);
  return profile;
}

function normalizePost(p: any): IgPost {
  return {
    caption: typeof p?.caption === 'string' ? p.caption : '',
    hashtags: Array.isArray(p?.hashtags) ? p.hashtags : [],
    likes: p?.likesCount ?? p?.likes,
    comments: p?.commentsCount ?? p?.comments,
    type: p?.type,
    url: p?.url,
  };
}

/** Ubah profil IG jadi blok teks untuk prompt analisis voice. */
export function formatIgProfile(p: IgProfile): string {
  const lines: string[] = [`KONTEN INSTAGRAM @${p.username}:`];
  if (p.fullName) lines.push(`Nama: ${p.fullName}`);
  if (p.biography) lines.push(`Bio: ${p.biography}`);
  if (p.followers != null) lines.push(`Followers: ${p.followers}`);
  p.posts.forEach((post, i) => {
    const eng = [
      post.likes != null ? `${post.likes} likes` : null,
      post.comments != null ? `${post.comments} komentar` : null,
    ]
      .filter(Boolean)
      .join(', ');
    lines.push(
      `\nPost ${i + 1}${eng ? ` [${eng}]` : ''}:\n${post.caption.trim()}`,
    );
  });
  return lines.join('\n');
}
