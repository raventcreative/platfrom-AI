// Konversi JSON terstruktur (IG Research & IG Insight) menjadi HTML rapi
// bertema markdown (.md), agar bisa diekspor PDF lewat downloadHtmlPdf.
// Output kartu di layar pakai styling gelap; untuk PDF kita bangun ulang
// dari data agar dapat tema terang yang bersih & mudah dicetak.

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}

// <ul> dari array string.
function ul(items?: string[]): string {
  if (!items?.length) return '';
  return `<ul>${items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>`;
}

// Judul bagian + isi bila ada.
function section(title: string, body: string): string {
  return body ? `<h2>${esc(title)}</h2>${body}` : '';
}
// Sub-judul (h3) + isi bila ada.
function sub(title: string, body: string): string {
  return body ? `<h3>${esc(title)}</h3>${body}` : '';
}

type Hook = { hook?: string; why_works?: string };
type FormatShare = { format?: string; share?: string };
type Play = { play?: string; rationale?: string };

// Daftar hook (kutipan + alasan).
function hookList(hooks?: Hook[]): string {
  if (!hooks?.length) return '';
  return `<ul>${hooks
    .map((h) => `<li><strong>“${esc(h.hook)}”</strong>${h.why_works ? ` — ${esc(h.why_works)}` : ''}</li>`)
    .join('')}</ul>`;
}
// Format mix jadi tabel.
function formatTable(fm?: FormatShare[]): string {
  if (!fm?.length) return '';
  return `<table><thead><tr><th>Format</th><th>Porsi</th></tr></thead><tbody>${fm
    .map((f) => `<tr><td>${esc(f.format)}</td><td>${esc(f.share)}</td></tr>`)
    .join('')}</tbody></table>`;
}
// Daftar play (aksi + rationale).
function playList(plays?: Play[]): string {
  if (!plays?.length) return '';
  return `<ul>${plays
    .map((p) => `<li><strong>${esc(p.play)}</strong>${p.rationale ? ` — ${esc(p.rationale)}` : ''}</li>`)
    .join('')}</ul>`;
}

type ResearchJson = {
  my_account?: {
    handle?: string;
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    content_pillars?: string[];
    recommendations?: string[];
  };
  competitors?: Array<{
    handle?: string;
    why?: string;
    positioning?: string;
    est_followers?: string;
    gap_to_exploit?: string;
  }>;
  competitor_research?: {
    winning_hooks?: Hook[];
    format_mix?: FormatShare[];
    content_pillars?: string[];
    posting_cadence?: string;
    engagement_drivers?: string[];
  };
  action_plan?: Play[];
};

// Bangun HTML lengkap untuk hasil IG Research (4 bagian).
export function researchToHtml(j: ResearchJson): string {
  const parts: string[] = [];

  const m = j.my_account;
  if (m) {
    const body = [
      m.handle ? `<p><strong>${esc(m.handle)}</strong></p>` : '',
      m.summary ? `<p>${esc(m.summary)}</p>` : '',
      sub('Kekuatan', ul(m.strengths)),
      sub('Kelemahan', ul(m.weaknesses)),
      sub('Peluang', ul(m.opportunities)),
      sub('Content pillars', ul(m.content_pillars)),
      sub('Rekomendasi', ul(m.recommendations)),
    ].join('');
    parts.push(section('1 · Review akun saya', body));
  }

  if (j.competitors?.length) {
    const body = `<ul>${j.competitors
      .map((c) => {
        const bits = [
          c.positioning ? esc(c.positioning) : '',
          c.why ? esc(c.why) : '',
          c.gap_to_exploit ? `Celah: ${esc(c.gap_to_exploit)}` : '',
        ].filter(Boolean);
        const head = `<strong>${esc(c.handle || '—')}</strong>${c.est_followers ? ` · ${esc(c.est_followers)}` : ''}`;
        return `<li>${head}${bits.length ? ` — ${bits.join(' · ')}` : ''}</li>`;
      })
      .join('')}</ul>`;
    parts.push(section('2 · Kompetitor ditemukan', body));
  }

  const cr = j.competitor_research;
  if (cr) {
    const body = [
      sub('Hook yang menang', hookList(cr.winning_hooks)),
      sub('Format mix', formatTable(cr.format_mix)),
      sub('Content pillars', ul(cr.content_pillars)),
      cr.posting_cadence ? sub('Pola posting', `<p>${esc(cr.posting_cadence)}</p>`) : '',
      sub('Pendorong engagement', ul(cr.engagement_drivers)),
    ].join('');
    parts.push(section('3 · Riset pola konten kompetitor', body));
  }

  if (j.action_plan?.length) {
    parts.push(section('4 · Rencana aksi untuk akunku', playList(j.action_plan)));
  }

  return parts.filter(Boolean).join('');
}

type InsightJson = {
  accounts?: Array<{
    handle?: string;
    niche_fit?: string;
    positioning?: string;
    est_followers?: string;
    note?: string;
  }>;
  content_pillars?: string[];
  top_hooks?: Hook[];
  format_mix?: FormatShare[];
  posting_cadence?: string;
  engagement_drivers?: string[];
  strengths?: string[];
  weaknesses?: string[];
  gaps_to_exploit?: string[];
  recommended_plays?: Play[];
};

// Bangun HTML lengkap untuk hasil IG Insight (kompetitor).
export function insightToHtml(j: InsightJson): string {
  const parts: string[] = [];

  if (j.accounts?.length) {
    const body = `<ul>${j.accounts
      .map((a) => {
        const head = `<strong>${esc(a.handle || '—')}</strong>${a.est_followers ? ` · ${esc(a.est_followers)} followers` : ''}`;
        const bits = [a.positioning, a.niche_fit, a.note].filter(Boolean).map((x) => esc(x));
        return `<li>${head}${bits.length ? ` — ${bits.join(' · ')}` : ''}</li>`;
      })
      .join('')}</ul>`;
    parts.push(section('Akun dianalisis', body));
  }

  parts.push(section('Content pillars', ul(j.content_pillars)));
  parts.push(section('Pola hook yang menang', hookList(j.top_hooks)));
  parts.push(section('Format mix', formatTable(j.format_mix)));
  if (j.posting_cadence) parts.push(section('Pola posting', `<p>${esc(j.posting_cadence)}</p>`));
  parts.push(section('Pendorong engagement', ul(j.engagement_drivers)));
  parts.push(section('Kekuatan', ul(j.strengths)));
  parts.push(section('Kelemahan', ul(j.weaknesses)));
  parts.push(section('Celah yang bisa direbut', ul(j.gaps_to_exploit)));
  parts.push(section('Rekomendasi langkah (plays)', playList(j.recommended_plays)));

  return parts.filter(Boolean).join('');
}
