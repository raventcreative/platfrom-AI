import { IsArray, IsOptional, IsString } from 'class-validator';

/** Input "training" brand voice: handle IG dan/atau contoh caption manual. */
export class TrainVoiceDto {
  @IsOptional()
  @IsString()
  igHandle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  samples?: string[];
}
