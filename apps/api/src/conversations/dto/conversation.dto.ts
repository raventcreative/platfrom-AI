import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

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
}
