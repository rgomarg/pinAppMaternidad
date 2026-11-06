// vaccine/listeners/vaccine.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChildCreatedEvent } from 'src/child/entities/child-created.events';

import { VaccineScheduleService } from './vaccine-schedule.service';

@Injectable()
export class VaccineListener {
  constructor(
    private readonly vaccineScheduleService: VaccineScheduleService,
  ) {}

  // 👇 Este método se ejecuta AUTOMÁTICAMENTE cuando ChildService emite 'child.created'
  @OnEvent('child.created')
  async handleChildCreatedEvent(payload: ChildCreatedEvent) {
    console.log(`Recibido evento para el niño ID: ${payload.childId}`);

    // Delega el cálculo y guardado a tu servicio de vacunas
    await this.vaccineScheduleService.generateScheduleForChild(
      payload.childId,
      payload.birthDate,
    );
  }
}