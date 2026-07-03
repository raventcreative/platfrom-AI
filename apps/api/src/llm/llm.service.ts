import { Injectable, Logger } from '@nestjs/common';

export interface LlmResult {
  text: string;
  model: string;
  tokensUsed: number;
  demo: boolean;
}

export type Provider = 'anthropic' | 'openai';

/** Opsi per-request: provider/model pilihan UI + BYO API key (tidak disimpan). */
export interface LlmOpts {
  provider?: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Pemanggil LLM Content Engine — dua provider:
 *   - Anthropic (Claude) via Messages API
 *   - OpenAI (ChatGPT) via Chat Completions API
 * Key bisa dari env ATAU dikirim per-request dari UI (BYO key; dipakai sekali,
 * TIDAK pernah disimpan). Tanpa key sama sekali → "mode demo" (output statis)
 * supaya alur tetap bisa dicoba. Mendukung non-stream (complete) dan
 * STREAMING (stream) untuk hasil yang terasa instan di UI.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  // Env dibaca LAZY (getter, bukan field) supaya tidak tergantung urutan
  // inisialisasi ConfigModule/dotenv saat provider dibangun.
  private get anthropicKey() {
    return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
  }
  private get anthropicModel() {
    return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
  }
  private get openaiKey() {
    return process.env.OPENAI_API_KEY?.trim() || undefined;
  }
  private get openaiModel() {
    return process.env.OPENAI_MODEL ?? 'gpt-4o';
  }
  private get maxTokens() {
    return Number(
      process.env.LLM_MAX_TOKENS ?? process.env.ANTHROPIC_MAX_TOKENS ?? 2600,
    );
  }

  get enabled(): boolean {
    return Boolean(this.anthropicKey || this.openaiKey);
  }

  /** Provider default: hormati LLM_PROVIDER, kalau tidak pilih dari key yang ada. */
  private defaultProvider(): Provider {
    const forced = normalizeProvider(process.env.LLM_PROVIDER);
    if (forced) return forced;
    if (!this.anthropicKey && this.openaiKey) return 'openai';
    return 'anthropic';
  }

  /** Resolusi provider+key+model untuk satu request (BYO key menang atas env). */
  private resolve(opts?: LlmOpts): {
    provider: Provider;
    key?: string;
    model: string;
    maxTokens: number;
  } {
    const provider = normalizeProvider(opts?.provider) ?? this.defaultProvider();
    const envKey = provider === 'openai' ? this.openaiKey : this.anthropicKey;
    const key = opts?.apiKey?.trim() || envKey;
    const model =
      opts?.model?.trim() ||
      (provider === 'openai' ? this.openaiModel : this.anthropicModel);
    return { provider, key, model, maxTokens: opts?.maxTokens || this.maxTokens };
  }

  /** Generate non-stream. Kompatibel dengan pemanggil lama (2 argumen). */
  async complete(system: string, user: string, opts?: LlmOpts): Promise<LlmResult> {
    const { provider, key, model, maxTokens } = this.resolve(opts);
    if (!key) {
      this.logger.warn(`Tidak ada API key (${provider}) — mode demo.`);
      return { text: demoOutput(user), model: 'demo', tokensUsed: 0, demo: true };
    }
    return provider === 'openai'
      ? this.completeOpenai(key, model, system, user, maxTokens)
      : this.completeAnthropic(key, model, system, user, maxTokens);
  }

  /**
   * Generate STREAMING: async generator yang meng-yield potongan teks begitu
   * diterima dari provider. Dipakai endpoint SSE supaya user melihat hasil
   * mengalir real-time (terasa jauh lebih cepat daripada menunggu penuh).
   */
  async *stream(
    system: string,
    user: string,
    opts?: LlmOpts,
  ): AsyncGenerator<string, { model: string; demo: boolean }, void> {
    const { provider, key, model, maxTokens } = this.resolve(opts);
    if (!key) {
      // Mode demo: alirkan output contoh per-baris agar UX streaming tetap terasa.
      for (const line of demoOutput(user).split('\n')) yield line + '\n';
      return { model: 'demo', demo: true };
    }
    if (provider === 'openai') {
      yield* this.streamOpenai(key, model, system, user, maxTokens);
    } else {
      yield* this.streamAnthropic(key, model, system, user, maxTokens);
    }
    return { model, demo: false };
  }

  // ── Anthropic ──────────────────────────────────────────────────

  private async completeAnthropic(
    key: string,
    model: string,
    system: string,
    user: string,
    maxTokens: number,
  ): Promise<LlmResult> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: anthropicHeaders(key),
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw await apiError('Anthropic', res);

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

  private async *streamAnthropic(
    key: string,
    model: string,
    system: string,
    user: string,
    maxTokens: number,
  ): AsyncGenerator<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: anthropicHeaders(key),
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        stream: true,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok || !res.body) throw await apiError('Anthropic', res);

    // Format SSE Anthropic: event content_block_delta → delta.text
    for await (const data of sseData(res.body)) {
      try {
        const j = JSON.parse(data);
        const t = j?.delta?.text;
        if (typeof t === 'string' && t) yield t;
      } catch {
        /* abaikan baris non-JSON */
      }
    }
  }

  // ── OpenAI ─────────────────────────────────────────────────────

  private async completeOpenai(
    key: string,
    model: string,
    system: string,
    user: string,
    maxTokens: number,
  ): Promise<LlmResult> {
    const base = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw await apiError('OpenAI', res);

    const data = (await res.json()) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const text = (data.choices ?? [])
      .map((c) => c.message?.content ?? '')
      .join('\n')
      .trim();
    return {
      text,
      model: data.model ?? model,
      tokensUsed: data.usage?.total_tokens ?? 0,
      demo: false,
    };
  }

  private async *streamOpenai(
    key: string,
    model: string,
    system: string,
    user: string,
    maxTokens: number,
  ): AsyncGenerator<string> {
    const base = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok || !res.body) throw await apiError('OpenAI', res);

    // Format SSE OpenAI: data: {...choices[0].delta.content...} | data: [DONE]
    for await (const data of sseData(res.body)) {
      if (data === '[DONE]') return;
      try {
        const j = JSON.parse(data);
        const t = j?.choices?.[0]?.delta?.content;
        if (typeof t === 'string' && t) yield t;
      } catch {
        /* abaikan baris non-JSON */
      }
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function anthropicHeaders(key: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
  };
}

async function apiError(name: string, res: Response): Promise<Error> {
  const body = await res.text().catch(() => '');
  // Pesan singkat & bisa dibaca user di UI (mis. key salah / limit habis).
  const hint =
    res.status === 401
      ? 'API key salah/tidak aktif.'
      : res.status === 429
        ? 'Rate limit / kuota habis.'
        : '';
  return new Error(`${name} ${res.status}: ${hint} ${body.slice(0, 300)}`.trim());
}

/** Parse aliran SSE: yield isi tiap baris "data: ...". */
async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trimEnd();
        buf = buf.slice(idx + 1);
        if (line.startsWith('data:')) yield line.slice(5).trim();
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Map alias bebas ("chatgpt", "claude", dst) ke Provider; null bila tak dikenal. */
function normalizeProvider(value: string | undefined): Provider | null {
  const v = value?.trim().toLowerCase();
  if (v === 'openai' || v === 'chatgpt' || v === 'gpt') return 'openai';
  if (v === 'anthropic' || v === 'claude') return 'anthropic';
  return null;
}

/** Output contoh saat tidak ada API key — menyerupai hasil generator. */
function demoOutput(user: string): string {
  const firstLine = user.split('\n').find((l) => l.trim()) ?? 'Generate konten';
  return [
    '⚙️ MODE DEMO — belum ada API key.',
    '',
    `Permintaan: ${firstLine.slice(0, 120)}`,
    '',
    'Ini contoh output supaya alurnya bisa dicoba. Buka **Pengaturan** (ikon ⚙️),',
    'tempel API key OpenAI atau Claude milikmu, lalu generate ulang untuk hasil sungguhan.',
    '',
    '```json',
    JSON.stringify(
      { type: 'demo', note: 'Isi API key di Pengaturan untuk hasil sungguhan.' },
      null,
      2,
    ),
    '```',
  ].join('\n');
}
