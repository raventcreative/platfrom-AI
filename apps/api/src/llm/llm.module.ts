import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';

/** Module penyedia LlmService (pemanggil LLM), diekspor untuk dipakai modul lain. */
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
