import { Injectable, Logger } from '@nestjs/common';

export interface LlmResult {
  text: string;
  model: string;
  tokensUsed: number;
  demo: boolean;
}

export interface ImageResult {
  dataUrl?: string; // "data:image/png;base64,..." (kosong bila demo/tanpa key)
  model: string;
  size: string;
  demo: boolean;
}

type Provider = 'anthropic' | 'openai';
type Aspect = 'square' | 'portrait' | 'landscape';

// Ukuran gambar per-model (OpenAI Images) menurut aspek yang diminta.
const IMAGE_SIZES: Record<string, Record<Aspect, string>> = {
  'dall-e-3': { square: '1024x1024', portrait: '1024x1792', landscape: '1792x1024' },
  'gpt-image-1': { square: '1024x1024', portrait: '1024x1536', landscape: '1536x1024' },
};

/**
 * Pemanggil LLM Content Engine. Mendukung dua provider:
 *   - Anthropic (Claude) via Messages API
 *   - OpenAI (ChatGPT) via Chat Completions API
 * Provider dipilih lewat env LLM_PROVIDER, atau otomatis dari API key yang ada.
 * Tanpa API key → fallback "mode demo" (output statis) supaya alur tetap jalan
 * saat dev. Sumber pola: Content Engine Handbook §11.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  private readonly anthropicKey = process.env.ANTHROPIC_API_KEY;
  private readonly anthropicModel =
    process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

  private readonly openaiKey = process.env.OPENAI_API_KEY;
  private readonly openaiModel = process.env.OPENAI_MODEL ?? 'gpt-4o';

  private readonly maxTokens = Number(
    process.env.LLM_MAX_TOKENS ?? process.env.ANTHROPIC_MAX_TOKENS ?? 2000,
  );

  /** Provider aktif: paksa via LLM_PROVIDER, atau auto dari key yang tersedia. */
  private readonly provider: Provider = resolveProvider(
    process.env.LLM_PROVIDER,
    Boolean(this.anthropicKey),
    Boolean(this.openaiKey),
  );

  get enabled(): boolean {
    return Boolean(this.keyFor(this.provider));
  }

  /** Daftar provider yang punya API key (untuk dropdown di UI, dsb). */
  get availableProviders(): Provider[] {
    return (['anthropic', 'openai'] as Provider[]).filter((p) =>
      Boolean(this.keyFor(p)),
    );
  }

  private keyFor(p: Provider): string | undefined {
    return p === 'openai' ? this.openaiKey : this.anthropicKey;
  }

  /**
   * Generate untuk satu request.
   * - `opts.provider` memaksa provider (mis. pilihan dari UI).
   * - `opts.apiKey` = "bring your own key" dari UI; dipakai hanya untuk request
   *   ini dan TIDAK disimpan. Bila kosong → fallback ke key dari env.
   * - `opts.model` menimpa model default provider (opsional).
   */
  async complete(
    system: string,
    user: string,
    opts?: {
      provider?: string;
      apiKey?: string;
      model?: string;
      maxTokens?: number;
    },
  ): Promise<LlmResult> {
    const provider = normalizeProvider(opts?.provider) ?? this.provider;
    const key = opts?.apiKey?.trim() || this.keyFor(provider);
    const model = opts?.model?.trim() || this.defaultModel(provider);
    const maxTokens = opts?.maxTokens || this.maxTokens;

    if (!key) {
      this.logger.warn(
        `API key untuk provider "${provider}" tidak diset — memakai mode demo.`,
      );
      return { text: demoOutput(user, provider), model: 'demo', tokensUsed: 0, demo: true };
    }

    return provider === 'openai'
      ? this.completeOpenai(key, model, system, user, maxTokens)
      : this.completeAnthropic(key, model, system, user, maxTokens);
  }

  private defaultModel(p: Provider): string {
    return p === 'openai' ? this.openaiModel : this.anthropicModel;
  }

  /**
   * Generate GAMBAR via OpenAI Images API (hanya OpenAI yang punya image gen).
   * - `apiKey` = BYO key dari UI (key OpenAI); kosong → fallback ke env; tetap
   *   kosong → mode demo (tanpa gambar, hanya prompt yang dikembalikan caller).
   * - Mengembalikan data URL base64 supaya bisa langsung ditampilkan & diunduh.
   */
  async generateImage(
    prompt: string,
    opts?: {
      apiKey?: string;
      model?: string;
      aspect?: Aspect;
      referenceImage?: string; // data URL — acuan visual (image-to-image via /edits)
    },
  ): Promise<ImageResult> {
    const key = opts?.apiKey?.trim() || this.openaiKey;
    const model =
      opts?.model?.trim() || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
    const aspect = opts?.aspect ?? 'square';
    const size = (IMAGE_SIZES[model] ?? IMAGE_SIZES['gpt-image-1'])[aspect];

    if (!key) {
      this.logger.warn('OPENAI_API_KEY tidak diset — gambar mode demo (prompt saja).');
      return { model: 'demo', size, demo: true };
    }

    const base = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    const ref = opts?.referenceImage ? dataUrlToBlob(opts.referenceImage) : null;

    let res: Response;
    if (ref) {
      // Ada gambar referensi → endpoint /edits (image-to-image) sebagai acuan visual.
      const form = new FormData();
      form.append('model', model);
      form.append('prompt', prompt);
      form.append('size', size);
      form.append('image', ref.blob, ref.filename);
      res = await fetch(`${base}/images/edits`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}` }, // biarkan FormData set content-type
        body: form,
      });
    } else {
      // Catatan: JANGAN kirim response_format — API Images terbaru menolaknya.
      // gpt-image-1 selalu balikan b64; dall-e-3 balikan URL → dikonversi ke b64.
      res = await fetch(`${base}/images/generations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, prompt, size, n: 1 }),
      });
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI Images ${res.status}: ${t.slice(0, 400)}`);
    }

    const data = (await res.json()) as {
      model?: string;
      data?: { b64_json?: string; url?: string }[];
    };
    const first = data.data?.[0];
    let dataUrl: string | undefined;
    if (first?.b64_json) {
      dataUrl = `data:image/png;base64,${first.b64_json}`;
    } else if (first?.url) {
      // Ambil gambar dari URL sementara OpenAI → ubah ke data URL base64 mandiri
      // (supaya bisa langsung tampil & diunduh, tidak kedaluwarsa).
      const imgRes = await fetch(first.url);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    }

    return { dataUrl, model: data.model ?? model, size, demo: false };
  }

  private async completeAnthropic(
    key: string,
    model: string,
    system: string,
    user: string,
    maxTokens: number,
  ): Promise<LlmResult> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      model?: string;
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const text = (data.content ?? [])
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text)
      .join('\n')
      .trim();

    const tokensUsed =
      (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    return { text, model: data.model ?? model, tokensUsed, demo: false };
  }

  private async completeOpenai(
    key: string,
    model: string,
    system: string,
    user: string,
    maxTokens: number,
  ): Promise<LlmResult> {
    const base =
      process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI API ${res.status}: ${body.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };

    const text = (data.choices ?? [])
      .map((c) => c.message?.content ?? '')
      .join('\n')
      .trim();

    const tokensUsed = data.usage?.total_tokens ?? 0;

    return { text, model: data.model ?? model, tokensUsed, demo: false };
  }
}

/** Ubah data URL base64 → Blob + nama file (untuk multipart /images/edits). */
function dataUrlToBlob(dataUrl: string): { blob: Blob; filename: string } | null {
  const m = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s);
  if (!m) return null;
  const mime = m[1];
  const buf = Buffer.from(m[2], 'base64');
  const ext = mime.split('/')[1] || 'png';
  return { blob: new Blob([buf], { type: mime }), filename: `reference.${ext}` };
}

/** Map alias bebas ("chatgpt", "claude", dst) ke Provider; null bila tak dikenal. */
function normalizeProvider(value: string | undefined): Provider | null {
  const v = value?.trim().toLowerCase();
  if (v === 'openai' || v === 'chatgpt' || v === 'gpt') return 'openai';
  if (v === 'anthropic' || v === 'claude') return 'anthropic';
  return null;
}

/** Tentukan provider default: hormati LLM_PROVIDER, jika tidak pilih dari key. */
function resolveProvider(
  forced: string | undefined,
  hasAnthropic: boolean,
  hasOpenai: boolean,
): Provider {
  const normalized = normalizeProvider(forced);
  if (normalized) return normalized;
  // Auto: dahulukan Anthropic, lalu OpenAI bila hanya itu yang tersedia.
  if (!hasAnthropic && hasOpenai) return 'openai';
  return 'anthropic';
}

/** Output contoh saat tidak ada API key — bentuknya menyerupai hasil generator. */
function demoOutput(user: string, provider: Provider): string {
  const envHint =
    provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
  const firstLine = user.split('\n').find((l) => l.trim()) ?? 'Generate konten';
  return [
    `⚙️ MODE DEMO (${envHint} belum diset)`,
    '',
    `Permintaan: ${firstLine}`,
    '',
    'Ini placeholder terstruktur supaya alur end-to-end bisa diuji tanpa API key.',
    `Set ${envHint} di apps/api/.env untuk hasil sungguhan.`,
    '',
    '```json',
    JSON.stringify(
      {
        type: 'demo',
        note: `Output contoh. Isi ${envHint} untuk generate sungguhan.`,
        hooks: ['Hook contoh 1', 'Hook contoh 2'],
        cta: 'checkout link bio',
      },
      null,
      2,
    ),
    '```',
  ].join('\n');
}
