import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { ScraperService } from './scraper.service';

/** Modul alat insight (analisis berbasis LLM + slot scraper data live). */
@Module({
  imports: [LlmModule],
  controllers: [InsightsController],
  providers: [InsightsService, ScraperService],
})
export class InsightsModule {}
