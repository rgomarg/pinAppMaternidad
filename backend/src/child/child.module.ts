import { Module } from '@nestjs/common';
import { ChildService } from './child.service';
import { ChildController } from './child.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { ChildExportService } from './child-export.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChildController],
  providers: [ChildService, ChildExportService],
})
export class ChildModule {}
