// Pengaturan LLM disimpan di BROWSER ini saja (localStorage).
// API key dikirim per-request ke backend, dipakai sekali, tidak disimpan di server.

// Penyedia LLM yang didukung.
export type Provider = 'anthropic' | 'openai';

// Pengaturan LLM per-user: provider aktif, API key & model pilihan tiap provider.
export type LlmSettings = {
  provider: Provider;
  keys: Record<Provider, string>;
  models: Record<Provider, string>;
};

// Model default per provider bila user belum memilih.
export const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
};

// Opsi model yang bisa dipilih di UI (value = id model, label = teks tampilan).
export const MODEL_OPTIONS: Record<Provider, { value: string; label: string }[]> = {
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6 (hemat & cepat)' },
    { value: 'claude-opus-4-8', label: 'claude-opus-4-8 (kualitas tertinggi)' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'gpt-4o (seimbang)' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini (hemat & cepat)' },
  ],
};

// Label ramah untuk tiap provider.
export const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'ChatGPT (OpenAI)',
};

const KEY = 'ce_llm_settings'; // key localStorage untuk menyimpan pengaturan

// Nilai awal deterministik — dipakai untuk render pertama (server & client)
// agar tidak terjadi hydration mismatch. Setting asli dimuat di useEffect.
export const DEFAULT_SETTINGS: LlmSettings = {
  provider: 'anthropic',
  keys: { anthropic: '', openai: '' },
  models: { ...DEFAULT_MODEL },
};
const FALLBACK = DEFAULT_SETTINGS;

// Baca pengaturan dari localStorage; kembalikan FALLBACK bila kosong/gagal parse.
export function loadSettings(): LlmSettings {
  if (typeof window === 'undefined') return FALLBACK;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return FALLBACK;
    const p = JSON.parse(raw) as Partial<LlmSettings>;
    return {
      provider: p.provider ?? FALLBACK.provider,
      keys: { ...FALLBACK.keys, ...(p.keys ?? {}) },
      models: { ...FALLBACK.models, ...(p.models ?? {}) },
    };
  } catch {
    return FALLBACK;
  }
}

// Simpan pengaturan ke localStorage (no-op saat di server).
export function saveSettings(s: LlmSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}
