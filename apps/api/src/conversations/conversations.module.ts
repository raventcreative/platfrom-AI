import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

/** Feature module percakapan; meng-import JobsModule untuk memicu job agent dari pesan. */
@Module({
  imports: [JobsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
