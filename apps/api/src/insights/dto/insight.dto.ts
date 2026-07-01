import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

/** Request untuk alat insight (kompetitor, audit IG, inspirasi, education). */
export class InsightDto {
  @IsIn([
    'competitor',
    'ig_audit',
    'inspiration',
    'education',
    'content_intel',
    'ig_insight',
    'ig_research',
  ])
  type!:
    | 'competitor'
    | 'ig_audit'
    | 'inspiration'
    | 'education'
    | 'content_intel'
    | 'ig_insight'
    | 'ig_research';

  /** Konteks brand (opsional) — profilnya ikut dimasukkan ke prompt. */
  @IsOptional()
  @IsUUID()
  brandId?: string;

  /** Parameter bebas per-tool (mis. handle IG, tema, topik). */
  @IsOptional()
  @IsObject()
  params?: Record<string, string>;

  // Pilihan LLM per-request (sama seperti generate; key tak disimpan di server).
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
