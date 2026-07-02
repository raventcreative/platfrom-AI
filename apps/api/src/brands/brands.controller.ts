import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { TrainVoiceDto } from './dto/train-voice.dto';

@UseGuards(AuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  list(@Auth() auth: AuthContext) {
    return this.brands.list(auth);
  }

  @Post()
  create(@Auth() auth: AuthContext, @Body() dto: CreateBrandDto) {
    return this.brands.create(auth, dto);
  }

  @Get(':id')
  get(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.brands.get(auth, id);
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
