import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { TrainVoiceDto } from './dto/train-voice.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

/** CRUD brand; seluruh route dilindungi AuthGuard (butuh token valid). */
@UseGuards(AuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  // GET /brands — daftar brand milik org.
  @Get()
  list(@Auth() auth: AuthContext) {
    return this.brands.list(auth);
  }

  // POST /brands — buat brand baru (dari wizard onboarding).
  @Post()
  create(@Auth() auth: AuthContext, @Body() dto: CreateBrandDto) {
    return this.brands.create(auth, dto);
  }

  // GET /brands/:id — detail satu brand.
  @Get(':id')
  get(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.brands.get(auth, id);
  }

  // PATCH /brands/:id — perbarui sebagian field brand.
  @Patch(':id')
  update(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brands.update(auth, id, dto);
  }

  // DELETE /brands/:id — hapus brand (soft-delete/arsip).
  @Delete(':id')
  remove(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.brands.remove(auth, id);
  }

  /** "Training" brand voice dari IG handle / contoh caption → 202 { jobId }. */
  @Post(':id/voice-profile')
  @HttpCode(202)
  trainVoice(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: TrainVoiceDto,
  ) {
    return this.brands.trainVoice(auth, id, dto);
  }
}
