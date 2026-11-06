import { Module } from '@nestjs/common';
import { VaccineService } from './vaccine.service';
import { VaccineController } from './vaccine.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { VaccineListener } from './vaccine.listener';
import { VaccineScheduleService } from './vaccine-schedule.service';

@Module({
  imports: [PrismaModule],
  controllers: [VaccineController],
  providers: [VaccineService, VaccineListener, VaccineScheduleService],
})
export class VaccineModule {}
