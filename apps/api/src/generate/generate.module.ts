import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { GenerateController } from './generate.controller';
import { GenerateService } from './generate.service';

/** Modul generate konten langsung (sync + streaming SSE) + riwayat. */
@Module({
  imports: [LlmModule],
  controllers: [GenerateController],
  providers: [GenerateService],
})
export class GenerateModule {}
