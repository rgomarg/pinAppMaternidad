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
  DifficultyRecip,
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
  await prisma.recipe.deleteMany();
  await prisma.book.deleteMany();
  await prisma.article.deleteMany();

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

  // Usuario 1: Laura (USER) - Madre de un bebé de 6 meses
  const laura = await prisma.user.create({
    data: {
      email: 'laura.pro@example.com',
      name: 'Laura',
      surname: 'Pérez',
      phone: '+34 612 345 678',
      profileRole: 'MOTHER',
      password: 'hashed_password_123',
      role: Role.USER,
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
                { title: 'Programar revisión pediátrica', isCompleted: true, completedAt: new Date('2025-09-16T10:00:00Z') },
                { title: 'Revisar próxima vacuna', isCompleted: false },
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
      name: 'Carlos',
      surname: 'Martín',
      phone: '+34 623 456 789',
      profileRole: 'FATHER',
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

  // Usuario 3: Elena (PRO) - Pediatra y madre de un niño mayor con historial médico
  const elena = await prisma.user.create({
    data: {
      email: 'elena.admin@example.com',
      name: 'Elena',
      surname: 'Gómez',
      phone: '+34 634 567 890',
      profileRole: 'MOTHER',
      isPediatrician: true,
      password: 'hashed_password_789',
      role: Role.PRO,
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

  // Usuario 4: Administrador de la plataforma (modera el foro desde el panel de administración)
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Administración',
      phone: '+34 645 678 901',
      profileRole: 'GUARDIAN',
      password: 'hashed_password_admin',
      role: Role.ADMIN,
    },
  });

  // Usuario 5: Usuario ya bloqueado por el administrador (para probar el panel de moderación)
  const usuarioBloqueado = await prisma.user.create({
    data: {
      email: 'spam.user@example.com',
      name: 'Marcos',
      surname: 'Spam',
      phone: '+34 656 789 012',
      profileRole: 'MOTHER',
      password: 'hashed_password_spam',
      role: Role.USER,
      blockedAt: new Date('2026-11-01T12:00:00Z'),
    },
  });

  // Usuario 6: Marta (PRO) con 2 hijos y un historial médico completo.
  // Pensado para probar GET /child/:id/historial (?proId=<id de Marta>):
  //  - Los 5 tipos: enfermedades, medicamentos, vacunas, citas médicas y síntomas.
  //  - Casos límite: tratamiento activo sin fin, tratamiento que empezó antes del rango y sigue,
  //    enfermedad sin fecha de diagnóstico (no debe salir), vacuna pendiente (no debe salir),
  //    evento GENERAL (no es cita médica: no debe salir), cita futura (PENDING).
  //  - Varios registros con la MISMA fecha exacta (desempate del cursor).
  //  - Más de 20 registros en Lucía (paginación con el límite por defecto).
  const mismaHora = new Date('2026-09-02T09:00:00Z');
  const diarioSintomasLucia = Array.from({ length: 12 }, (_, i) => ({
    tag: i % 3 === 0 ? [TagCondition.FEVER, TagCondition.COUGH] : i % 3 === 1 ? [TagCondition.RUNNY_NOSE] : [TagCondition.FATIGUE],
    desciption: `Diario de síntomas, día ${i + 1}`,
    notes: i % 3 === 0 ? 'Fiebre 38.2°C por la tarde' : 'Buen estado general',
    timestamp: new Date(Date.UTC(2026, 9, 1 + i * 2, 18, 0, 0)), // octubre 2026, cada 2 días
  }));

  const marta = await prisma.user.create({
    data: {
      email: 'marta.pro@example.com',
      name: 'Marta',
      surname: 'Ruiz',
      phone: '+34 667 890 123',
      profileRole: 'MOTHER',
      password: 'hashed_password_pro',
      role: Role.PRO,
      children: {
        create: [
          {
            name: 'Lucía',
            surname: 'Ruiz',
            birthDate: new Date('2022-05-03T07:00:00Z'),
            bloodGroup: 'A+',
            allergies: JSON.stringify([{ name: 'Frutos secos', severity: 'severa', notes: 'Llevar autoinyector' }]),
            sex: Sex.FEMALE,
            diseases: {
              create: [
                // Misma fecha exacta que Paracetamol y que un síntoma → prueba el desempate
                { name: 'Resfriado común', description: 'Fiebre 38.2°C, congestión nasal', diagnosticatedAge: mismaHora, endDate: new Date('2026-09-09T09:00:00Z') },
                { name: 'Dermatitis atópica', description: 'Brotes en invierno, crema hidratante a diario', diagnosticatedAge: new Date('2024-01-15T10:00:00Z') }, // activa (sin fin)
                { name: 'Varicela', description: 'Cuadro leve, sin complicaciones', diagnosticatedAge: new Date('2025-03-10T10:00:00Z'), endDate: new Date('2025-03-20T10:00:00Z') },
                { name: 'Gastroenteritis', description: 'Vómitos y diarrea durante 2 días', diagnosticatedAge: new Date('2026-06-18T12:00:00Z'), endDate: new Date('2026-06-21T12:00:00Z') },
                { name: 'Alergia estacional (sin fecha)', description: 'NO debe aparecer en el historial: sin diagnosticatedAge' },
              ],
            },
            medicine: {
              create: [
                { name: 'Paracetamol 250mg', dosage: '5 ml', intervalHours: 8, startDate: mismaHora, endDate: new Date('2026-09-05T09:00:00Z'), instructions: 'Cada 8h durante 3 días' },
                { name: 'Crema hidratante (emoliente)', dosage: 'Capa fina', intervalHours: 24, startDate: new Date('2024-01-16T09:00:00Z'), instructions: 'Tratamiento crónico, sin fecha de fin' }, // activo desde antes de cualquier rango
                { name: 'Suero oral', dosage: '50 ml', intervalHours: 2, startDate: new Date('2026-06-18T13:00:00Z'), endDate: new Date('2026-06-20T13:00:00Z') },
                { name: 'Amoxicilina 250mg', dosage: '4 ml', intervalHours: 8, startDate: new Date('2026-10-20T08:00:00Z'), endDate: new Date('2026-12-01T08:00:00Z'), instructions: 'Termina en el futuro: debe salir ACTIVE' },
              ],
            },
            vaccines: {
              create: [
                { name: 'Hexavalente (2 meses)', scheduledFor: new Date('2022-07-03T09:00:00Z'), appliedAt: new Date('2022-07-04T09:00:00Z') },
                { name: 'Triple vírica (12 meses)', scheduledFor: new Date('2023-05-03T09:00:00Z'), appliedAt: new Date('2023-05-08T09:00:00Z') },
                { name: 'Gripe 2026-2027', scheduledFor: new Date('2026-10-15T09:00:00Z'), appliedAt: new Date('2026-10-16T10:30:00Z') },
                { name: 'Varicela 2ª dosis', scheduledFor: new Date('2026-12-10T09:00:00Z') }, // pendiente: NO debe aparecer
              ],
            },
            events: {
              create: [
                { title: 'Control pediátrico', description: 'Revisión semestral con Dr. Morales', date: new Date('2026-09-10T10:00:00Z'), type: EventType.MEDICAL_APPOINTMENT },
                { title: 'Dermatólogo', description: 'Seguimiento de la dermatitis', date: new Date('2026-03-04T16:00:00Z'), type: EventType.MEDICAL_APPOINTMENT },
                { title: 'Revisión de los 5 años', description: 'Cita futura: debe salir PENDING', date: new Date('2026-12-02T09:30:00Z'), type: EventType.MEDICAL_APPOINTMENT, notification: true },
                { title: 'Cumpleaños de la abuela', description: 'Evento GENERAL: NO debe aparecer en el historial', date: new Date('2026-09-20T17:00:00Z'), type: EventType.GENERAL },
              ],
            },
            conditions: {
              create: [
                { tag: [TagCondition.FEVER, TagCondition.NASAL_CONGESTION], desciption: 'Primer día del resfriado', timestamp: mismaHora },
                { tag: [TagCondition.FEVER], notes: 'Fiebre bajó a 37.1°C, buen estado general', timestamp: new Date('2026-09-04T19:00:00Z') },
                { tag: [TagCondition.VOMITING, TagCondition.DIARRHEA], timestamp: new Date('2026-06-18T08:00:00Z') },
                { tag: [TagCondition.RASH, TagCondition.ITCHING], desciption: 'Brote de dermatitis en los codos', timestamp: new Date('2026-02-11T20:00:00Z') },
                ...diarioSintomasLucia,
              ],
            },
          },
          {
            name: 'Pablo',
            surname: 'Ruiz',
            birthDate: new Date('2025-11-20T05:30:00Z'),
            bloodGroup: '0-',
            sex: Sex.MALE,
            measurements: {
              create: [
                { date: new Date('2025-11-20T05:30:00Z'), weight: 3.4, height: 51 },
                { date: new Date('2026-02-20T10:00:00Z'), weight: 5.9, height: 60 },
                { date: new Date('2026-05-20T10:00:00Z'), weight: 7.4, height: 66 },
                { date: new Date('2026-08-20T10:00:00Z'), weight: 8.5, height: 71 },
              ],
            },
            diseases: {
              create: [
                { name: 'Bronquiolitis', description: 'Ingreso de 2 días, oxigenoterapia', diagnosticatedAge: new Date('2026-01-12T22:00:00Z'), endDate: new Date('2026-01-26T10:00:00Z') },
                { name: 'Otitis media', description: 'Oído derecho', diagnosticatedAge: new Date('2026-10-28T11:00:00Z') }, // activa
              ],
            },
            medicine: {
              create: [
                { name: 'Salbutamol inhalado', dosage: '2 puffs con cámara', intervalHours: 6, startDate: new Date('2026-01-13T08:00:00Z'), endDate: new Date('2026-01-25T08:00:00Z') },
                { name: 'Ibuprofeno 2%', dosage: '3 ml', intervalHours: 8, startDate: new Date('2026-10-28T12:00:00Z'), endDate: new Date('2026-10-31T12:00:00Z'), instructions: 'Con comida' },
              ],
            },
            vaccines: {
              create: [
                { name: 'Hepatitis B (nacimiento)', scheduledFor: new Date('2025-11-20T09:00:00Z'), appliedAt: new Date('2025-11-21T09:00:00Z') },
                { name: 'Hexavalente (2 meses)', scheduledFor: new Date('2026-01-20T09:00:00Z'), appliedAt: new Date('2026-02-02T09:00:00Z') }, // aplicada tras la bronquiolitis
                { name: 'Hexavalente (4 meses)', scheduledFor: new Date('2026-03-20T09:00:00Z'), appliedAt: new Date('2026-03-20T09:30:00Z') },
                { name: 'Meningococo B (12 meses)', scheduledFor: new Date('2026-11-20T09:00:00Z') }, // pendiente: NO debe aparecer
              ],
            },
            events: {
              create: [
                { title: 'Urgencias pediátricas', description: 'Dificultad respiratoria', date: new Date('2026-01-12T21:00:00Z'), type: EventType.MEDICAL_APPOINTMENT },
                { title: 'Revisión del niño sano (12 meses)', description: 'Peso, talla y desarrollo', date: new Date('2026-11-24T10:00:00Z'), type: EventType.MEDICAL_APPOINTMENT },
              ],
            },
            conditions: {
              create: [
                { tag: [TagCondition.WHEEZING, TagCondition.SHORTNESS_OF_BREATH], desciption: 'Respira con pitos', timestamp: new Date('2026-01-12T19:00:00Z') },
                { tag: [TagCondition.EARACHE, TagCondition.IRRITABILITY], notes: 'Se toca la oreja y llora al tumbarlo', timestamp: new Date('2026-10-27T23:00:00Z') },
              ],
            },
          },
        ],
      },
    },
    include: { children: true },
  });
  console.log(`Usuario PRO de prueba: Marta (id ${marta.id}) · hijos: ${marta.children.map((c) => `${c.name} (id ${c.id})`).join(', ')}`);

  // Usuario 7: Sofía (PRO) - Madre primeriza con una niña que empieza la guardería.
  // Segundo usuario PRO para probar funciones PRO (p. ej. el resumen con IA de los hilos del foro)
  // con más de una cuenta.
  const sofia = await prisma.user.create({
    data: {
      email: 'sofia.pro@example.com',
      name: 'Sofía Navarro (PRO)',
      password: 'hashed_password_sofia',
      role: Role.PRO,
      children: {
        create: [
          {
            name: 'Martina',
            surname: 'Navarro',
            birthDate: new Date('2025-02-10T08:00:00Z'),
            bloodGroup: 'A+',
            sex: Sex.FEMALE,
          },
        ],
      },
    },
  });
  console.log(`Usuario PRO de prueba: Sofía (id ${sofia.id})`);

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

  // Hilo largo con muchas respuestas, anidadas y con likes, para probar el resumen con IA.
  // Mezcla consejos prácticos, experiencias y desacuerdos (despedirse o "escaparse"),
  // para comprobar que el resumen recoge los puntos clave y no solo repite los mensajes.
  const hiloGuarderia = await prisma.thread.create({
    data: {
      title: 'Empezamos la guardería en septiembre: adaptación, llantos y virus. ¿Cómo lo habéis vivido?',
      content:
        'Martina tiene 19 meses y en septiembre empieza la guardería por primera vez. Yo vuelvo a trabajar a jornada completa y estoy muy nerviosa: ' +
        'me han dicho que la adaptación puede durar semanas, que se ponen malos cada dos por tres y que lloran muchísimo al dejarlos. ' +
        '¿Cómo fue la adaptación de vuestros peques? ¿Qué os ayudó? ¿Os despedíais o os ibais sin que os vieran? ' +
        'Y lo de los virus, ¿cómo lo organizasteis con el trabajo? Cualquier consejo es bienvenido.',
      ownerId: sofia.id,
      tags: { connect: [{ id: tagDesarrollo.id }, { id: tagSalud.id }] },
    },
  });

  // Crea una respuesta del hilo de la guardería. likesCount siempre igual al nº de filas en MessageLike
  const responderGuarderia = (
    autor: { id: number },
    content: string,
    opciones: { respondeA?: { id: number }; likes?: { id: number }[] } = {},
  ) =>
    prisma.message.create({
      data: {
        content,
        authorId: autor.id,
        threadId: hiloGuarderia.id,
        parentId: opciones.respondeA?.id,
        likesCount: opciones.likes?.length ?? 0,
        likes: opciones.likes?.length ? { create: opciones.likes.map((u) => ({ userId: u.id })) } : undefined,
      },
    });

  const gAdaptacion = await responderGuarderia(
    elena,
    'Como pediatra y madre: la adaptación progresiva es clave. Lo ideal es empezar con 1 hora los primeros días, luego hasta antes de comer, después con comida ' +
      'y por último con siesta. Suele llevar entre 2 y 3 semanas, aunque cada niño va a su ritmo. Si podéis, evitad que coincida con vuestra vuelta al trabajo.',
    { likes: [sofia, laura, carlos, marta] },
  );
  await responderGuarderia(
    sofia,
    'Gracias Elena. El problema es que me incorporo el 1 de septiembre y la guarde empieza ese mismo día... ¿Alguna idea para cuadrarlo?',
    { respondeA: gAdaptacion },
  );
  await responderGuarderia(
    marta,
    'Nosotros lo cuadramos con los abuelos: la primera semana la recogían ellos a mediodía. Si no tenéis abuelos cerca, mira si en tu empresa ' +
      'puedes pedir unos días de vacaciones o reducción de jornada solo para esas semanas.',
    { respondeA: gAdaptacion, likes: [sofia] },
  );

  const gDespedida = await responderGuarderia(
    laura,
    'Un consejo que nos dieron las educadoras y funcionó: despedíos SIEMPRE, aunque llore. Una despedida corta, con la misma frase cada día ' +
      '("mamá vuelve después de la siesta") y os vais sin alargarlo. Si te escapas sin que te vea, al principio llora menos, pero luego le cuesta más fiarse.',
    { likes: [elena, marta, sofia] },
  );
  const gEscaparse = await responderGuarderia(
    carlos,
    'Pues yo no estoy de acuerdo del todo. Con nuestro hijo mayor, despedirnos era un drama de 20 minutos en la puerta. El día que nos fuimos mientras jugaba, ' +
      'la educadora nos dijo que a los 2 minutos estaba tan tranquila. A cada niño le va una cosa.',
    { respondeA: gDespedida, likes: [] },
  );
  await responderGuarderia(
    elena,
    'Lo que cuentas es muy habitual, Carlos, pero en general recomendamos la despedida breve: si el niño descubre que desapareces sin avisar, ' +
      'muchas veces se vuelve más pegajoso también en casa. Que sea corta es lo importante, no que no exista.',
    { respondeA: gEscaparse, likes: [laura, marta] },
  );

  await responderGuarderia(
    marta,
    'Lo del objeto de apego nos salvó: Lucía llevaba su conejito de trapo y una foto nuestra plastificada en la mochila. ' +
      'Preguntad antes en la guarde si lo permiten, en algunas no dejan juguetes de casa.',
    { likes: [sofia, laura] },
  );

  const gVirus = await responderGuarderia(
    laura,
    'Sobre los virus: prepárate, el primer año es una cadena. Leo estuvo malo prácticamente un fin de semana sí y otro también: mocos, otitis, gastroenteritis, ' +
      'mano-pie-boca... A partir del segundo año mejora mucho.',
    { likes: [carlos, marta, sofia] },
  );
  await responderGuarderia(
    elena,
    'Es normal que tengan entre 8 y 12 infecciones leves el primer año de guardería: su sistema inmune se está entrenando. ' +
      'Llevad el calendario vacunal al día. Id al pediatra si la fiebre dura más de 3 días, si le cuesta respirar, si está muy decaído o no quiere beber.',
    { respondeA: gVirus, likes: [laura, sofia, marta, carlos] },
  );
  await responderGuarderia(
    carlos,
    'Y tened un plan B para los días que no puede ir: nosotros nos repartimos los días de baja entre los dos y tiramos de una canguro de confianza.',
    { respondeA: gVirus, likes: [sofia] },
  );

  await responderGuarderia(
    marta,
    'Otra cosa que nadie me avisó: los primeros días pueden dormir peor y estar más irritables en casa por la tarde. Es el cansancio y la tensión acumulada. ' +
      'Nosotros adelantamos la hora de dormir media hora y mucho mimo.',
    { likes: [laura, sofia] },
  );
  await responderGuarderia(
    laura,
    'Muy práctico: marcad TODO con el nombre (ropa, chupetes, biberones, mudas). Y dejad siempre dos mudas completas de recambio en la mochila.',
    { likes: [sofia] },
  );
  await responderGuarderia(
    carlos,
    'Hablad mucho con las educadoras. Nosotros usábamos la agenda/app de la guarde para saber qué había comido, cuánto había dormido y si había hecho caca. ' +
      'Te quedas mucho más tranquila.',
    { likes: [marta] },
  );

  const gComida = await responderGuarderia(
    sofia,
    '¿Y la comida? Martina en casa come bien pero es muy selectiva con las texturas. Me da miedo que no coma nada allí.',
  );
  await responderGuarderia(
    elena,
    'Es frecuente que las primeras semanas coman menos fuera de casa. Mientras en casa compense y gane peso con normalidad no hay que preocuparse. ' +
      'Avisad a la guarde de sus preferencias y de cualquier alergia por escrito.',
    { respondeA: gComida, likes: [sofia, laura] },
  );
  await responderGuarderia(
    marta,
    'A Lucía le pasaba igual y al mes comía de todo por imitación de los otros niños. Ver a los demás comer ayuda muchísimo.',
    { respondeA: gComida, likes: [sofia] },
  );

  await responderGuarderia(
    carlos,
    'Ojo con las regresiones: nuestro mayor, que ya casi no usaba pañal, volvió atrás las primeras semanas. También hubo más despertares nocturnos. ' +
      'Al mes y medio todo volvió a la normalidad.',
    { likes: [laura] },
  );
  await responderGuarderia(
    laura,
    'Y lo más importante: cuidad también vuestras emociones. Los niños notan muchísimo nuestros nervios. Yo lloraba más que Leo la primera semana 😅',
    { likes: [sofia, marta, carlos, elena] },
  );
  await responderGuarderia(
    sofia,
    'Muchísimas gracias a todas y todos. Me apunto: adaptación progresiva, despedida corta, objeto de apego, plan B para los virus y paciencia. Os cuento cómo va.',
    { likes: [laura, marta] },
  );

  // Hilo eliminado por el administrador (borrado lógico: sigue en la BD para auditoría)
  await prisma.thread.create({
    data: {
      title: 'Vendo leche de fórmula sin abrir, escribidme por privado',
      content: 'Tengo varios botes que no he usado, los vendo baratos.',
      ownerId: laura.id,
      deletedAt: new Date('2026-11-03T10:00:00Z'),
      tags: { connect: [{ id: tagNutricion.id }] },
    },
  });

  // Hilo de un usuario bloqueado: se oculta del público aunque el hilo en sí no esté eliminado
  await prisma.thread.create({
    data: {
      title: '¡Gana dinero desde casa mientras cuidas a tu bebé!',
      content: 'Entra en mi web y descubre cómo ganar 3000€ al mes sin salir de casa.',
      ownerId: usuarioBloqueado.id,
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

  // ------------------------------------------------------
  // 8. RECOMENDACIONES FINALES
  // ------------------------------------------------------
  await prisma.recipe.createMany({
    data: [
      // ----------------------------------------------------
      // EDAD: 1 AÑO (10 recetas)
      // ----------------------------------------------------
      {
        name: 'Puré suave de calabaza, zanahoria y pollo',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 1,
        imageUrl: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '150g de calabaza pelada',
          '1 zanahoria mediana',
          '1/2 patata pequeña',
          '50g de pechuga de pollo',
          '1 cucharadita de aceite de oliva virgen extra',
        ],
        steps: [
          'Pela y corta en dados pequeños las verduras.',
          'Cocina en agua justa durante 15 minutos a fuego medio.',
          'Añade el pollo troceado y cocina 5 minutos más hasta que esté tierno.',
          'Tritura todo con la batidora hasta textura suave y añade el aceite en crudo.',
        ],
      },
      {
        name: 'Tortitas de avena y plátano (BLW)',
        time: '15 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones (4 tortitas)',
        ageFor: 1,
        imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 plátano maduro',
          '1 huevo mediano',
          '4 cucharadas de copos de avena triturados',
          'Unas gotas de aceite de oliva para la sartén',
        ],
        steps: [
          'Chafa el plátano con un tenedor hasta formar una papilla.',
          'Bate el huevo y mézclalo con el plátano y la avena hasta integrar.',
          'Engrasa una sartén antiadherente a fuego medio-bajo.',
          'Vierte cucharadas de masa y cocina 2 minutos por lado hasta dorar.',
        ],
      },
      {
        name: 'Hamburguesitas tiernas de merluza y calabacín',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 1,
        imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '120g de lomo de merluza sin espinas ni piel',
          '1/2 calabacín pequeño rallado',
          '2 cucharadas de pan rallado suave o avena',
          '1 cucharadita de aceite de oliva virgen extra',
        ],
        steps: [
          'Pica la merluza muy fina con un cuchillo o picadora.',
          'Escurre el calabacín rallado con papel absorbente para quitar agua.',
          'Mezcla el pescado, el calabacín y el pan rallado formando mini hamburguesas.',
          'Cocina en sartén antiadherente con una gota de aceite 3 minutos por lado.',
        ],
      },
      {
        name: 'Crema suave de lentejas rojas y boniato',
        time: '30 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 3 raciones',
        ageFor: 1,
        imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '60g de lentejas rojas peladas (sin remojo)',
          '1/2 boniato pequeño pelado',
          '1/2 puerro (solo la parte blanca)',
          '1 cucharadita de aceite de oliva virgen extra',
        ],
        steps: [
          'Lava las lentejas rojas y trocea el boniato y el puerro.',
          'Coloca todo en una cazuela cubierto con 3 veces su volumen de agua.',
          'Cocina a fuego medio durante 20 minutos hasta que el boniato esté blando.',
          'Tritura hasta lograr una crema fina y digestiva. Añade aceite antes de servir.',
        ],
      },
      {
        name: 'Bastoncitos de boniato y manzana al vapor (BLW)',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 1,
        imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 boniato mediano',
          '1 manzana dulce (tipo Golden o Fuji)',
          '1 pizca de canela de Ceylán',
        ],
        steps: [
          'Pela el boniato y la manzana y córtalos en tiras del grosor de un dedo adulto.',
          'Cocina al vapor durante 12-15 minutos.',
          'Comprueba que estén tiernos al chafarlos entre los dedos sin romperse solos.',
          'Espolvorea una pizca de canela y deja templar antes de ofrecer al bebé.',
        ],
      },
      {
        name: 'Papilla tibia de avena, pera y canela',
        time: '10 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 1 ración',
        ageFor: 1,
        imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '3 cucharadas de copos de avena suaves',
          '150ml de agua o leche habitual del bebé',
          '1/2 pera madura rallada',
          '1 pizca de canela de Ceylán',
        ],
        steps: [
          'Pon la avena y el líquido en un cazo pequeño a fuego medio.',
          'Remueve constantemente durante 5 minutos hasta que espese con textura papilla.',
          'Retira del fuego y mezcla con la pera rallada y la pizca de canela.',
          'Deja templar antes de servir con cuchara.',
        ],
      },
      {
        name: 'Arroz meloso con pavo y guisantes tiernos',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 1,
        imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '50g de arroz redondo',
          '60g de solomillo de pavo picado',
          '2 cucharadas de guisantes tiernos (frescos o congelados)',
          '1/2 tomate maduro rallado (sin piel ni semillas)',
          '1 cucharadita de aceite de oliva',
        ],
        steps: [
          'Rehoga el tomate rallado en un cazo con el aceite durante 2 minutos.',
          'Añade el pavo troceado muy fino y los guisantes.',
          'Incorpora el arroz y cubre con 3 partes de agua o caldo suave casero.',
          'Cocina 18 minutos hasta que el arroz quede bien blando y meloso.',
        ],
      },
      {
        name: 'Albondiguillas tiernas de ternera y zanahoria',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 1,
        imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '100g de carne picada de ternera de calidad',
          '1 zanahoria pequeña cocida y machacada',
          '1 cucharada de harina de avena o pan rallado',
          '1 cucharadita de aceite de oliva',
        ],
        steps: [
          'Mezcla la carne con la zanahoria machacada y la avena hasta formar una masa homogénea.',
          'Forma bolitas pequeñas y manejables para las manitas del bebé.',
          'Cocina al vapor o en sartén tapada con unas gotas de aceite durante 8 minutos a fuego suave.',
          'Verifica que el interior quede completamente cocinado y tierno.',
        ],
      },
      {
        name: 'Muffins blandos de manzana y zanahoria (sin azúcar)',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 4 mini muffins',
        ageFor: 1,
        imageUrl: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 huevo',
          '1/2 manzana dulce rallada',
          '1/2 zanahoria fina rallada',
          '4 cucharadas de harina de avena',
          '1 cucharadita de levadura química',
        ],
        steps: [
          'Precalienta el horno a 180°C.',
          'Bate el huevo en un bol y añade la manzana y la zanahoria ralladas.',
          'Agrega la avena y la levadura mezclando bien.',
          'Reparte en moldes de silicona y hornea durante 15 minutos hasta que queden esponjosos.',
        ],
      },
      {
        name: 'Sopa de estrellitas con pollo desmigado',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 1,
        imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '40g de pasta mini (estrellitas o fideos cabellín)',
          '250ml de caldo casero de verduras sin sal',
          '40g de pechuga de pollo cocida y desmigada muy fina',
          '1 cucharadita de aceite de oliva',
        ],
        steps: [
          'Lleva el caldo casero a ebullición en un cazo.',
          'Añade la pasta mini y cocina el tiempo indicado en el envase hasta que esté muy tierna.',
          'Agrega el pollo desmigado y cocina 1 minuto más para que se impregne del sabor.',
          'Sirve tibio con unas gotitas de aceite de oliva virgen extra.',
        ],
      },

      // ----------------------------------------------------
      // EDAD: 2 AÑOS (10 recetas)
      // ----------------------------------------------------
      {
        name: 'Macarrones con salsa cremosa de coliflor y queso',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 2,
        imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281292?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '80g de macarrones o plumas',
          '150g de coliflor cocida',
          '50ml de leche entera o vegetal',
          '2 cucharadas de queso rallado suave (mozzarella o gouda)',
          '1 pizca de nuez moscada (opcional)',
        ],
        steps: [
          'Cuece la pasta en agua hirviendo según el tiempo del fabricante.',
          'Tritura la coliflor cocida con la leche y el queso hasta lograr una salsa sedosa tipo bechamel.',
          'Escurre la pasta y mézclala bien caliente con la salsa de coliflor.',
          'Sirve con una pizca de queso extra por encima.',
        ],
      },
      {
        name: 'Nuggets caseros de pollo y brócoli al horno',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 3 raciones',
        ageFor: 2,
        imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '200g de pechuga de pollo picada',
          '80g de floretes de brócoli cocidos y picaditos',
          '1 huevo batido',
          '3 cucharadas de pan rallado o copos de maíz triturados',
          '1 pizca de sal marina',
        ],
        steps: [
          'Precalienta el horno a 200°C con calor arriba y abajo.',
          'Mezcla en un bol el pollo picado, el brócoli y una pizca de sal.',
          'Forma pequeñas porciones con las manos, pásalas por huevo batido y rebózalas en el pan rallado.',
          'Hornea en bandeja con papel sulfurizado durante 15 minutos dándoles la vuelta a mitad de tiempo.',
        ],
      },
      {
        name: 'Tortilla francesa rollito con espinacas y queso',
        time: '10 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 1 ración',
        ageFor: 2,
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 huevos medianos',
          '1 puñado pequeño de espinacas tiernas picadas',
          '1 loncha de queso tierno o mozzarella',
          '1 cucharadita de aceite de oliva',
        ],
        steps: [
          'Saltea las espinacas picadas en una sartén antiadherente durante 1 minuto con una gota de aceite.',
          'Bate los huevos y viértelos sobre las espinacas en la sartén a fuego medio.',
          'Coloca la loncha de queso en el centro y enrolla la tortilla sobre sí misma.',
          'Corta en rodajitas divertidas tipo sushi para comer con las manos o tenedor.',
        ],
      },
      {
        name: 'Crema de calabacín con picatostes dorados',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 2,
        imageUrl: 'https://images.unsplash.com/photo-1607528971899-2e89e6c0ec69?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 calabacín mediano',
          '1/2 puerro',
          '1 patata pequeña',
          '2 quesitos suaves o 1 cucharada de queso crema',
          '1 rebanada de pan del día anterior',
        ],
        steps: [
          'Trocea el calabacín, el puerro y la patata y cuécelos con agua justa 15 minutos.',
          'Corta el pan en daditos y tuéstalo en una sartén con unas gotas de aceite hasta que esté crujiente.',
          'Tritura las verduras con los quesitos hasta obtener una crema muy fina.',
          'Sirve en cuencos con los picatostes por encima.',
        ],
      },
      {
        name: 'Mini hamburguesas de salmón y patata',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 2,
        imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '150g de lomo de salmón fresco sin piel ni espinas',
          '1 patata pequeña cocida',
          '1 ramita de eneldo fresco picado (opcional)',
          '1 cucharadita de aceite de oliva',
        ],
        steps: [
          'Chafa la patata cocida con un tenedor hasta hacerla puré.',
          'Pica el salmón finamente a cuchillo y mézclalo con la patata y el eneldo.',
          'Forma mini hamburguesas compactas.',
          'Cocina a la plancha a fuego medio durante 3 minutos por cada lado.',
        ],
      },
      {
        name: 'Guiso suave de garbanzos con calabaza y zanahoria',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 2,
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '150g de garbanzos cocidos lavados y escurridos',
          '100g de calabaza en dados pequeños',
          '1 zanahoria en rodajas finas',
          '200ml de caldo de verduras casero',
          '1 cucharada de aceite de oliva',
        ],
        steps: [
          'Rehoga la calabaza y la zanahoria en una cazuela con el aceite durante 3 minutos.',
          'Añade el caldo y deja cocer 12 minutos hasta que la verdura esté muy blanda.',
          'Agrega los garbanzos cocidos y chafa ligeramente una parte con el tenedor para espesar el caldo.',
          'Cocina todo junto 5 minutos más y deja templar.',
        ],
      },
      {
        name: 'Arroz con verduras arcoíris y daditos de pavo',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 2,
        imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '80g de arroz',
          '80g de pechuga de pavo en daditos',
          '1/4 pimiento rojo en cubitos',
          '1/2 calabacín en cubitos',
          '2 cucharadas de maíz dulce',
        ],
        steps: [
          'Cuece el arroz en agua con una pizca de sal y escurre.',
          'En una sartén saltea los daditos de pavo hasta que estén dorados y retira.',
          'Saltea el pimiento y el calabacín durante 5 minutos a fuego medio.',
          'Junta el arroz, el pavo, las verduras y el maíz mezclando todo de forma colorida.',
        ],
      },
      {
        name: 'Barquitas de calabacín rellenas de ternera y tomate',
        time: '30 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 2 raciones',
        ageFor: 2,
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 calabacín mediano',
          '100g de carne picada de ternera',
          '3 cucharadas de salsa de tomate casera',
          '2 cucharadas de queso mozzarella rallado',
        ],
        steps: [
          'Corta el calabacín longitudinalmente por la mitad y saca la pulpa con una cuchara.',
          'Hierve las barquitas 5 minutos en agua con sal.',
          'Saltea la pulpa picada con la carne y la salsa de tomate.',
          'Rellena las barquitas, cubre con queso y gratina en el horno 10 minutos a 190°C.',
        ],
      },
      {
        name: 'Compota tibia de manzana, pera y pasas',
        time: '15 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 2,
        imageUrl: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 manzana dulce pelada y troceada',
          '1 pera madura pelada y troceada',
          '1 cucharada de uvas pasas sin hueso',
          '1 ramita de canela',
          '3 cucharadas de agua',
        ],
        steps: [
          'Coloca la fruta, las pasas, el agua y la canela en un cazo pequeño.',
          'Tapa y cocina a fuego bajo durante 12 minutos hasta que la fruta esté tierna.',
          'Retira la rama de canela y aplasta ligeramente con un tenedor.',
          'Sirve como postre o merienda tibia o fría.',
        ],
      },
      {
        name: 'Croquetas caseras de merluza al horno',
        time: '35 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 3 raciones (8 croquetas)',
        ageFor: 2,
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '150g de merluza cocida y desmigada',
          '25g de mantequilla',
          '25g de harina de trigo',
          '200ml de leche templada',
          '1 huevo y pan rallado para rebozar',
        ],
        steps: [
          'Derrite la mantequilla, añade la harina y cocina 1 minuto sin quemar.',
          'Agrega la leche poco a poco sin dejar de remover con varillas hasta espesar.',
          'Incorpora la merluza desmigada y deja enfriar la masa tapada en la nevera.',
          'Forma croquetas, pásalas por huevo y pan rallado y hornea a 200°C 15 minutos.',
        ],
      },

      // ----------------------------------------------------
      // EDAD: 3 AÑOS (10 recetas)
      // ----------------------------------------------------
      {
        name: 'Espaguetis con albóndigas caseras de pollo y tomate',
        time: '30 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 3,
        imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '100g de espaguetis',
          '150g de carne picada de pollo',
          '1 huevo pequeño',
          '2 cucharadas de pan rallado',
          '150g de salsa de tomate natural casera',
          'Queso parmesano rallado',
        ],
        steps: [
          'Mezcla el pollo con el huevo y el pan rallado, forma bolitas pequeñas.',
          'Dora las albóndigas en una sartén con aceite y añade la salsa de tomate.',
          'Tapa y deja hacer chup-chup 10 minutos a fuego suave.',
          'Cuece los espaguetis, mézclalos con la salsa y decora con queso rallado.',
        ],
      },
      {
        name: 'Pizza casera con base de avena, jamón y queso',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 3,
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 huevo',
          '4 cucharadas de harina de avena',
          '3 cucharadas de leche',
          '2 cucharadas de tomate frito casero',
          '2 lonchas de jamón cocido cortado en trozos',
          '50g de queso mozzarella rallado',
          '1 pizca de orégano',
        ],
        steps: [
          'Bate el huevo con la avena y la leche hasta formar una masa líquida espesa.',
          'Vierte en una sartén engrasada y cocina a fuego bajo con tapa 3 minutos hasta cuajar la base.',
          'Dale la vuelta, unta con tomate, añade el jamón, la mozzarella y el orégano.',
          'Tapa la sartén 3 minutos más hasta que el queso se funda por completo.',
        ],
      },
      {
        name: 'Risotto cremoso de calabaza y queso suave',
        time: '30 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 2 raciones',
        ageFor: 3,
        imageUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '80g de arroz tipo arborio o redondo',
          '120g de calabaza rallada o en cubitos muy finos',
          '1/2 cebolla dulce picadita',
          '300ml de caldo de verduras caliente',
          '20g de queso parmesano rallado',
          '1 cucharada de mantequilla',
        ],
        steps: [
          'Sofríe la cebolla y la calabaza en una cazuela con un hilo de aceite.',
          'Añade el arroz y remueve 1 minuto para nacararlo.',
          'Ve vertiendo el caldo caliente cazo a cazo removiendo constantemente durante 18 minutos.',
          'Apaga el fuego, añade la mantequilla y el parmesano, manteca bien y sirve cremoso.',
        ],
      },
      {
        name: 'Lasaña suave de verduras y pavo',
        time: '35 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 3 raciones',
        ageFor: 3,
        imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '6 placas de lasaña precocidas',
          '150g de carne picada de pavo',
          '1 calabacín pequeño en daditos',
          '1 zanahoria rallada',
          '150ml de bechamel suave',
          '40g de queso rallado',
        ],
        steps: [
          'Sofríe la carne con el calabacín y la zanahoria hasta que estén bien tiernos.',
          'En una fuente pequeña de horno monta capas: placa, relleno de carne, placa y bechamel.',
          'Termina con bechamel y queso rallado por encima.',
          'Hornea a 190°C durante 20 minutos hasta que quede dorada y burbujeante.',
        ],
      },
      {
        name: 'Varitas crujientes de merluza con costra de maíz',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 3,
        imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '200g de lomos de merluza sin espinas cortados en tiras',
          '1 huevo batido',
          '40g de copos de maíz tostados (sin azúcar) machacados',
          '1 pizca de sal',
        ],
        steps: [
          'Precalienta el horno a 200°C.',
          'Seca las tiras de merluza y sazona con una pizca de sal.',
          'Pasa cada varita por el huevo batido y rebózala bien en los copos de maíz triturados.',
          'Coloca en bandeja de horno con papel y hornea 12 minutos hasta que estén súper crujientes.',
        ],
      },
      {
        name: 'Lentejas estofadas con verduras en trocitos',
        time: '35 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 3 raciones',
        ageFor: 3,
        imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '100g de lentejas pardinas',
          '1 zanahoria cortada en rodajas',
          '1 patata cortada en dados',
          '1/2 puerro picado',
          '1 cucharadita de pimentón dulce',
          '1 cucharada de aceite de oliva',
        ],
        steps: [
          'Pon las lentejas y todas las verduras en una olla cubiertas de agua fría.',
          'Añade el aceite y el pimentón dulce.',
          'Cocina a fuego medio durante 30 minutos hasta que las lentejas y verduras estén tiernas.',
          'Chafa un par de cucharadas para espesar el caldo y deja reposar antes de servir.',
        ],
      },
      {
        name: 'Tacos blandos de pollo con aguacate y queso',
        time: '15 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 3,
        imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 tortillas pequeñas de trigo o maíz',
          '120g de pechuga de pollo cocida y desmechada',
          '1/2 aguacate maduro en láminas o machacado',
          '40g de queso tierno rallado',
          '1/2 tomate picadito sin semillas',
        ],
        steps: [
          'Calienta las tortillas en una sartén 30 segundos por lado para que queden flexibles.',
          'Unta el aguacate en la base de la tortilla.',
          'Rellena con el pollo desmechado, el tomate y el queso.',
          'Dobla por la mitad y sirve listo para comer con las manos.',
        ],
      },
      {
        name: 'Pastel salado de atún y verduras al microondas',
        time: '15 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 3,
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 latas de atún al natural escurrido',
          '2 huevos medianos',
          '2 cucharadas de salsa de tomate casera',
          '3 cucharadas de leche',
          '2 cucharadas de guisantes cocidos',
        ],
        steps: [
          'Bate los huevos en un bol con la leche y el tomate.',
          'Añade el atún desmigado y los guisantes mezclando bien.',
          'Vierte en un molde apto para microondas.',
          'Cocina a máxima potencia durante 6-7 minutos hasta que cuaje. Deja templar y desmolda.',
        ],
      },
      {
        name: 'Brochetas divertidas de frutas con dip de yogur',
        time: '10 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 3,
        imageUrl: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '4 fresas limpias cortadas por la mitad',
          '1 plátano en rodajas gruesas',
          '1 rodaja de melón o sandía en cubos',
          '1 yogur griego natural sin azúcar',
          '1 cucharadita de miel (opcional)',
        ],
        steps: [
          'Inserta las frutas alternando colores en palitos de brocheta con punta recortada.',
          'Mezcla el yogur griego con la cucharadita de miel en un cuenco pequeño.',
          'Sirve las brochetas para que el niño moje la fruta en el dip de yogur.',
        ],
      },
      {
        name: 'Empanadillas al horno de espinacas, queso y maíz',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones (4 empanadillas)',
        ageFor: 3,
        imageUrl: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '4 obleas de empanadilla',
          '80g de espinacas cocidas y bien escurridas',
          '40g de queso tierno o requesón',
          '2 cucharadas de maíz dulce',
          '1 huevo batido para pintar',
        ],
        steps: [
          'Precalienta el horno a 190°C.',
          'Mezcla las espinacas picadas con el queso y el maíz.',
          'Coloca una cucharada de relleno en el centro de cada oblea y cierra sellando los bordes con un tenedor.',
          'Pinta con huevo batido y hornea 12 minutos hasta que estén doradas.',
        ],
      },

      // ----------------------------------------------------
      // EDAD: 4 AÑOS (10 recetas)
      // ----------------------------------------------------
      {
        name: 'Fajitas suaves de pavo con pimientos y aguacate',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 4,
        imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 tortillas de trigo integral',
          '150g de pechuga de pavo en tiras',
          '1/2 pimiento rojo en tiras',
          '1/2 cebolla dulce en juliana',
          '1/2 aguacate en dados',
          '1 cucharada de aceite de oliva',
        ],
        steps: [
          'Saltea el pavo con el pimiento y la cebolla en una sartén con aceite hasta que estén dorados y tiernos.',
          'Calienta las tortillas de trigo en la sartén o microondas.',
          'Rellena las tortillas con el salteado y añade el aguacate fresco.',
          'Enrolla y corta en mitades para facilitar el agarre.',
        ],
      },
      {
        name: 'Salmón al horno glaseado con naranja y patatas',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 4,
        imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 lomos de salmón fresco sin espinas',
          'Zumo de 1 naranja dulce',
          '1 cucharadita de miel',
          '1 patata grande en rodajas finas',
          '1 cucharada de aceite de oliva',
        ],
        steps: [
          'Coloca las rodajas de patata en una bandeja de horno con aceite y hornea 15 minutos a 190°C.',
          'Mezcla el zumo de naranja con la cucharadita de miel.',
          'Coloca los lomos de salmón sobre las patatas y riega con la salsa de naranja.',
          'Hornea todo junto 10 minutos más hasta que el salmón esté jugoso.',
        ],
      },
      {
        name: 'Crema de zanahoria asada con semillas de calabaza',
        time: '30 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 3 raciones',
        ageFor: 4,
        imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '4 zanahorias grandes',
          '1 patata mediana',
          '1/2 cebolla',
          '300ml de caldo de verduras',
          '1 cucharada de semillas de calabaza peladas',
          '2 cucharadas de aceite de oliva',
        ],
        steps: [
          'Asa las zanahorias, patata y cebolla cortadas en el horno a 200°C durante 20 minutos para intensificar su dulzor.',
          'Pasa las verduras asadas a una olla con el caldo y hierve 5 minutos.',
          'Tritura hasta lograr una crema muy suave y sedosa.',
          'Sirve en boles con las semillas de calabaza ligeramente tostadas por encima.',
        ],
      },
      {
        name: 'Hamburguesa casera de ternera con pan brioche',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 4,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 mini panes brioche para hamburguesa',
          '200g de carne picada de ternera magra',
          '2 lonchas de queso cheddar o gouda',
          '2 hojas de lechuga tierna',
          '2 rodajas finas de tomate',
        ],
        steps: [
          'Forma dos discos de carne y cocínalos en plancha caliente 3 minutos por lado.',
          'Coloca el queso encima en el último minuto de cocción para que se funda.',
          'Tuesta ligeramente el pan brioche.',
          'Monta la hamburguesa con la lechuga, el tomate, la carne con queso y tapa.',
        ],
      },
      {
        name: 'Wok suave de fideos de arroz con pollo y verduras',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 4,
        imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '80g de fideos de arroz',
          '120g de pechuga de pollo en tiritas',
          '1/2 calabacín en bastoncitos',
          '1 zanahoria en juliana fina',
          '1 cucharada de salsa de soja baja en sal',
          '1 cucharada de aceite de sésamo o de oliva',
        ],
        steps: [
          'Hidrata los fideos de arroz en agua caliente según las instrucciones del paquete.',
          'En sartén o wok saltea el pollo a fuego vivo con el aceite 3 minutos.',
          'Añade las verduras y saltea 4 minutos manteniendo un punto crujiente pero tierno.',
          'Agrega los fideos escurridos y la cucharada de soja, saltea 1 minuto todo junto.',
        ],
      },
      {
        name: 'Pechuga de pollo rellena de jamón cocido y queso',
        time: '25 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 2 raciones',
        ageFor: 4,
        imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 pechugas de pollo abiertas en libro',
          '2 lonchas de jamón cocido',
          '2 lonchas de queso havarti o mozzarella',
          '1 cucharada de aceite de oliva',
          '1 pizca de sal y pimienta dulce',
        ],
        steps: [
          'Abre las pechugas y rellénalas con el jamón y el queso.',
          'Cierra en forma de paquetito fijando los extremos con un palillo de madera.',
          'Dora las pechugas en sartén por todos lados.',
          'Tapa y deja cocinar 10 minutos a fuego bajo para que se cocine por dentro y el queso funda.',
        ],
      },
      {
        name: 'Arroz tres delicias casero con tortilla y guisantes',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 4,
        imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '100g de arroz largo o basmati cocido',
          '1 huevo batido (para hacer tortilla francesa fina en tiras)',
          '50g de jamón cocido en daditos',
          '3 cucharadas de guisantes cocidos',
          '1 zanahoria cocida en daditos',
        ],
        steps: [
          'Haz una tortilla francesa muy fina en una sartén y córtala en tiritas pequeñas.',
          'En la misma sartén con unas gotas de aceite saltea el jamón, la zanahoria y los guisantes 2 minutos.',
          'Añade el arroz cocido y las tiras de tortilla.',
          'Saltea todo junto un par de minutos a fuego medio y sirve templado.',
        ],
      },
      {
        name: 'Merluza en papillote con verduritas juliana',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 4,
        imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 filetes de merluza fresca sin espinas',
          '1/2 calabacín en tiras finas',
          '1 zanahoria en tiras finas',
          '2 cucharaditas de aceite de oliva',
          'Papel vegetal de horno',
        ],
        steps: [
          'Precalienta el horno a 200°C.',
          'Coloca en el centro de una hoja de papel vegetal una cama de verduritas.',
          'Pon el pescado encima, añade unas gotas de aceite y una pizca de sal.',
          'Cierra el paquete doblando bien los bordes para crear un sobre hermético.',
          'Hornea durante 12-14 minutos. Al abrir saldrá un pescado jugosísimo con sus verduras.',
        ],
      },
      {
        name: 'Tortitas verdes de espinacas y queso feta',
        time: '15 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones (4 tortitas)',
        ageFor: 4,
        imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 taza de hojas de espinacas frescas',
          '1 huevo',
          '4 cucharadas de harina de avena',
          '30g de queso feta o fresco desmigado',
          '4 cucharadas de leche',
        ],
        steps: [
          'Tritura las espinacas con el huevo, la leche y la avena en la batidora hasta obtener una masa verde brillante.',
          'Añade el queso desmigado con una cuchara.',
          'Cocina en sartén caliente engrasada 2 minutos por lado.',
          'Sirve estas divertidas "tortitas de Hulk" como cena rápida y saludable.',
        ],
      },
      {
        name: 'Galletas caseras de avena, plátano y cacao puro',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 6 galletas',
        ageFor: 4,
        imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 plátanos muy maduros',
          '1 taza de copos de avena',
          '1 cucharadita de cacao puro en polvo sin azúcar',
          '1 cucharadita de semillas de chía (opcional)',
        ],
        steps: [
          'Chafa los plátanos en un bol con el tenedor hasta hacer puré.',
          'Añade la avena y el cacao mezclando hasta formar una masa compacta.',
          'Forma bolitas con las manos, aplástalas en la bandeja de horno sobre papel.',
          'Hornea a 180°C durante 15 minutos hasta que estén firmes por fuera y tiernas dentro.',
        ],
      },

      // ----------------------------------------------------
      // EDAD: 5 AÑOS (10 recetas)
      // ----------------------------------------------------
      {
        name: 'Pollo al curry suave con leche de coco y arroz',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 5,
        imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '180g de pechuga de pollo en dados',
          '150ml de leche de coco suave',
          '1/2 cucharadita de curry dulce suave (sin picante)',
          '1/2 calabacín en dados',
          '80g de arroz basmati cocido',
        ],
        steps: [
          'Dora el pollo en una sartén con aceite durante 4 minutos.',
          'Añade el calabacín y el curry suave removiendo 1 minuto para liberar aromas.',
          'Vierte la leche de coco y deja reducir a fuego medio-bajo durante 8 minutos.',
          'Sirve caliente sobre una base de arroz basmati.',
        ],
      },
      {
        name: 'Canelones caseros de pollo asado y espinacas',
        time: '35 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 2 raciones (4 canelones)',
        ageFor: 5,
        imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '4 placas de canelón cocidas',
          '120g de pollo asado desmigado',
          '50g de espinacas cocidas',
          '150ml de bechamel casera',
          '30g de queso rallado para gratinar',
        ],
        steps: [
          'Pica el pollo y las espinacas y mézclalos con dos cucharadas de bechamel.',
          'Rellena las placas de canelón y enróllalas con cuidado.',
          'Coloca en una fuente apta para horno y cubre con el resto de bechamel y queso.',
          'Gratina a 200°C durante 12 minutos hasta dorar la superficie.',
        ],
      },
      {
        name: 'Ensalada templada de pasta con atún, maíz y cherrys',
        time: '15 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 5,
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '90g de hélices o lazos tricolores',
          '1 lata de atún en aceite de oliva escurrido',
          '6 tomates cherry cortados en cuartos',
          '3 cucharadas de maíz dulce',
          '50g de bolitas de queso mozzarella fresca',
        ],
        steps: [
          'Cuece la pasta al dente y enfría ligeramente bajo agua tibia.',
          'En un bol grande mezcla el atún desmigado, los cherrys, el maíz y la mozzarella.',
          'Añade la pasta, un hilo de aceite de oliva virgen extra y una pizca de orégano.',
          'Remueve y sirve como plato único fresco y completo.',
        ],
      },
      {
        name: 'Dorada al horno sobre cama de patatas panadera',
        time: '30 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 5,
        imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 filetes limpios de dorada sin espinas',
          '1 patata grande en rodajas finas',
          '1/2 cebolla dulce en aros finos',
          '2 cucharadas de aceite de oliva',
          '1/2 vasito de caldo de pescado o agua',
        ],
        steps: [
          'Dispón las patatas y la cebolla en una bandeja con aceite y caldo.',
          'Hornea a 190°C durante 18 minutos hasta que la patata esté casi hecha.',
          'Coloca los filetes de dorada sazonados con la piel hacia abajo sobre las patatas.',
          'Hornea 8-10 minutos más hasta que el pescado esté blanco y tierno.',
        ],
      },
      {
        name: 'Albóndigas de ternera en salsa jardinera de verduras',
        time: '30 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 2 raciones',
        ageFor: 5,
        imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '180g de carne picada de ternera',
          '1/2 zanahoria picada fina',
          '2 cucharadas de guisantes',
          '1/2 cebolla picada',
          '200ml de caldo suave de carne o verduras',
          '1 cucharada de harina',
        ],
        steps: [
          'Forma las albóndigas, pásalas ligeramente por harina y dóralas en sartén.',
          'Retira las albóndigas y en el mismo aceite pocha la cebolla y la zanahoria.',
          'Añade el caldo y los guisantes, incorpora las albóndigas y tapa.',
          'Cocina a fuego lento 15 minutos hasta que la salsa espese.',
        ],
      },
      {
        name: 'Quiche casera de jamón, queso y calabacín',
        time: '35 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 4 raciones',
        ageFor: 5,
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 masa quebrada redonda para tarta salada',
          '3 huevos medianos',
          '150ml de nata para cocinar o leche evaporada',
          '80g de jamón cocido en taquitos',
          '1/2 calabacín rallado y escurrido',
          '50g de queso emmental rallado',
        ],
        steps: [
          'Forra un molde con la masa quebrada y pincha la base con un tenedor.',
          'Bate los huevos con la nata, añade el jamón, el calabacín y el queso.',
          'Vierte el relleno sobre la masa.',
          'Hornea a 180°C durante 25-30 minutos hasta que el relleno cuaje y se dore.',
        ],
      },
      {
        name: 'Brochetas de pollo marinado al limón con arroz',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 5,
        imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '200g de pechuga de pollo en dados grandes',
          'Zumo de 1/2 limón',
          '1 cucharadita de orégano seco',
          '2 cucharadas de aceite de oliva',
          '1 taza de arroz blanco cocido para acompañar',
        ],
        steps: [
          'Marina el pollo con el limón, aceite y orégano durante 15 minutos.',
          'Ensarta los dados en palillos de brocheta.',
          'Cocina en plancha bien caliente 3-4 minutos por lado hasta que estén dorados y jugosos.',
          'Sirve con el arroz blanco como guarnición.',
        ],
      },
      {
        name: 'Crema de puerros y patata (Vichyssoise tibia) con crujiente',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 5,
        imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 puerros grandes (solo la parte blanca)',
          '1 patata grande pelada',
          '350ml de caldo de verduras casero',
          '50ml de leche o nata ligera',
          '1 loncha de jamón serrano para hacer crujiente',
        ],
        steps: [
          'Rehoga los puerros y la patata troceados en mantequilla o aceite 5 minutos sin que tomen color.',
          'Añade el caldo y cuece 15 minutos hasta que la patata esté tierna.',
          'Tritura muy bien con la leche hasta conseguir una textura aterciopelada.',
          'Seca la loncha de jamón en microondas 1 minuto para hacerla crujiente y espolvorea por encima.',
        ],
      },
      {
        name: 'Hamburguesa vegetal de lentejas y champiñones',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 5,
        imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '150g de lentejas cocidas escurridas',
          '50g de champiñones salteados picados',
          '2 cucharadas de copos de avena',
          '1/2 cucharadita de cebolla en polvo',
          '1 cucharada de aceite de oliva',
        ],
        steps: [
          'Chafa las lentejas con un tenedor en un bol dejando algunos trozos.',
          'Añade los champiñones salteados picados, la avena y la cebolla en polvo.',
          'Deja reposar 5 minutos para que la avena absorba la humedad y forma hamburguesas.',
          'Dora en sartén caliente 3 minutos por lado.',
        ],
      },
      {
        name: 'Bizcocho esponjoso de yogur y limón bajo en azúcar',
        time: '40 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 6 raciones',
        ageFor: 5,
        imageUrl: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 yogur natural sin azúcar (125g)',
          '3 huevos medianos',
          '1 medida del vasito de yogur de pasta de dátiles o azúcar integral',
          '1 medida de aceite de oliva suave',
          '3 medidas de harina de trigo integral',
          '1 sobre de levadura química',
          'Ralladura de 1 limón',
        ],
        steps: [
          'Precalienta el horno a 180°C y engrasa un molde.',
          'Bate los huevos con el endulzante y la ralladura de limón.',
          'Añade el yogur y el aceite, mezclando bien.',
          'Incorpora la harina tamizada con la levadura y hornea 30 minutos.',
        ],
      },

      // ----------------------------------------------------
      // EDAD: 6 AÑOS (10 recetas)
      // ----------------------------------------------------
      {
        name: 'Paella suave de pollo y verduras de la huerta',
        time: '35 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 3 raciones',
        ageFor: 6,
        imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '150g de arroz bomba',
          '150g de pollo troceado',
          '50g de judías verdes planas',
          '1/2 pimiento rojo',
          '1 tomate maduro rallado',
          '400ml de caldo de pollo casero',
          'Una pizca de azafrán o cúrcuma',
        ],
        steps: [
          'Dora el pollo en la paella con aceite y aparta a los bordes.',
          'Sofríe las judías, el pimiento y añade el tomate rallado.',
          'Incorpora el arroz y rehoga 1 minuto para impregnar sabores.',
          'Añade el caldo hirviendo con la cúrcuma y cocina 18 minutos a fuego medio sin remover.',
        ],
      },
      {
        name: 'Solomillo de cerdo a la plancha con puré de manzana',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 6,
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '4 medallones de solomillo de cerdo',
          '2 manzanas reinetas o golden peladas',
          '1 cucharada de mantequilla',
          '1 ramita de tomillo',
          '1 cucharada de aceite de oliva',
        ],
        steps: [
          'Cuece las manzanas en dados con dos cucharadas de agua 10 minutos y chafa con la mantequilla.',
          'Sazona los medallones con una pizca de sal y tomillo.',
          'Marca en plancha muy caliente 2 minutos por lado para que queden tiernos y jugosos.',
          'Sirve los medallones calientes acompañados del puré dulce de manzana.',
        ],
      },
      {
        name: 'Salmón teriyaki casero con sésamo y brócoli al vapor',
        time: '20 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 6,
        imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 lomos de salmón fresco',
          '1 cucharada de salsa de soja baja en sal',
          '1 cucharadita de miel',
          '1 cucharadita de semillas de sésamo tostado',
          '1 taza de floretes de brócoli al vapor',
        ],
        steps: [
          'Mezcla la salsa de soja con la miel y pinta el salmón.',
          'Cocina en sartén antiadherente a fuego medio 3 minutos por lado.',
          'Vierte el resto de salsa en la sartén para caramelizar ligeramente el pescado.',
          'Espolvorea las semillas de sésamo y sirve con el brócoli al vapor.',
        ],
      },
      {
        name: 'Lasaña boloñesa tradicional con bechamel casera',
        time: '45 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 4 raciones',
        ageFor: 6,
        imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '8 placas de lasaña',
          '250g de carne picada mixta (ternera y cerdo)',
          '1/2 cebolla y 1 zanahoria picadas muy finas',
          '200g de salsa de tomate casera',
          '250ml de bechamel suave',
          '60g de queso parmesano o mozzarella',
        ],
        steps: [
          'Sofríe la cebolla y la zanahoria, añade la carne y cocina 8 minutos.',
          'Añade el tomate y cocina a fuego lento 15 minutos.',
          'Monta capas alternas de pasta, salsa boloñesa y bechamel.',
          'Cubre con bechamel y queso y hornea a 190°C durante 20 minutos hasta gratinar.',
        ],
      },
      {
        name: 'Rollitos de ternera rellenos de queso y pimientos asados',
        time: '25 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 2 raciones',
        ageFor: 6,
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '4 filetes finos de ternera (tipo escalopines)',
          '4 tiras de pimiento rojo asado',
          '4 lonchas de queso havarti o gouda',
          '1 cucharada de aceite de oliva',
        ],
        steps: [
          'Extiende los filetes de ternera y sazona suavemente.',
          'Coloca encima una loncha de queso y una tira de pimiento asado.',
          'Enrolla la carne sobre el relleno y sujeta con palillos.',
          'Dora en sartén a fuego medio durante 6-8 minutos girándolos para que se doren por todos lados.',
        ],
      },
      {
        name: 'Risotto de calabaza con virutas de jamón serrano',
        time: '30 min',
        difficulty: DifficultyRecip.MEDIA,
        servings: 'Para 2 raciones',
        ageFor: 6,
        imageUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '100g de arroz para risotto',
          '150g de calabaza en dados pequeños',
          '1 chalota o 1/2 cebolla dulce',
          '400ml de caldo de verduras caliente',
          '30g de queso parmesano',
          '20g de jamón serrano en virutas finas',
        ],
        steps: [
          'Pocha la chalota y la calabaza con un hilo de aceite 5 minutos.',
          'Incorpora el arroz y remueve hasta que esté brillante.',
          'Ve agregando el caldo poco a poco sin dejar de remover durante 18 minutos.',
          'Apaga el fuego, mezcla con el parmesano y corona con las virutas de jamón.',
        ],
      },
      {
        name: 'Merluza en salsa verde con guisantes y huevo duro',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 6,
        imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 lomos gruesos de merluza sin espinas',
          '1 diente de ajo picado fino',
          '1 manojo de perejil fresco muy picado',
          '1 cucharadita de harina',
          '150ml de caldo de pescado',
          '3 cucharadas de guisantes y 1 huevo cocido en cuartos',
        ],
        steps: [
          'Dora el ajo en una cazuela baja, añade la harina y el perejil removiendo.',
          'Vierte el caldo poco a poco para crear la salsa verde y deja hervir 2 minutos.',
          'Coloca la merluza sazonada y los guisantes en la cazuela.',
          'Tapa y cocina 6-8 minutos a fuego suave. Decora con el huevo cocido antes de servir.',
        ],
      },
      {
        name: 'Wrap integral de pollo crujiente con salsa de yogur',
        time: '15 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones',
        ageFor: 6,
        imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '2 tortillas integrales grandes',
          '150g de tiras de pollo empanado horneado',
          'Hojas de lechuga fresca picada',
          '4 tomates cherry en mitades',
          '3 cucharadas de salsa de yogur casera (yogur, limón y una pizca de sal)',
        ],
        steps: [
          'Calienta las tortillas 20 segundos para que estén tiernas.',
          'Unta con la salsa de yogur casera.',
          'Coloca la lechuga, los cherrys y las tiras de pollo crujiente.',
          'Dobla la base hacia arriba y enrolla los laterales formando un wrap bien cerrado.',
        ],
      },
      {
        name: 'Crepes salados rellenos de champiñones y queso',
        time: '25 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 2 raciones (4 crepes)',
        ageFor: 6,
        imageUrl: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 huevo, 1 vaso de leche y 1/2 vaso de harina (para la masa de crepes)',
          '150g de champiñones laminados',
          '1 cucharadita de aceite de oliva',
          '60g de queso emmental o mozzarella rallada',
        ],
        steps: [
          'Bate los ingredientes de la masa y haz los crepes finos en sartén engrasada.',
          'Saltea los champiñones en sartén hasta que pierdan su agua y estén tiernos.',
          'Rellena cada crepe con champiñones y queso rallado.',
          'Dobla en triángulo o rollo y pasa por la sartén caliente 1 minuto para fundir el queso.',
        ],
      },
      {
        name: 'Smoothie bowl de frutos rojos, yogur griego y granola',
        time: '10 min',
        difficulty: DifficultyRecip.FACIL,
        servings: 'Para 1 ración',
        ageFor: 6,
        imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=400&q=80',
        ingredients: [
          '1 plátano congelado en rodajas',
          '1 taza de frutos rojos congelados (fresas, arándanos, frambuesas)',
          '125g de yogur griego natural sin azúcar',
          '2 cucharadas de granola casera de avena',
          'Unas rodajitas de fruta fresca para decorar',
        ],
        steps: [
          'Tritura en batidora potente el plátano, los frutos rojos congelados y el yogur griego.',
          'Debe quedar una textura espesa y cremosa como un helado suave.',
          'Vierte en un bol hondo.',
          'Decora la superficie con la granola crujiente y fruta fresca cortada.',
        ],
      },
    ],
  });

  await prisma.book.createMany({
    data: [
    {
      title: "La crianza feliz: Cómo cuidar y entender a tu hijo de 0 a 6 años",
      authors: ["Rosa Jové"],
      synopsis: "La psicóloga infantil explica las etapas evolutivas de los primeros seis años y ofrece pautas respetuosas para acompañar procesos clave como las rutinas, la alimentación, la retirada del pañal, los miedos y los celos entre hermanos.",
      imageUrl: "https://imagessl8.casadellibro.com/a/l/t5/64/9788497348164.jpg",
      month: 11,
      year: 2026
    },
    {
      title: 'El gran libro de Lucía, mi pediatra', 
      authors: ['Lucía Galán Bertrand'], 
      synopsis: 'Manual de referencia sobre salud y bienestar infantil desde el nacimiento hasta la adolescencia. Resuelve de forma clara y tranquilizadora las dudas médicas más frecuentes de madres y padres primerizos (fiebre, vacunas, alimentación, sueño y desarrollo emocional).', 
      imageUrl: 'https://imagessl2.casadellibro.com/a/l/t5/89/9788408226789.jpg',
      month: 12,
      year: 2026
    },
    {
      title: "Bésame mucho: Cómo criar a tus hijos con amor", 
      authors: ["Carlos González"], 
      synopsis: "Un clásico de la crianza con apego que desmonta mitos sobre el llanto, el colecho y el contacto físico. El pediatra defiende atender las necesidades afectivas del bebé sin miedo a 'malcriarlo', apoyándose en la biología y el sentido común.", 
      imageUrl: "https://imagessl0.casadellibro.com/a/l/t5/50/9788484605850.jpg", 
      month: 1, 
      year: 2027
    },
    {
      title: "Ser mamá: Guía de embarazo, parto y posparto con evidencia y emoción",
      authors: ["Nazareth Olivera Belart (@comadronaenlaola)"],
      synopsis: "Escrito por una matrona, recorre paso a paso la gestación, el momento del parto y los primeros meses tras dar a luz combinando rigor científico actualizado con acompañamiento emocional para que cada mujer tome decisiones informadas.",
      imageUrl: "https://imagessl7.casadellibro.com/a/l/t5/07/9788418055607.jpg",
      month: 2,
      year: 2027
    },
    {
      title: "Somos la leche: Dudas, consejos y falsos mitos sobre la lactancia",
      authors: ["Alba Padró"],
      synopsis: "Guía práctica escrita por una de las consultoras internacionales de lactancia (IBCLC) más reconocidas en España. Aborda desde la subida de la leche y el agarre hasta las crisis de crecimiento, el dolor, la extracción y el destete respetuoso.",
      imageUrl: "https://imagessl5.casadellibro.com/a/l/t5/05/9788416895205.jpg",
      month: 3,
      year: 2027
    },
    {
      title: "El cerebro del niño explicado a los padres",
      authors: ["Álvaro Bilbao"],
      synopsis: "El neuropsicólogo traduce los hallazgos de la neurociencia infantil a herramientas prácticas para el día a día. Explica cómo madura el cerebro durante los primeros seis años de vida y cómo gestionar rabietas, límites y emociones desde la empatía.",
      imageUrl: "https://imagessl1.casadellibro.com/a/l/t5/61/9788416429561.jpg",
      month: 4,
      year: 2027
    },
    {
      title: "Matrescencia: La metamorfosis del embarazo, el parto y la maternidad",
      authors: ["Lucy Jones"],
      synopsis: "Ensayo revelador que combina testimonio personal y divulgación científica para analizar la profunda transformación física, neurológica, psicológica y social que atraviesa una mujer al convertirse en madre, alejándose de la idealización habitual.",
      imageUrl: "https://imagessl3.casadellibro.com/a/l/t5/23/9791387761523.jpg",
      month: 5,
      year: 2027
    },
    {
      title: "Neuromaternal: ¿Qué le pasa a mi cerebro durante el embarazo y la maternidad?",
      authors: ["Susana Carmona"],
      synopsis: "La neurocientífica española expone las investigaciones pioneras sobre cómo cambia la estructura y plasticidad del cerebro femenino durante la gestación y la crianza para adaptarse al cuidado del bebé y fortalecer el vínculo.",
      imageUrl: "https://imagessl7.casadellibro.com/a/l/t5/87/9788466678087.jpg",
      month: 6,
      year: 2027
    },
    {
      title: "Conoce tu posparto: 40 días y 500 noches", 
      authors: ["Laia Aguilar"], 
      synopsis: "Una mirada realista y cercana sobre el puerperio, esa etapa a menudo invisibilizada tras el nacimiento. Aborda la recuperación física, el vaivén hormonal, el cansancio, los cambios en la pareja y la gestión de expectativas y comentarios externos.", 
      imageUrl: "https://imagessl4.casadellibro.com/a/l/t5/94/9788418055294.jpg", 
      month: 7,
      year: 2027
    },
    {
      title: "Las semanas mágicas",
      authors: ["Hetty van de Rijt y Frans Plooij"],
      synopsis: "Basado en décadas de investigación sobre el desarrollo infantil, identifica los diez grandes saltos mentales que experimentan los bebés durante sus primeros 20 meses de vida, explicando por qué atraviesan fases de mayor irritabilidad y cómo estimular cada nueva habilidad.",
      imageUrl: "https://covers.openlibrary.org/b/id/14487642-L.jpg",
      month: 8,
      year: 2027
    }
  ]});

  await prisma.article.createMany({
    data: [
      {
        title: 'Rutinas de sueño respetuosas en los primeros meses',
        description: 'Aprende a reconocer las ventanas de vigilia y a establecer rituales de descanso que ayuden a tu bebé a dormir tranquilo durante la noche sin métodos agresivos.',
        url: 'https://enfamilia.aeped.es/edades-etapas/sueno-en-primeros-meses',
        source: 'EnFamilia (AEP)',
      },
      {
        title: 'Inicio de la alimentación complementaria: claves del método BLW',
        description: 'Guía completa para introducir sólidos de forma segura a partir de los 6 meses: requisitos de madurez, cortes adecuados de alimentos y prevención de atragantamientos.',
        url: 'https://enfamilia.aeped.es/vida-sana/alimentacion-complementaria-baby-led-weaning',
        source: 'Asociación Española de Pediatría',
      },
      {
        title: 'Lactancia materna: agarre correcto y prevención de grietas',
        description: 'Recomendaciones posturales y signos de un buen agarre para amamantar sin dolor, favorecer la producción de leche y asegurar una transferencia eficaz.',
        url: 'https://www.aeped.es/comite-nutricion-y-lactancia-materna/lactancia-materna/documentos/guia-lactancia-materna',
        source: 'Comité de Lactancia AEP',
      },
      {
        title: 'El posparto emocional: baby blues frente a depresión posparto',
        description: 'Cómo distinguir la tristeza fisiológica de los primeros días de un trastorno del estado de ánimo que requiere atención profesional y apoyo de la pareja.',
        url: 'https://www.who.int/es/news-room/fact-sheets/detail/maternal-mental-health',
        source: 'Organización Mundial de la Salud',
      },
      {
        title: 'Fiebre en bebés: cómo actuar y signos de alarma en urgencias',
        description: 'Qué temperatura se considera fiebre, cuándo administrar antitérmicos y cuáles son los síntomas que obligan a acudir de inmediato al pediatra de guardia.',
        url: 'https://enfamilia.aeped.es/temas-salud/fiebre',
        source: 'EnFamilia (AEP)',
      },
      {
        title: 'El porteo ergonómico: beneficios para el bebé y la espalda materna',
        description: 'Cómo elegir un portabebés adecuado que respete la posición en ranita o M, mantenga libres las vías respiratorias y favorezca el apego seguro.',
        url: 'https://enfamilia.aeped.es/vida-sana/porteo-ergonomico',
        source: 'Sociedad Española de Pediatría',
      },
      {
        title: 'Cuidados del cordón umbilical en el recién nacido',
        description: 'Técnicas de cura en seco recomendadas por la evidencia científica actual, signos de infección a vigilar y cuidados durante el baño diario.',
        url: 'https://enfamilia.aeped.es/edades-etapas/cuidados-cordon-umbilical',
        source: 'EnFamilia (AEP)',
      },
      {
        title: 'Cólicos del lactante: mitos, causas reales y pautas de alivio',
        description: 'Estrategias respetuosas para acompañar el llanto inconsolable vespertino: masajes abdominales, contacto piel con piel y porteo ergonómico.',
        url: 'https://enfamilia.aeped.es/temas-salud/colicos-lactante',
        source: 'Asociación Española de Pediatría',
      },
      {
        title: 'Recuperación del suelo pélvico tras el parto',
        description: 'Por qué es fundamental realizar una valoración fisioterapéutica postparto antes de retomar el ejercicio de impacto y cómo fortalecer la faja abdominal.',
        url: 'https://sego.es/mujeres/suelo-pelvico-posparto',
        source: 'Sociedad Española de Ginecología y Obstetricia',
      },
      {
        title: 'Los hitos del desarrollo motor durante el primer año',
        description: 'Desde el control cefálico y el volteo hasta el gateo y los primeros pasos: cómo acompañar el movimiento libre sin forzar posturas ni usar andadores.',
        url: 'https://kidshealth.org/es/parents/milestones-esp.html',
        source: 'KidsHealth',
      },
      {
        title: 'Regresiones de sueño infantiles: qué son y cuánto duran',
        description: 'Por qué los despertares aumentan a los 4, 8 y 18 meses coincidiendo con grandes saltos cognitivos y motores, y cómo superarlas con paciencia.',
        url: 'https://enfamilia.aeped.es/edades-etapas/regresiones-sueno-infantil',
        source: 'EnFamilia (AEP)',
      },
      {
        title: 'Destete respetuoso: cómo cerrar la etapa de lactancia con amor',
        description: 'Consejos para guiar el fin de la lactancia al ritmo de la madre y del niño, reduciendo tomas de forma progresiva y ofreciendo alternativas de consuelo y afecto.',
        url: 'https://www.aeped.es/comite-nutricion-y-lactancia-materna/lactancia-materna/destete-respetuoso',
        source: 'Comité de Lactancia AEP',
      },
      {
        title: 'Dermatitis del pañal: prevención y tratamiento eficaz',
        description: 'Causas más frecuentes de irritación en la piel del bebé, importancia de los cambios frecuentes y qué tipo de pastas barrera con óxido de zinc utilizar.',
        url: 'https://enfamilia.aeped.es/temas-salud/dermatitis-panal',
        source: 'EnFamilia (AEP)',
      },
      {
        title: 'Vacunación infantil: calendario oficial y preguntas frecuentes',
        description: 'Importancia de la inmunización comunitaria, vacunas sistemáticas y optativas recomendadas, y cómo aliviar las molestias postvacunales habituales.',
        url: 'https://vacunasaep.org/familias/calendario-de-vacunaciones-aep',
        source: 'Comité Asesor de Vacunas (CAV-AEP)',
      },
      {
        title: 'Rabietas y desbordes emocionales: comprender el cerebro del niño',
        description: 'Estrategias de disciplina positiva para acompañar las crisis de frustración entre los 1 y 3 años con calma, conexión previa y límites firmes sin gritos.',
        url: 'https://enfamilia.aeped.es/vida-sana/rabietas-como-gestionarlas',
        source: 'Asociación Española de Pediatría',
      },
      {
        title: 'Vuelta al trabajo y conciliación: banco de leche y derechos',
        description: 'Cómo crear y conservar un banco de leche materna congelada, calcular tomas para los cuidadores y ejercer los permisos de lactancia y reducción de jornada.',
        url: 'https://www.aeped.es/comite-nutricion-y-lactancia-materna/lactancia-materna/vuelta-al-trabajo',
        source: 'Comité de Lactancia AEP',
      },
      {
        title: 'Bronquiolitis y resfriados: cómo hacer lavados nasales correctamente',
        description: 'Instrucciones paso a paso para realizar lavados con suero fisiológico en bebés, mejorar su respiración y prevenir complicaciones respiratorias invernales.',
        url: 'https://enfamilia.aeped.es/temas-salud/lavados-nasales',
        source: 'EnFamilia (AEP)',
      },
      {
        title: 'Nutrición materna durante el embarazo y la lactancia',
        description: 'Alimentos clave ricos en hierro, calcio, yodo y omega-3, mitos sobre restricciones dietéticas y recomendaciones para mantener una energía óptima.',
        url: 'https://www.unicef.es/noticia/alimentacion-embarazo-lactancia',
        source: 'UNICEF',
      },
      {
        title: 'Brotes de crecimiento: qué ocurre a las 3 y 6 semanas',
        description: 'Por qué tu bebé parece insatisfecho y pide pecho constantemente durante ciertos periodos y cómo saber si está recibiendo suficiente leche materna.',
        url: 'https://www.aeped.es/comite-nutricion-y-lactancia-materna/lactancia-materna/crisis-de-lactancia',
        source: 'Comité de Lactancia AEP',
      },
      {
        title: 'El juego libre en la primera infancia: estimulación sin sobrecargar',
        description: 'La importancia del juego no estructurado y los materiales sencillos para el desarrollo de la creatividad, la concentración y la autonomía del niño.',
        url: 'https://enfamilia.aeped.es/vida-sana/juego-libre-estimulacion',
        source: 'Sociedad Española de Pediatría',
      },
    ],
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