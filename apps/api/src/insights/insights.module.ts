import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { IgController } from './ig.controller';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

/** Modul insight IG: review akun, perbandingan kompetitor & proxy scrape publik. */
@Module({
  imports: [LlmModule],
  controllers: [InsightsController, IgController],
  providers: [InsightsService],
})
export class InsightsModule {}
