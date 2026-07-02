import { IsOptional, IsString, MinLength } from 'class-validator';

/** Request review satu akun Instagram (handle publik). */
export class ReviewDto {
  /** Username IG, boleh dengan atau tanpa @. */
  @IsString()
  @MinLength(1)
  handle!: string;

  /** Provider LLM pilihan UI (opsional). */
  @IsOptional()
  @IsString()
  provider?: string;

  /** BYO API key dari UI — dipakai sekali, tidak disimpan. */
  @IsOptional()
  @IsString()
  apiKey?: string;

  /** Override model (opsional). */
  @IsOptional()
  @IsString()
  model?: string;
}
