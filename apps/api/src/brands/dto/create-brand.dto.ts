import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

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
  @IsArray()
  @IsIn(['instagram', 'tiktok'], { each: true })
  platforms?: ('instagram' | 'tiktok')[];
}
