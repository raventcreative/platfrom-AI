/**
 * Statistik engagement kompetitor — dihitung deterministik di kode (bukan AI),
 * dari data publik yang diambil scraper (IG/TikTok). Dipakai endpoint /ig & /tiktok
 * supaya frontend bisa langsung tampilkan total view, engagement rate, & konten viral.
 *
 * Catatan kejujuran: views hanya tersedia untuk konten video/Reels/TikTok yang memang
 * mengekspos angka itu secara publik. Reach/impressions TIDAK pernah tersedia untuk akun
 * orang lain (rahasia pemilik) — jadi tidak dihitung di sini.
 */

export interface EngPost {
  likes?: number | null;
  comments?: number | null;
  views?: number | null;
  caption?: string;
  type?: string;
}

export interface EngRow {
  i: number;
  likes: number;
  comments: number;
  views: number;
  eng: number;
  er: number; // engagement rate per-post (%) = (likes+comments)/followers*100
  viral: boolean; // engagement >= 2x median akun itu sendiri
  best: boolean;
}

export interface EngStats {
  n: number;
  followers: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgEng: number;
  erAvg: number; // engagement rate rata-rata (%)
  median: number;
  viralCount: number;
  rows: EngRow[];
}

/** Hitung statistik engagement dari daftar post + jumlah followers. */
export function engagementStats(followers: number, posts: EngPost[]): EngStats {
  const f = Math.max(0, Math.round(followers || 0));
  const clean = (posts || []).map((p) => ({
    likes: Math.max(0, Math.round(Number(p.likes) || 0)),
    comments: Math.max(0, Math.round(Number(p.comments) || 0)),
    views: Math.max(0, Math.round(Number(p.views) || 0)),
  }));
  const eng = clean.map((p) => p.likes + p.comments);
  const totalViews = clean.reduce((a, p) => a + p.views, 0);
  const totalLikes = clean.reduce((a, p) => a + p.likes, 0);
  const totalComments = clean.reduce((a, p) => a + p.comments, 0);
  const totalEng = eng.reduce((a, x) => a + x, 0);
  const avgEng = clean.length ? totalEng / clean.length : 0;
  const erAvg = f ? (avgEng / f) * 100 : 0;
  const sorted = [...eng].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0;
  const maxEng = eng.length ? Math.max(...eng) : 0;
  const rows: EngRow[] = clean.map((p, i) => ({
    i: i + 1,
    likes: p.likes,
    comments: p.comments,
    views: p.views,
    eng: eng[i],
    er: f ? Number(((eng[i] / f) * 100).toFixed(2)) : 0,
    viral: median > 0 && eng[i] >= median * 2,
    best: eng[i] === maxEng && maxEng > 0,
  }));
  return {
    n: clean.length,
    followers: f,
    totalViews,
    totalLikes,
    totalComments,
    avgEng: Number(avgEng.toFixed(1)),
    erAvg: Number(erAvg.toFixed(2)),
    median,
    viralCount: rows.filter((r) => r.viral).length,
    rows,
  };
}
