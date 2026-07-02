import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';

/** Modul otomasi: chain brief → JSON spec → reel/post. */
@Module({
  imports: [LlmModule],
  controllers: [AutomationController],
  providers: [AutomationService],
})
export class AutomationModule {}
