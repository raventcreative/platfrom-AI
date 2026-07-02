import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  niche?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['skincare', 'fnb', 'fashion', 'service', 'other'])
  category?: 'skincare' | 'fnb' | 'fashion' | 'service' | 'other';

  @IsOptional()
  @IsArray()
  @IsIn(['instagram', 'tiktok'], { each: true })
  platforms?: ('instagram' | 'tiktok')[];

  /** Jawaban onboarding (field intake bebas) — disimpan di Brand.profile (JSON). */
  @IsOptional()
  @IsObject()
  profile?: Record<string, unknown>;

  /** Handle IG kompetitor (maks 5) — disinkronkan ke tabel Competitor. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  competitors?: string[];
}
