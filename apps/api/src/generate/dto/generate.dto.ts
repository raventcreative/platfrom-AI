import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const OUTPUT_TYPES = [
  'script',
  'carousel',
  'storyboard',
  'caption',
  'ideas',
] as const;
export type GenOutputType = (typeof OUTPUT_TYPES)[number];

/**
 * Request generate konten (sync maupun streaming).
 * Input dibuat minimal & terstruktur supaya UI cukup 1-2 pertanyaan:
 * topik + (opsional) produk fokus + tahap funnel + catatan.
 */
export class GenerateDto {
  @IsUUID()
  brandId!: string;

  /** Jenis output: script | carousel | storyboard | caption | ideas. */
  @IsIn(OUTPUT_TYPES as unknown as string[])
  type!: GenOutputType;

  /** Topik / brief hari ini (boleh kosong khusus "ideas" — pakai profil brand). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  topic?: string;

  /** Produk fokus (nama produk dari daftar SKU brand, opsional). */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  product?: string;

  /** Tahap funnel target (opsional). */
  @IsOptional()
  @IsIn(['TOFU', 'MOFU', 'BOFU'])
  funnel?: 'TOFU' | 'MOFU' | 'BOFU';

  /** Catatan tambahan bebas (opsional). */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  extra?: string;

  /** Provider LLM pilihan UI: anthropic | openai (opsional; auto dari key env). */
  @IsOptional()
  @IsString()
  provider?: string;

  /** BYO API key dari UI — dipakai sekali untuk request ini, TIDAK disimpan. */
  @IsOptional()
  @IsString()
  apiKey?: string;

  /** Override model (opsional). */
  @IsOptional()
  @IsString()
  model?: string;
}
