import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

/** Request generate berbasis form (bukan chat): brand + generator + daily input. */
export class GenerateDto {
  @IsUUID()
  brandId!: string;

  @IsIn(['SCRIPT', 'CAROUSEL', 'STORYBOARD', 'CAPTION', 'IDEAS'])
  agent!: 'SCRIPT' | 'CAROUSEL' | 'STORYBOARD' | 'CAPTION' | 'IDEAS';

  /** Daily input yang sudah dirangkai dari form (boleh kosong → pakai profil brand). */
  @IsOptional()
  @IsString()
  input?: string;

  /** Pilihan model dari UI. Kosong → default server. */
  @IsOptional()
  @IsIn(['anthropic', 'openai'])
  provider?: 'anthropic' | 'openai';

  /**
   * "Bring your own key" dari UI. Dikirim per-request, dipakai sekali, TIDAK
   * disimpan di server (lewat payload antrian, bukan kolom DB). Kosong → env.
   */
  @IsOptional()
  @IsString()
  apiKey?: string;

  /** Override model spesifik (mis. gpt-4o-mini / claude-opus-4-8). Kosong → default. */
  @IsOptional()
  @IsString()
  model?: string;
}
