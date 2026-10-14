import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { MeasurementsModule } from './measurements/measurements.module';
import { UserModule } from './user/user.module';
import { ChildModule } from './child/child.module';
import { VaccineModule } from './vaccine/vaccine.module';
import { DiseaseModule } from './disease/disease.module';
import { CheckListItemModule } from './check-list-item/check-list-item.module';
import { MedicineModule } from './medicine/medicine.module';
import { EventModule } from './event/event.module';
import { ConditionModule } from './condition/condition.module';
import { ThreadModule } from './thread/thread.module';
import { MessageModule } from './message/message.module';
import { TagModule } from './tag/tag.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [PrismaModule, MeasurementsModule, UserModule, ChildModule, VaccineModule, DiseaseModule, CheckListItemModule, MedicineModule, EventModule, ConditionModule, ThreadModule, MessageModule, TagModule, ReportModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
