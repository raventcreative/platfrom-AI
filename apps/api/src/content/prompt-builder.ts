import { BrandCategory, JobAgent } from '@prisma/client';
import { complianceFocus } from './compliance';
import { BrandContextInput, OutputType } from './content.types';
import { GENERATORS } from './generators';
import { KNOWLEDGE_PLAYBOOK } from './playbook';

const PERSONA =
  'Kamu adalah Content Strategist & Copywriter senior untuk sebuah agency konten di Indonesia. Tugasmu: bikin konten media sosial harian yang nempel banget sama karakter brand klien di bawah, dengan kualitas tinggi & aman secara aturan.';

const ATURAN_MAIN =
  'ATURAN MAIN: pakai Bahasa Indonesia sesuai voice & tone brand; pakai sapaan brand; wajib pakai signature phrases kalau ada; HARAM pakai kata terlarang brand; selalu bicara ke target audience (sentuh pain point); tutup dengan CTA brand kecuali daily input minta lain.';

const SELF_CHECK =
  'SEBELUM FINAL, lakukan SELF-CHECK cepat: (1) hook nampol di 3 detik? (2) ada tepat 1 CTA jelas? (3) skincare: nggak ada klaim terlarang/superlatif, hasil dibingkai "tampak/membantu"? (4) sesuai voice & kata terlarang brand? (5) nggak ngarang angka? Kalau ada yang gagal, perbaiki dulu baru keluarkan.';

/** Susun "Label: nilai" dari data brand yang tersedia. */
export function buildBrandProfile(b: BrandContextInput): string {
  const lines: string[] = [];
  const push = (label: string, val?: unknown) => {
    if (val == null) return;
    const text = Array.isArray(val)
      ? val.join(', ')
      : typeof val === 'object'
        ? JSON.stringify(val)
        : String(val);
    if (text.trim()) lines.push(`${label}: ${text}`);
  };

  push('Nama brand', b.name);
  push('Kategori/niche', b.niche);
  push('Deskripsi', b.description);
  push('Platform', b.platforms);

  if (b.voice) {
    push('Voice & tone', b.voice.styleSummary);
    push('Atribut tone', b.voice.toneAttributes);
    push('Kata yang disukai (signature)', b.voice.preferredWords);
    push('Kata TERLARANG', b.voice.avoidWords);
  }
  if (b.kit) {
    push('Warna brand', b.kit.colors);
    push('Font', b.kit.fonts);
    push('Panduan visual', b.kit.guidelines);
  }
  if (b.profile && typeof b.profile === 'object') {
    for (const [key, val] of Object.entries(b.profile)) {
      // Daftar SKU (array objek) dirender khusus agar rapi, bukan JSON mentah.
      if (key === 'skus') {
        push('Produk / SKU', formatSkus(val));
        continue;
      }
      // Gambar referensi = base64 besar → JANGAN dump ke prompt teks, cukup catat.
      if (key === 'reference_image') {
        push('Gambar referensi', 'tersedia (dipakai sebagai acuan visual saat generate gambar)');
        continue;
      }
      push(INTAKE_LABELS[key] ?? key, val);
    }
  }

  return lines.join('\n');
}

/** Format array SKU jadi satu baris ringkas: "Nama [Kategori] — harga: catatan | …". */
function formatSkus(val: unknown): string {
  if (!Array.isArray(val)) return '';
  return val
    .map((s) => {
      if (!s || typeof s !== 'object') return '';
      const sku = s as {
        name?: string;
        category?: string;
        price?: string;
        notes?: string;
      };
      if (!sku.name?.trim()) return '';
      let line = sku.name.trim();
      if (sku.category?.trim()) line += ` [${sku.category.trim()}]`;
      if (sku.price?.trim()) line += ` — ${sku.price.trim()}`;
      if (sku.notes?.trim()) line += `: ${sku.notes.trim()}`;
      return line;
    })
    .filter(Boolean)
    .join(' | ');
}

/** Label rapi untuk field intake yang disimpan di Brand.profile (JSON). */
export const INTAKE_LABELS: Record<string, string> = {
  area: 'Area / pasar',
  ig_handle: 'Username Instagram',
  social: 'Akun sosial lain',
  brand_colors: 'Palet warna brand',
  visual_style: 'Gaya visual',
  guidelines: 'BRAND GUIDELINE (patuhi)',
  products: 'Produk/jasa unggulan',
  price: 'Range harga',
  problem: 'Masalah pelanggan yang diselesaikan',
  usp: 'USP / pembeda utama',
  proof: 'Bukti/keunggulan konkret',
  buyer: 'Pembeli utama',
  painpoint: 'Pain point / kekhawatiran',
  desire: 'Keinginan / aspirasi',
  tone: 'Nada brand',
  sapaan: 'Sapaan ke audiens',
  signature: 'Frasa signature (wajib dipakai)',
  forbidden: 'Frasa / kata TERLARANG',
  emoji: 'Penggunaan emoji',
  goal: 'Tujuan utama konten',
  cta: 'CTA / aksi yang diinginkan',
  promo: 'Promo yang sedang jalan',
  forbiddenClaims: 'Klaim yang TIDAK BOLEH dipakai',
  certifications: 'Sertifikasi yang boleh disebut',
  sk_ingredients: 'Kandungan unggulan & manfaat',
  sk_bpom: 'Status izin / no. BPOM',
  fb_menu: 'Menu andalan + harga',
  fb_channels: 'Channel order',
  fb_location: 'Lokasi/cabang + jam',
  fb_halal: 'Status halal / alergen',
};

/** System prompt = persona + profil + playbook + compliance + self-check (Handbook §5). */
export function buildSystemPrompt(
  brandProfileText: string,
  category: BrandCategory,
): string {
  return [
    PERSONA,
    '',
    '================ PROFIL BRAND ================',
    brandProfileText,
    '=============================================',
    '',
    KNOWLEDGE_PLAYBOOK,
    '',
    ATURAN_MAIN,
    '',
    complianceFocus(category),
    '',
    'OUTPUT: ikuti format yang diminta (versi enak-dibaca + blok JSON valid).',
    '',
    SELF_CHECK,
  ].join('\n');
}

/** Bungkus perintah user bebas-teks jadi blok DAILY INPUT. */
export function buildDailyInput(content: string): string {
  return `DAILY INPUT:\n${content.trim()}`;
}

/** User prompt = instruksi generator + daily input. */
export function buildUserPrompt(type: OutputType, content: string): string {
  return GENERATORS[type].instruction.replace(
    '{{DAILY_INPUT}}',
    buildDailyInput(content),
  );
}

const AGENT_TO_TYPE: Partial<Record<JobAgent, OutputType>> = {
  SCRIPT: 'script',
  CAROUSEL: 'carousel',
  STORYBOARD: 'storyboard',
  CAPTION: 'caption',
  IDEAS: 'ideas',
};

// Map enum Job.agent (DB) → jenis output internal.
export function agentToOutputType(agent: JobAgent): OutputType {
  return AGENT_TO_TYPE[agent] ?? 'ideas';
}

// Kebalikannya: jenis output internal → enum Job.agent.
export function outputTypeToAgent(type: OutputType): JobAgent {
  return GENERATORS[type].agent;
}

/** Deteksi jenis output dari perintah natural di chat. */
export function detectOutputType(text: string): OutputType {
  const t = text.toLowerCase();
  if (/(carousel|korsel|slide)/.test(t)) return 'carousel';
  if (/(storyboard|shot ?list|shotlist)/.test(t)) return 'storyboard';
  if (/(caption|takarir)/.test(t)) return 'caption';
  if (/(ide konten|content idea|ide minggu|7 ide|kalender konten|ide-ide)/.test(t))
    return 'ideas';
  if (/(script|naskah|reels?|tiktok|video|voice ?over)/.test(t)) return 'script';
  return 'script';
}

// Deteksi Job.agent langsung dari perintah natural di chat.
/** Perintah "training": pelajari brand / analisis akun IG → BrandVoice agent. */
const VOICE_PATTERN =
  /(brand ?voice|pelajari brand|belajar (dari )?(ig|instagram)|analisis (ig|instagram|akun)|training brand|latih (ai|brand))/i;

export function detectAgent(text: string): JobAgent {
  if (VOICE_PATTERN.test(text)) return 'BRANDVOICE';
  return outputTypeToAgent(detectOutputType(text));
}

// Label ramah-manusia untuk sebuah agent (dipakai di UI/log).
export function generatorLabel(agent: JobAgent): string {
  if (agent === 'BRANDVOICE') return 'analisis brand voice';
  return GENERATORS[agentToOutputType(agent)].label;
}

/**
 * Pisahkan output LLM jadi bagian enak-dibaca + objek JSON (dari pagar ```json).
 * Kalau tak ada blok JSON valid, `json` = null dan `readable` = teks penuh.
 */
export function splitGeneratorOutput(text: string): {
  readable: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
} {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (!fence) return { readable: text.trim(), json: null };

  let json: unknown = null;
  try {
    json = JSON.parse(fence[1].trim());
  } catch {
    json = null;
  }
  const before = text.slice(0, fence.index).trim();
  return { readable: before || text.trim(), json };
}
