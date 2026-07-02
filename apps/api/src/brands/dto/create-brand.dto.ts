import { ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiPropertyOptional({ type: 'array', items: { type: 'string', enum: ['instagram', 'tiktok'] } })
  @IsOptional()
  @IsArray()
  @IsIn(['instagram', 'tiktok'], { each: true })
  platforms?: ('instagram' | 'tiktok')[];

  /** Jawaban intake lengkap + daftar SKU (profile.skus) — disimpan di Brand.profile. */
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  profile?: Record<string, unknown>;
}
