import {
  PrismaClient,
  Role,
  EntityType,
  ReportStatus,
  TagCondition,
  Sex,
  NotificationStatus,
  NotificationType,
  EventType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpiando la base de datos (evitando conflictos de claves foráneas)...');
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.messageLike.deleteMany();
  await prisma.message.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.condition.deleteMany();
  await prisma.event.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.vaccine.deleteMany();
  await prisma.measurement.deleteMany();
  await prisma.child.deleteMany();
  await prisma.disease.deleteMany();
  await prisma.user.deleteMany();

  console.log('Sembrando base de datos extendida...');

  // ------------------------------------------------------
  // 1. CREACIÓN DE ETIQUETAS DEL FORO
  // ------------------------------------------------------
  const tagLactancia = await prisma.tag.create({ data: { name: 'Lactancia' } });
  const tagSueno = await prisma.tag.create({ data: { name: 'Sueño' } });
  const tagSalud = await prisma.tag.create({ data: { name: 'Salud' } });
  const tagNutricion = await prisma.tag.create({ data: { name: 'Nutrición' } });
  const tagDesarrollo = await prisma.tag.create({ data: { name: 'Desarrollo' } });

  // ------------------------------------------------------
  // 2. CREACIÓN DE USUARIOS CON SUS HIJOS Y REGISTROS
  // ------------------------------------------------------

  // Usuario 1: Laura (PRO) - Madre de un bebé de 6 meses
  const laura = await prisma.user.create({
    data: {
      email: 'laura.pro@example.com',
      name: 'Laura Pérez',
      password: 'hashed_password_123',
      role: Role.PRO,
      children: {
        create: [
          {
            name: 'Leo',
            birthDate: new Date('2025-08-15T10:00:00Z'),
            bloodGroup: 'O+',
            allergies: 'Ninguna conocida',
            sex: Sex.MALE,
            measurements: {
              create: [
                { date: new Date('2025-08-15T10:00:00Z'), weight: 3.2, height: 50 },
                { date: new Date('2025-09-15T10:00:00Z'), weight: 4.1, height: 54 },
                { date: new Date('2025-10-15T10:00:00Z'), weight: 5.3, height: 58 },
                { date: new Date('2025-11-15T10:00:00Z'), weight: 6.2, height: 62 },
              ],
            },
            vaccines: {
              create: [
                {
                  name: 'Hepatitis B (Nacimiento)',
                  scheduledFor: new Date('2025-08-15T10:00:00Z'),
                  appliedAt: new Date('2025-08-16T10:00:00Z'),
                },
                {
                  name: 'Rotavirus (2 meses)',
                  scheduledFor: new Date('2025-10-15T10:00:00Z'),
                  appliedAt: new Date('2025-10-20T10:00:00Z'),
                },
                {
                  name: 'Meningococo B (4 meses)',
                  scheduledFor: new Date('2025-12-15T10:00:00Z'),
                },
              ],
            },
            checklists: {
              create: [
                { title: 'Revisión del primer mes', isCompleted: true, completedAt: new Date('2025-09-16T10:00:00Z') },
                { title: 'Revisión de los 6 meses', isCompleted: false },
              ],
            },
          },
        ],
      },
    },
    include: {
      children: {
        include: {
          vaccines: true,
        },
      },
    },
  });

  // Usuario 2: Carlos (USER) - Padre primerizo de una recién nacida
  const carlos = await prisma.user.create({
    data: {
      email: 'carlos.user@example.com',
      name: 'Carlos Martín',
      password: 'hashed_password_456',
      role: Role.USER,
      children: {
        create: [
          {
            name: 'Sofía',
            birthDate: new Date('2026-01-10T08:30:00Z'),
            bloodGroup: 'A-',
            sex: Sex.FEMALE,
            events: {
              create: [
                {
                  title: 'Cita Pediatra - Pesar',
                  date: new Date('2026-02-10T10:00:00Z'),
                  notification: true,
                  type: EventType.MEDICAL_APPOINTMENT,
                },
                {
                  title: 'Prueba del talón',
                  date: new Date('2026-01-15T09:00:00Z'),
                  notification: false,
                  type: EventType.MEDICAL_APPOINTMENT,
                },
              ],
            },
          },
        ],
      },
    },
    include: { children: true },
  });

  // Usuario 3: Elena (ADMIN) - Madre de un niño mayor con historial médico
  const elena = await prisma.user.create({
    data: {
      email: 'elena.admin@example.com',
      name: 'Elena Gómez (Pediatra)',
      password: 'hashed_password_789',
      role: Role.ADMIN,
      children: {
        create: [
          {
            name: 'Mateo',
            birthDate: new Date('2021-03-22T16:00:00Z'),
            bloodGroup: 'B+',
            allergies: 'Penicilina, Polen',
            sex: Sex.MALE,
            conditions: {
              create: [
                { tag: [TagCondition.FEVER], timestamp: new Date('2026-01-05T20:00:00Z'), notes: '39ºC repentinos' },
                { tag: [TagCondition.COUGH], timestamp: new Date('2026-01-06T09:00:00Z'), notes: 'Empeora al tumbarse' },
              ],
            },
          },
        ],
      },
    },
    include: { children: { include: { conditions: true } } },
  });

  // Segundo hijo de Laura para probar el filtro por hijo en el calendario
  const ines = await prisma.child.create({
    data: {
      name: 'Inés',
      birthDate: new Date('2023-04-12T08:00:00.000Z'),
      bloodGroup: 'A+',
      sex: Sex.FEMALE,
      parentId: laura.id,
    },
  });

  // ------------------------------------------------------
  // 3. EVENTOS DE PRUEBA
  // ------------------------------------------------------
  const eventoRevisionLeo = await prisma.event.create({
    data: {
      childId: laura.children[0].id, // Leo
      title: 'Revisión pediátrica',
      description: 'Revisión general y control de crecimiento.',
      date: new Date('2026-10-12T09:30:00.000Z'),
      notification: true,
      type: EventType.MEDICAL_APPOINTMENT,
    },
  });

  const eventoVacunaInes = await prisma.event.create({
    data: {
      childId: ines.id, // Inés
      title: 'Vacunación',
      description: 'Cita para revisar el calendario de vacunas.',
      date: new Date('2026-10-24T10:00:00.000Z'),
      notification: true,
      type: EventType.VACCINE,
    },
  });

  await prisma.event.createMany({
    data: [
      {
        childId: carlos.children[0].id, // Sofía
        title: 'Consulta de seguimiento',
        description: 'Seguimiento de la última consulta.',
        date: new Date('2026-10-18T11:00:00.000Z'),
        notification: false,
        type: EventType.MEDICAL_APPOINTMENT,
      },
      {
        childId: elena.children[0].id, // Mateo
        title: 'Revisión dental',
        description: 'Primera revisión dental.',
        date: new Date('2026-10-30T09:00:00.000Z'),
        notification: true,
        type: EventType.MEDICAL_APPOINTMENT,
      },
      {
        childId: laura.children[0].id, // Leo
        title: 'Control de crecimiento',
        description: 'Medición de peso y altura.',
        date: new Date('2026-11-04T10:30:00.000Z'),
        notification: true,
        type: EventType.GENERAL,
      },
      {
        childId: ines.id, // Inés
        title: 'Revisión pediátrica',
        description: 'Consulta de seguimiento.',
        date: new Date('2026-11-13T09:30:00.000Z'),
        notification: false,
        type: EventType.MEDICAL_APPOINTMENT,
      },
      {
        childId: carlos.children[0].id, // Sofía
        title: 'Cita con pediatría',
        description: 'Revisión de rutina.',
        date: new Date('2026-11-09T12:00:00.000Z'),
        notification: true,
        type: EventType.MEDICAL_APPOINTMENT,
      },
      {
        childId: elena.children[0].id, // Mateo
        title: 'Seguimiento de salud',
        description: 'Consulta de seguimiento.',
        date: new Date('2026-11-22T10:00:00.000Z'),
        notification: false,
        type: EventType.GENERAL,
      },
    ],
  });

  // ------------------------------------------------------
  // 4. REGISTROS MÉDICOS Y MEDICACIÓN CRUZADA
  // ------------------------------------------------------
  const otitis = await prisma.disease.create({
    data: {
      name: 'Otitis Media',
      description: 'Infección del oído medio',
      childId: elena.children[0].id,
    },
  });

  const bronquiolitis = await prisma.disease.create({
    data: {
      name: 'Bronquiolitis',
      description: 'Infección respiratoria viral',
      childId: laura.children[0].id,
    },
  });

  const dalsy = await prisma.medicine.create({
    data: {
      name: 'Dalsy 20mg',
      dosage: '3.5 ml',
      intervalHours: 8,
      startDate: new Date('2026-01-05T21:00:00Z'),
      endDate: new Date('2026-01-09T21:00:00Z'),
      instructions: 'Dar siempre con algo de comida en el estómago',
      childId: elena.children[0].id,
      diseaseId: otitis.id,
      conditionId: elena.children[0].conditions[0].id,
    },
  });

  const ventolin = await prisma.medicine.create({
    data: {
      name: 'Ventolín Inhalador',
      dosage: '2 pulsaciones',
      intervalHours: 6,
      startDate: new Date('2025-12-01T10:00:00Z'),
      childId: laura.children[0].id,
      diseaseId: bronquiolitis.id,
    },
  });

  // ------------------------------------------------------
  // 5. NOTIFICACIONES DEL SISTEMA (DIFERENTES TIPOS Y ESTADOS)
  // ------------------------------------------------------
  console.log('Sembrando notificaciones de prueba...');

  // Notificación 1: Recordatorio de Evento futuro (PENDING) para Laura sobre Inés
  await prisma.notification.create({
    data: {
      type: NotificationType.EVENT,
      title: 'Recordatorio: Cita de Vacunación',
      body: 'Mañana tienes la cita de vacunación de Inés a las 10:00.',
      scheduledAt: new Date('2026-10-23T10:00:00.000Z'),
      status: NotificationStatus.PENDING,
      userId: laura.id,
      eventId: eventoVacunaInes.id,
      data: {
        screen: 'Calendario',
        eventId: eventoVacunaInes.id,
        childName: 'Inés',
      },
    },
  });

  // Notificación 2: Recordatorio de Evento pasado ya enviado (SENT) para Laura sobre Leo
  await prisma.notification.create({
    data: {
      type: NotificationType.EVENT,
      title: 'Revisión pediátrica hoy',
      body: 'Recuerda llevar la cartilla de salud para la revisión de Leo.',
      scheduledAt: new Date('2026-10-12T07:30:00.000Z'),
      sentAt: new Date('2026-10-12T07:30:04.000Z'),
      status: NotificationStatus.SENT,
      userId: laura.id,
      eventId: eventoRevisionLeo.id,
      data: {
        screen: 'Calendario',
        eventId: eventoRevisionLeo.id,
      },
    },
  });

  // Notificación 3: Recordatorio de Vacuna pendiente (PENDING) para Laura
  const vacunaMeningococo = laura.children[0].vaccines.find((v) => v.name.includes('Meningococo'));
  if (vacunaMeningococo) {
    await prisma.notification.create({
      data: {
        type: NotificationType.VACCINE,
        title: 'Próxima vacuna recomendada',
        body: 'Leo está en edad de recibir la vacuna Meningococo B (4 meses).',
        scheduledAt: new Date('2025-12-14T09:00:00.000Z'),
        status: NotificationStatus.PENDING,
        userId: laura.id,
        vaccineId: vacunaMeningococo.id,
        data: {
          screen: 'Vaccines',
          vaccineId: vacunaMeningococo.id,
        },
      },
    });
  }

  // Notificación 4: Recordatorio de Toma de Medicación (PENDING) para Elena
  await prisma.notification.create({
    data: {
      type: NotificationType.MEDICINE,
      title: 'Toma de medicación: Dalsy',
      body: 'Toca suministrar 3.5 ml de Dalsy 20mg a Mateo.',
      scheduledAt: new Date('2026-10-14T15:00:00.000Z'),
      status: NotificationStatus.PENDING,
      userId: elena.id,
      medicineId: dalsy.id,
      data: {
        screen: 'MedicineDetail',
        medicineId: dalsy.id,
      },
    },
  });

  // Notificación 5: Aviso del Sistema / General (SENT) para Carlos
  await prisma.notification.create({
    data: {
      type: NotificationType.SYSTEM,
      title: '¡Bienvenido a la app de maternidad!',
      body: 'Configura las alertas de salud y vacunas para no perderte ninguna cita.',
      scheduledAt: new Date('2026-01-10T09:00:00.000Z'),
      sentAt: new Date('2026-01-10T09:00:02.000Z'),
      status: NotificationStatus.SENT,
      userId: carlos.id,
      data: {
        screen: 'Home',
      },
    },
  });

  // ------------------------------------------------------
  // 6. FORO DE FAMILIAS: HILOS, RESPUESTAS Y ANIDACIÓN
  // ------------------------------------------------------
  const hiloSueno = await prisma.thread.create({
    data: {
      title: 'Mi bebé de 3 semanas no duerme más de 2 horas seguidas',
      content:
        'Hola a todos. Sofía tiene 3 semanas y estamos agotados. Solo quiere pecho y se despierta en cuanto la dejamos en la cuna. ¿Es normal?',
      ownerId: carlos.id,
      tags: { connect: [{ id: tagSueno.id }, { id: tagLactancia.id }] },
    },
  });

  const respuestaLaura = await prisma.message.create({
    data: {
      content:
        '¡Mucho ánimo Carlos! Los primeros meses son de supervivencia. Lo que cuentas es súper normal, los bebés no saben enlazar ciclos de sueño aún.',
      // likesCount siempre igual al nº de filas en MessageLike
      likesCount: 2,
      likes: { create: [{ userId: carlos.id }, { userId: elena.id }] },
      authorId: laura.id,
      threadId: hiloSueno.id,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Totalmente. A nosotros nos salvó hacer colecho seguro y usar una mochila de porteo por el día.',
      likesCount: 1,
      likes: { create: [{ userId: carlos.id }] },
      authorId: elena.id,
      threadId: hiloSueno.id,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Gracias Laura, de verdad. A veces piensas que lo estás haciendo mal.',
      authorId: carlos.id,
      threadId: hiloSueno.id,
      parentId: respuestaLaura.id,
    },
  });

  const hiloBLW = await prisma.thread.create({
    data: {
      title: '¿Miedo a empezar con el BLW (Baby Led Weaning)?',
      content:
        'Leo va a cumplir 6 meses y su pediatra nos ha recomendado empezar con trozos, pero me da pánico que se atragante. ¿Experiencias?',
      ownerId: laura.id,
      tags: { connect: [{ id: tagNutricion.id }, { id: tagDesarrollo.id }] },
    },
  });

  await prisma.message.create({
    data: {
      content:
        'Haz un curso de primeros auxilios pediátricos antes de empezar. Te dará mucha seguridad y es fundamental saber actuar.',
      likesCount: 1,
      likes: { create: [{ userId: laura.id }] },
      authorId: elena.id,
      threadId: hiloBLW.id,
    },
  });

  const hiloPolemico = await prisma.thread.create({
    data: {
      title: 'Le doy infusiones de anís a mi bebé de 1 mes para los cólicos',
      content:
        'A mí me funciona genial, le hago una botellita de anís estrellado y duerme toda la noche del tirón.',
      ownerId: carlos.id,
      tags: { connect: [{ id: tagSalud.id }] },
    },
  });

  const mensajePolemico = await prisma.message.create({
    data: {
      content: 'Yo también lo hago, y si le pones un poco de miel en el chupete se callan al instante.',
      likesCount: 0,
      authorId: carlos.id,
      threadId: hiloPolemico.id,
    },
  });

  // ------------------------------------------------------
  // 7. SISTEMA DE REPORTES
  // ------------------------------------------------------
  await prisma.report.create({
    data: {
      reason: 'Consejo médico muy peligroso (Miel en menores de 1 año). Riesgo de botulismo.',
      status: ReportStatus.PENDING,
      targetType: EntityType.MESSAGE,
      targetId: mensajePolemico.id,
      reporterId: laura.id,
    },
  });

  await prisma.report.create({
    data: {
      reason: 'Las infusiones de anís estrellado son tóxicas para los bebés neurológicamente.',
      status: ReportStatus.RESOLVED,
      targetType: EntityType.THREAD,
      targetId: hiloPolemico.id,
      reporterId: elena.id,
    },
  });

  await prisma.thread.update({
    where: { id: hiloPolemico.id },
    data: { isHidden: true },
  });

  console.log('✅ Base de datos sembrada con éxito. ¡Lista para pruebas!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });