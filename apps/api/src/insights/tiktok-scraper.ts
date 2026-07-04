/**
 * Scraper profil publik TikTok TANPA login/API berbayar (best-effort).
 * Mengambil HTML halaman profil lalu membaca blok JSON __UNIVERSAL_DATA_FOR_REHYDRATION__
 * (scope webapp.user-detail) → followers, total likes (hearts), jumlah video.
 *
 * Kejujuran soal batasan:
 * - Angka PER-VIDEO (views/likes/komentar tiap video) TIDAK ada di HTML profil.
 *   Butuh endpoint item_list bertandatangan (msToken/X-Bogus) atau provider data
 *   (mis. Apify) — set lewat TiktokService kalau perlu. Di sini hanya AGREGAT publik.
 * - Reach/impressions tidak pernah tersedia untuk akun orang lain.
 */

export type TiktokProfile = {
  username: string;
  nickname: string;
  signature: string;
  followers: number | null;
  hearts: number | null; // total likes semua video
  videoCount: number | null;
  following: number | null;
  verified: boolean;
};

/** Parse blok JSON __UNIVERSAL_DATA_FOR_REHYDRATION__ jadi profil (pure, mudah diuji). */
export function parseTiktokUniversalData(
  json: unknown,
  username: string,
): TiktokProfile {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data = json as any;
  const scope = data?.__DEFAULT_SCOPE__ ?? {};
  const ud = scope['webapp.user-detail']?.userInfo ?? {};
  const stats = ud.stats ?? ud.statsV2 ?? {};
  const user = ud.user ?? {};
  const num = (v: any): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    username: (user.uniqueId ?? username).replace(/^@/, ''),
    nickname: user.nickname ?? '',
    signature: user.signature ?? '',
    followers: num(stats.followerCount),
    hearts: num(stats.heartCount ?? stats.heart),
    videoCount: num(stats.videoCount),
    following: num(stats.followingCount),
    verified: Boolean(user.verified),
  };
}

/** Ambil HTML profil TikTok dan ekstrak agregat publik. */
export async function scrapeTiktokProfile(
  handle: string,
): Promise<TiktokProfile> {
  const username = handle.replace(/^@/, '').trim().toLowerCase();
  if (!username) throw new Error('Handle TikTok kosong.');

  let res: Response;
  try {
    res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(username)}`, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
  } catch (e) {
    throw new Error(`Gagal menghubungi TikTok: ${String(e).slice(0, 120)}`);
  }
  if (res.status === 404) throw new Error(`Akun @${username} tidak ditemukan.`);
  if (!res.ok)
    throw new Error(
      `TikTok membalas ${res.status} — kemungkinan rate-limit/diblok sementara. Coba lagi 1-2 menit.`,
    );

  const html = await res.text();
  const m = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m) throw new Error('Data TikTok tidak ditemukan (kemungkinan login wall / halaman berubah).');
  let json: unknown;
  try {
    json = JSON.parse(m[1]);
  } catch {
    throw new Error('Respons TikTok tidak bisa dibaca.');
  }
  const profile = parseTiktokUniversalData(json, username);
  if (profile.followers == null && profile.videoCount == null)
    throw new Error(`Akun @${username} tidak ditemukan atau tidak publik.`);
  return profile;
}
