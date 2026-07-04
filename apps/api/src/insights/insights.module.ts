import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { IgController } from './ig.controller';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { TtController } from './tt.controller';
import { YtController } from './yt.controller';

/** Modul insight IG + TikTok + YouTube: review akun, perbandingan kompetitor & proxy scrape publik. */
@Module({
  imports: [LlmModule],
  controllers: [InsightsController, IgController, TtController, YtController],
  providers: [InsightsService],
})
export class InsightsModule {}
