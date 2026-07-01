import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { GenerateDto } from './dto/generate.dto';
import { JobsService } from './jobs.service';

/** Controller job generasi konten; dilindungi AuthGuard. */
@UseGuards(AuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  // POST /jobs/generate — buat & antrikan job generasi, kembalikan jobId.
  @Post('generate')
  generate(@Auth() auth: AuthContext, @Body() dto: GenerateDto) {
    return this.jobs.generate(auth, dto);
  }

  // GET /jobs?brandId=... — riwayat generate sebuah brand (terbaru dulu).
  @Get()
  list(@Auth() auth: AuthContext, @Query('brandId') brandId: string) {
    return this.jobs.listForBrand(auth, brandId);
  }

  // GET /jobs/:id — cek status & hasil sebuah job.
  @Get(':id')
  get(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.jobs.get(auth, id);
  }

  // DELETE /jobs/:id — hapus satu entri riwayat.
  @Delete(':id')
  remove(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.jobs.remove(auth, id);
  }
}
