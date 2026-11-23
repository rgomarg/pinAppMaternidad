import { Module } from '@nestjs/common';
import { ThreadService } from './thread.service';
import { ThreadController } from './thread.controller';
import { ThreadSummaryService } from './thread-summary.service';

@Module({
  controllers: [ThreadController],
  providers: [ThreadService, ThreadSummaryService],
})
export class ThreadModule {}
