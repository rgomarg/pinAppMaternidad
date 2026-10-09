import { PrismaClient, Role, EntityType, ReportStatus, TagCondition } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpiando la base de datos (evitando conflictos de claves foráneas)...');
  await prisma.report.deleteMany();
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
  // 1. CREACIÓN DE ETIQUETAS DEL FORO Y ENFERMEDADES BASE
  // ------------------------------------------------------
  const tagLactancia = await prisma.tag.create({ data: { name: 'Lactancia' } });
  const tagSueno = await prisma.tag.create({ data: { name: 'Sueño' } });
  const tagSalud = await prisma.tag.create({ data: { name: 'Salud' } });
  const tagNutricion = await prisma.tag.create({ data: { name: 'Nutrición' } });
  const tagDesarrollo = await prisma.tag.create({ data: { name: 'Desarrollo' } });

  const otitis = await prisma.disease.create({ data: { name: 'Otitis Media', description: 'Infección del oído medio' } });
  const bronquiolitis = await prisma.disease.create({ data: { name: 'Bronquiolitis', description: 'Infección respiratoria viral' } });

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
        create: [{
          name: 'Leo',
          birthDate: new Date('2025-08-15T10:00:00Z'),
          bloodGroup: 'O+',
          allergies: 'Ninguna conocida',
          measurements: {
            create: [
              { date: new Date('2025-08-15T10:00:00Z'), weight: 3.2, height: 50 },
              { date: new Date('2025-09-15T10:00:00Z'), weight: 4.1, height: 54 },
              { date: new Date('2025-10-15T10:00:00Z'), weight: 5.3, height: 58 },
              { date: new Date('2025-11-15T10:00:00Z'), weight: 6.2, height: 62 },
            ]
          },
          vaccines: {
            create: [
              { name: 'Hepatitis B (Nacimiento)', scheduledFor: new Date('2025-08-15T10:00:00Z'), appliedAt: new Date('2025-08-16T10:00:00Z') },
              { name: 'Rotavirus (2 meses)', scheduledFor: new Date('2025-10-15T10:00:00Z'), appliedAt: new Date('2025-10-20T10:00:00Z') },
              { name: 'Meningococo B (4 meses)', scheduledFor: new Date('2025-12-15T10:00:00Z') } // Pendiente
            ]
          },
          checklists: {
            create: [
              { title: 'Revisión del primer mes', isCompleted: true, completedAt: new Date('2025-09-16T10:00:00Z') },
              { title: 'Revisión de los 6 meses', isCompleted: false }
            ]
          }
        }]
      }
    },
    include: { children: true }
  });

  // Usuario 2: Carlos (USER) - Padre primerizo de una recién nacida
  const carlos = await prisma.user.create({
    data: {
      email: 'carlos.user@example.com',
      name: 'Carlos Martín',
      password: 'hashed_password_456',
      role: Role.USER,
      children: {
        create: [{
          name: 'Sofía',
          birthDate: new Date('2026-01-10T08:30:00Z'),
          bloodGroup: 'A-',
          events: {
            create: [
              { title: 'Cita Pediatra - Pesar', date: new Date('2026-02-10T10:00:00Z'), hasReminder: true },
              { title: 'Prueba del talón', date: new Date('2026-01-15T09:00:00Z'), hasReminder: false }
            ]
          }
        }]
      }
    },
    include: { children: true }
  });

  // Usuario 3: Elena (ADMIN) - Madre de un niño mayor con historial médico
  const elena = await prisma.user.create({
    data: {
      email: 'elena.admin@example.com',
      name: 'Elena Gómez (Pediatra)',
      password: 'hashed_password_789',
      role: Role.ADMIN,
      children: {
        create: [{
          name: 'Mateo',
          birthDate: new Date('2021-03-22T16:00:00Z'),
          bloodGroup: 'B+',
          allergies: 'Penicilina, Polen',
          conditions: {
            create: [
              { tag: [TagCondition.FEVER], timestamp: new Date('2026-01-05T20:00:00Z'), notes: '39ºC repentinos' },
              { tag: [TagCondition.COUGH], timestamp: new Date('2026-01-06T09:00:00Z'), notes: 'Empeora al tumbarse' }
            ]
          }
        }]
      }
    },
    include: { children: { include: { conditions: true } } }
  });

  // ------------------------------------------------------
  // 3. REGISTROS MÉDICOS Y MEDICACIÓN CRUZADA
  // ------------------------------------------------------
  
  // Mateo (hijo de Elena) toma medicina por la fiebre vinculada a la otitis
  await prisma.medicine.create({
    data: {
      name: 'Dalsy 20mg',
      dosage: '3.5 ml',
      intervalHours: 8,
      startDate: new Date('2026-01-05T21:00:00Z'),
      endDate: new Date('2026-01-09T21:00:00Z'),
      instructions: 'Dar siempre con algo de comida en el estómago',
      childId: elena.children[0].id,
      diseaseId: otitis.id,
      conditionId: elena.children[0].conditions[0].id
    }
  });

  // Leo (hijo de Laura) toma medicina por un virus respiratorio
  await prisma.medicine.create({
    data: {
      name: 'Ventolín Inhalador',
      dosage: '2 pulsaciones',
      intervalHours: 6,
      startDate: new Date('2025-12-01T10:00:00Z'),
      childId: laura.children[0].id,
      diseaseId: bronquiolitis.id
    }
  });

  // ------------------------------------------------------
  // 4. FORO DE FAMILIAS: HILOS, RESPUESTAS Y ANIDACIÓN
  // ------------------------------------------------------
  
  // Hilo 1: Sueño y Lactancia (Creado por Carlos)
  const hiloSueno = await prisma.thread.create({
    data: {
      title: 'Mi bebé de 3 semanas no duerme más de 2 horas seguidas',
      content: 'Hola a todos. Sofía tiene 3 semanas y estamos agotados. Solo quiere pecho y se despierta en cuanto la dejamos en la cuna. ¿Es normal?',
      ownerId: carlos.id,
      tags: { connect: [{ id: tagSueno.id }, { id: tagLactancia.id }] }
    }
  });

  // Respuestas al Hilo 1
  const respuestaLaura = await prisma.message.create({
    data: {
      content: '¡Mucho ánimo Carlos! Los primeros meses son de supervivencia. Lo que cuentas es súper normal, los bebés no saben enlazar ciclos de sueño aún.',
      likesCount: 12,
      authorId: laura.id,
      threadId: hiloSueno.id
    }
  });

  await prisma.message.create({
    data: {
      content: 'Totalmente. A nosotros nos salvó hacer colecho seguro y usar una mochila de porteo por el día.',
      likesCount: 5,
      authorId: elena.id,
      threadId: hiloSueno.id
    }
  });

  // Respuesta anidada al comentario de Laura
  await prisma.message.create({
    data: {
      content: 'Gracias Laura, de verdad. A veces piensas que lo estás haciendo mal.',
      authorId: carlos.id,
      threadId: hiloSueno.id,
      parentId: respuestaLaura.id
    }
  });

  // Hilo 2: Alimentación (Creado por Laura)
  const hiloBLW = await prisma.thread.create({
    data: {
      title: '¿Miedo a empezar con el BLW (Baby Led Weaning)?',
      content: 'Leo va a cumplir 6 meses y su pediatra nos ha recomendado empezar con trozos, pero me da pánico que se atragante. ¿Experiencias?',
      ownerId: laura.id,
      tags: { connect: [{ id: tagNutricion.id }, { id: tagDesarrollo.id }] }
    }
  });

  await prisma.message.create({
    data: {
      content: 'Haz un curso de primeros auxilios pediátricos antes de empezar. Te dará mucha seguridad y es fundamental saber actuar.',
      likesCount: 25,
      authorId: elena.id,
      threadId: hiloBLW.id
    }
  });

  // Hilo 3: Contenido problemático (Para probar la moderación)
  const hiloPolemico = await prisma.thread.create({
    data: {
      title: 'Le doy infusiones de anís a mi bebé de 1 mes para los cólicos',
      content: 'A mí me funciona genial, le hago una botellita de anís estrellado y duerme toda la noche del tirón.',
      ownerId: carlos.id, // Simulemos que Carlos pregunta algo peligroso por ignorancia
      tags: { connect: [{ id: tagSalud.id }] }
    }
  });

  const mensajePolemico = await prisma.message.create({
    data: {
      content: 'Yo también lo hago, y si le pones un poco de miel en el chupete se callan al instante.',
      likesCount: 0,
      authorId: carlos.id,
      threadId: hiloPolemico.id
    }
  });

  // ------------------------------------------------------
  // 5. SISTEMA DE REPORTES
  // ------------------------------------------------------
  
  // Laura reporta el mensaje peligroso sobre la miel (botulismo)
  await prisma.report.create({
    data: {
      reason: 'Consejo médico muy peligroso (Miel en menores de 1 año). Riesgo de botulismo.',
      status: ReportStatus.PENDING,
      targetType: EntityType.MESSAGE,
      targetId: mensajePolemico.id,
      reporterId: laura.id
    }
  });

  // Elena (Admin) reporta y oculta el hilo entero
  await prisma.report.create({
    data: {
      reason: 'Las infusiones de anís estrellado son tóxicas para los bebés neurológicamente.',
      status: ReportStatus.RESOLVED,
      targetType: EntityType.THREAD,
      targetId: hiloPolemico.id,
      reporterId: elena.id
    }
  });

  // Ocultamos el hilo reportado simulando que el Admin ya ha actuado
  await prisma.thread.update({
    where: { id: hiloPolemico.id },
    data: { isHidden: true }
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