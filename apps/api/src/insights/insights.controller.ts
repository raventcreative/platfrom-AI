import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Auth, AuthContext } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { InsightDto } from './dto/insight.dto';
import { InsightsService } from './insights.service';

/** Endpoint alat insight (kompetitor, audit IG, inspirasi, education). */
@UseGuards(AuthGuard)
@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  // POST /insights/run — jalankan satu alat insight, hasil dikembalikan sinkron.
  @Post('run')
  run(@Auth() auth: AuthContext, @Body() dto: InsightDto) {
    return this.insights.run(auth, dto);
  }
}
