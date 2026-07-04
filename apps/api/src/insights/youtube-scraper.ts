/**
 * Scraper channel YouTube publik TANPA API key (best-effort).
 * Ambil halaman channel `/videos`, ekstrak blob `ytInitialData`, lalu telusuri
 * objeknya untuk: jumlah subscriber, jumlah video, dan daftar video terbaru
 * (judul + views). YouTube sering ganti layout → kami jalan pakai penelusuran
 * rekursif (cari key yang dikenal), bukan path tetap.
 *
 * Batasan jujur: LIKES & KOMENTAR per video TIDAK ada di halaman daftar channel
 * (butuh buka halaman watch tiap video / YouTube Data API). Jadi likes = null.
 */

export type YtVideo = {
  videoId: string;
  title: string;
  views: number | null;
  likes: number | null; // selalu null dari scrape daftar
  comments: number | null; // selalu null dari scrape daftar
};

export type YtChannel = {
  handle: string;
  title: string;
  subscribers: number | null;
  videoCount: number | null;
  videos: YtVideo[];
};

/** "1.2M", "1,2 jt", "890K", "12 rb", "1.234" → number. */
export function parseHumanCount(input: string | null | undefined): number | null {
  if (!input) return null;
  const s = String(input).toLowerCase().replace(/ /g, ' ');
  const m = s.match(/([\d.,]+)\s*(rb|ribu|jt|juta|m|k|b)?/i);
  if (!m) return null;
  const unit = m[2];
  let n: number;
  if (unit) {
    // Ada unit (K/M/jt/rb) → angka kecil berdesimal: "1.2M", "1,2 jt", "1.234,5 jt".
    let numStr = m[1];
    if (numStr.includes(',') && numStr.includes('.')) numStr = numStr.replace(/\./g, '').replace(',', '.');
    else if (numStr.includes(',')) numStr = numStr.replace(',', '.');
    n = parseFloat(numStr);
  } else {
    // Tanpa unit → hitungan bulat: pemisah ribuan (. atau ,) dibuang. "1.234"→1234, "1,234"→1234.
    n = parseInt(m[1].replace(/[.,]/g, ''), 10);
  }
  if (isNaN(n)) return null;
  const mult =
    unit === 'k' || unit === 'rb' || unit === 'ribu'
      ? 1e3
      : unit === 'm' || unit === 'jt' || unit === 'juta'
        ? 1e6
        : unit === 'b'
          ? 1e9
          : 1;
  return Math.round(n * mult);
}

function textOf(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.simpleText) return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map((r: any) => r.text || '').join('');
  return '';
}

/** Telusuri ytInitialData → kumpulkan subscriber, videoCount, dan video terbaru. */
export function parseYoutubeInitialData(data: any): Omit<YtChannel, 'handle'> {
  let subscribers: number | null = null;
  let videoCount: number | null = null;
  let title = '';
  const videos: YtVideo[] = [];
  const seen = new Set<string>();

  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;

    // subscriber count (berbagai layout)
    if (subscribers == null && node.subscriberCountText) {
      const t = textOf(node.subscriberCountText);
      const m = t.match(/([\d.,]+\s*(?:rb|ribu|jt|juta|m|k|b)?)\s*(subscriber|pelanggan)/i);
      subscribers = parseHumanCount(m ? m[1] : t);
    }
    // layout baru: "1,2 jt subscriber" bisa di metadataParts.text
    if (subscribers == null && typeof node.content === 'string' && /subscriber|pelanggan/i.test(node.content)) {
      subscribers = parseHumanCount(node.content);
    }
    // jumlah video: "1.234 video" (key beda-beda antar layout)
    if (videoCount == null && (node.videoCountText || node.videosCountText)) {
      videoCount = parseHumanCount(textOf(node.videoCountText || node.videosCountText));
    }
    // judul channel
    if (!title && node.channelMetadataRenderer && node.channelMetadataRenderer.title) {
      title = node.channelMetadataRenderer.title;
    }

    // video di daftar channel — layout LAMA (videoRenderer/gridVideoRenderer)
    const vr = node.videoRenderer || node.gridVideoRenderer;
    if (vr && vr.videoId && !seen.has(vr.videoId)) {
      seen.add(vr.videoId);
      const viewsTxt = textOf(vr.viewCountText); // "1,2 jt x ditonton" / "1.2M views"
      videos.push({
        videoId: vr.videoId,
        title: textOf(vr.title).slice(0, 200),
        views: parseHumanCount(viewsTxt),
        likes: null,
        comments: null,
      });
    }
    // layout BARU (2024+): lockupViewModel { contentId, metadata.lockupMetadataViewModel }
    const lm = node.lockupViewModel;
    if (lm && lm.contentId && !seen.has(lm.contentId)) {
      const md = lm.metadata && lm.metadata.lockupMetadataViewModel;
      const vtitle = (md && md.title && md.title.content) || '';
      let viewsTxt = '';
      const rows = (md && md.metadata && md.metadata.contentMetadataViewModel && md.metadata.contentMetadataViewModel.metadataRows) || [];
      for (const row of rows) {
        for (const part of row.metadataParts || []) {
          const t = (part && part.text && part.text.content) || '';
          if (/view|ditonton/i.test(t)) viewsTxt = t;
        }
      }
      if (viewsTxt || vtitle) {
        seen.add(lm.contentId);
        videos.push({
          videoId: lm.contentId,
          title: String(vtitle).slice(0, 200),
          views: parseHumanCount(viewsTxt),
          likes: null,
          comments: null,
        });
      }
    }

    for (const k in node) {
      const v = node[k];
      if (v && typeof v === 'object') walk(v);
    }
  };
  walk(data);
  return { title, subscribers, videoCount, videos: videos.slice(0, 24) };
}

/** Ekstrak JSON objek seimbang setelah penanda (mis. "ytInitialData = "). */
function extractJsonAfter(html: string, marker: string): any {
  const i = html.indexOf(marker);
  if (i < 0) return null;
  let start = html.indexOf('{', i);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = start; j < html.length; j++) {
    const ch = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, j + 1));
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
}

export async function scrapeYoutubeChannel(handle: string): Promise<YtChannel> {
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) throw new Error('Handle YouTube kosong.');
  const url = `https://www.youtube.com/@${encodeURIComponent(clean)}/videos?hl=en`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
  } catch (e) {
    throw new Error('Gagal menghubungi YouTube: ' + String(e).slice(0, 120));
  }
  if (res.status === 404) throw new Error(`Channel @${clean} tidak ditemukan.`);
  if (!res.ok) throw new Error(`YouTube membalas ${res.status} — coba lagi sebentar.`);
  const html = await res.text();
  const data = extractJsonAfter(html, 'ytInitialData');
  if (!data) throw new Error('Tidak bisa membaca data channel (layout YouTube berubah / login wall).');
  const parsed = parseYoutubeInitialData(data);
  return { handle: clean, ...parsed };
}
