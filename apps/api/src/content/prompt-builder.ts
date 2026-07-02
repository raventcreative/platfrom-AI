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
    for (const [key, val] of Object.entries(b.profile)) push(key, val);
  }

  return lines.join('\n');
}

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

export function agentToOutputType(agent: JobAgent): OutputType {
  return AGENT_TO_TYPE[agent] ?? 'ideas';
}

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

/** Perintah "training": pelajari brand / analisis akun IG → BrandVoice agent. */
const VOICE_PATTERN =
  /(brand ?voice|pelajari brand|belajar (dari )?(ig|instagram)|analisis (ig|instagram|akun)|training brand|latih (ai|brand))/i;

export function detectAgent(text: string): JobAgent {
  if (VOICE_PATTERN.test(text)) return 'BRANDVOICE';
  return outputTypeToAgent(detectOutputType(text));
}

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
