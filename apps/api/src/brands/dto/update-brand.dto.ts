import { PartialType } from '@nestjs/mapped-types';
import { CreateBrandDto } from './create-brand.dto';

/** Update parsial: semua field CreateBrandDto jadi opsional. */
export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
