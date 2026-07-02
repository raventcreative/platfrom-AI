import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { GenerateDto } from './dto/generate.dto';
import { GenerateService } from './generate.service';

/** Endpoint generate konten langsung (cepat, tanpa antrean) + riwayatnya. */
@UseGuards(AuthGuard)
@Controller('generate')
export class GenerateController {
  constructor(private readonly gen: GenerateService) {}

  // POST /generate — sinkron: hasil penuh sekali respons.
  @Post()
  run(@Auth() auth: AuthContext, @Body() dto: GenerateDto) {
    return this.gen.runSync(auth, dto);
  }

  // POST /generate/stream — SSE: potongan teks mengalir real-time.
  @Post('stream')
  stream(
    @Auth() auth: AuthContext,
    @Body() dto: GenerateDto,
    @Res() res: Response,
  ) {
    return this.gen.runStream(auth, dto, res);
  }

  // GET /generate/history?brandId= — riwayat generate brand.
  @Get('history')
  history(@Auth() auth: AuthContext, @Query('brandId') brandId: string) {
    return this.gen.history(auth, brandId);
  }

  // DELETE /generate/history/:id — hapus satu entri riwayat.
  @Delete('history/:id')
  remove(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.gen.deleteHistory(auth, id);
  }
}
