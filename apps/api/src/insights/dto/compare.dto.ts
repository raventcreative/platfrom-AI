import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** Request perbandingan akun brand vs kompetitor (semua handle publik). */
export class CompareDto {
  /** Handle IG brand sendiri. */
  @IsString()
  @MinLength(1)
  brandHandle!: string;

  /** 1-3 handle kompetitor. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  competitors!: string[];

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
