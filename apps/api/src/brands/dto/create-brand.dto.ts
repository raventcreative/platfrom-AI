import {
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

  /** Jawaban intake lengkap + daftar SKU (profile.skus) — disimpan di Brand.profile. */
  @IsOptional()
  @IsObject()
  profile?: Record<string, unknown>;
}
