import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

/** Request otomasi: brief → JSON spec → reel/post final. */
export class AutomateDto {
  @IsOptional()
  @IsUUID()
  brandId?: string;

  /** Brief / arahan konten dari user (jadi dasar spec JSON). */
  @IsString()
  @MinLength(1)
  brief!: string;

  /** Bentuk output yang mau dibuat. */
  @IsIn(['reels', 'carousel', 'post'])
  format!: 'reels' | 'carousel' | 'post';

  @IsOptional()
  @IsString()
  platform?: string;

  // Pilihan LLM per-request (sama seperti generate; key tak disimpan).
  @IsOptional()
  @IsIn(['anthropic', 'openai'])
  provider?: 'anthropic' | 'openai';

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  model?: string;
}
