import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

/** Request otomasi GAMBAR: brief → beberapa prompt → OpenAI Images → gambar. */
export class GenerateImageDto {
  @IsOptional()
  @IsUUID()
  brandId?: string;

  /** Brief / arahan visual dari user. */
  @IsString()
  @MinLength(1)
  brief!: string;

  /** Jumlah gambar/konsep yang dibuat (1–4, default 3). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  count?: number;

  /** Rasio gambar (default square). */
  @IsOptional()
  @IsIn(['square', 'portrait', 'landscape'])
  aspect?: 'square' | 'portrait' | 'landscape';

  /** Gaya visual opsional (mis. "flat vector", "fotografi produk", "3D render"). */
  @IsOptional()
  @IsString()
  style?: string;

  /** BYO OpenAI key dari UI (image hanya via OpenAI); tidak disimpan. */
  @IsOptional()
  @IsString()
  apiKey?: string;

  /** Override model image (mis. dall-e-3 / gpt-image-1). */
  @IsOptional()
  @IsString()
  model?: string;
}
