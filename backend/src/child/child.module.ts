import { Module } from '@nestjs/common';
import { ChildService } from './child.service';
import { ChildController } from './child.controller';

@Module({
  controllers: [ChildController],
  providers: [ChildService],
})
export class ChildModule {}
