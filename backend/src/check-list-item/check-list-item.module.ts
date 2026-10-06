import { Module } from '@nestjs/common';
import { CheckListItemService } from './check-list-item.service';
import { CheckListItemController } from './check-list-item.controller';

@Module({
  controllers: [CheckListItemController],
  providers: [CheckListItemService],
})
export class CheckListItemModule {}
