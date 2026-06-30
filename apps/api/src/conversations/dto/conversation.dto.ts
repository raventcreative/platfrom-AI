import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  brandId!: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class PostMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;

  /** Pilihan model dari UI. Kosong → pakai default server. */
  @IsOptional()
  @IsIn(['anthropic', 'openai'])
  provider?: 'anthropic' | 'openai';
}
