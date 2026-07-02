import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

/** Modul insight IG: review akun & perbandingan kompetitor. */
@Module({
  imports: [LlmModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
