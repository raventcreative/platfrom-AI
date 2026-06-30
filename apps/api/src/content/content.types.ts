/** Jenis output generator Content Engine (MVP). */
export type OutputType =
  | 'script'
  | 'carousel'
  | 'storyboard'
  | 'caption'
  | 'ideas';

/** Subset data brand yang dipakai untuk merakit system prompt. */
export interface BrandContextInput {
  name: string;
  niche?: string | null;
  description?: string | null;
  platforms?: string[];
  voice?: {
    toneAttributes?: string[];
    styleSummary?: string | null;
    preferredWords?: string[];
    avoidWords?: string[];
  } | null;
  kit?: {
    colors?: string[];
    fonts?: string[];
    guidelines?: string | null;
  } | null;
  /** Jawaban intake bebas-bentuk (JSONB) — modul per vertikal. */
  profile?: unknown;
}
