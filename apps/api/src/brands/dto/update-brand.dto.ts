import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** Semua opsional — untuk edit brand yang sudah ada. */
export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

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

  @IsOptional()
  @IsObject()
  profile?: Record<string, unknown>;
}
