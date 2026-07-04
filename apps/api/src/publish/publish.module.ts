import { Module } from '@nestjs/common';
import { PublishController } from './publish.controller';

/** Modul cross-post: publish 1 konten ke IG + FB + TikTok sekaligus (API resmi). */
@Module({
  controllers: [PublishController],
})
export class PublishModule {}
