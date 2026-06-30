import { Injectable, Logger } from '@nestjs/common';

export interface LlmResult {
  text: string;
  model: string;
  tokensUsed: number;
  demo: boolean;
}

/**
 * Pemanggil LLM Content Engine. Memanggil Anthropic Messages API via fetch.
 * Tanpa ANTHROPIC_API_KEY → fallback "mode demo" (output statis) supaya alur
 * tetap jalan saat dev. Sumber pola: Content Engine Handbook §11.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey = process.env.ANTHROPIC_API_KEY;
  private readonly model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
  private readonly maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS ?? 2000);

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(system: string, user: string): Promise<LlmResult> {
    if (!this.apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY tidak diset — memakai mode demo.');
      return { text: demoOutput(user), model: 'demo', tokensUsed: 0, demo: true };
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
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

    return { text, model: data.model ?? this.model, tokensUsed, demo: false };
  }
}

/** Output contoh saat tidak ada API key — bentuknya menyerupai hasil generator. */
function demoOutput(user: string): string {
  const firstLine = user.split('\n').find((l) => l.trim()) ?? 'Generate konten';
  return [
    '⚙️ MODE DEMO (ANTHROPIC_API_KEY belum diset)',
    '',
    `Permintaan: ${firstLine}`,
    '',
    'Ini placeholder terstruktur supaya alur end-to-end bisa diuji tanpa API key.',
    'Set ANTHROPIC_API_KEY di apps/api/.env untuk hasil sungguhan.',
    '',
    '```json',
    JSON.stringify(
      {
        type: 'demo',
        note: 'Output contoh. Isi ANTHROPIC_API_KEY untuk generate sungguhan.',
        hooks: ['Hook contoh 1', 'Hook contoh 2'],
        cta: 'checkout link bio',
      },
      null,
      2,
    ),
    '```',
  ].join('\n');
}
