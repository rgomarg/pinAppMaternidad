import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventService } from './event.service';

// Pruebas unitarias de RF-01 (registro de eventos con recordatorio) y RF-02
// (calendario multiperfil). Prisma se sustituye por un objeto simulado (mock),
// así que no hace falta base de datos.
describe('EventService (RF-01 / RF-02)', () => {
  const prisma = {
    event: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    notification: { updateMany: jest.fn() },
  };
  let service: EventService;

  const existente = { id: 7, title: 'Cita', child: { id: 3, name: 'Leo' } };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new EventService(prisma as any);
  });

  describe('create (RF-01)', () => {
    const fecha = new Date('2027-03-15T09:30:00.000Z');

    it('guarda el evento asociado al menor, con título y descripción sin espacios sobrantes', async () => {
      prisma.event.create.mockResolvedValue({ id: 1 });

      await service.create({
        title: '  Cita pediatra  ',
        description: '  Revisión  ',
        date: fecha,
        notification: true,
        type: 'MEDICAL_APPOINTMENT',
        childId: 3,
      });

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          title: 'Cita pediatra',
          description: 'Revisión',
          date: fecha,
          notification: true,
          type: 'MEDICAL_APPOINTMENT',
          childId: 3,
        },
        include: { child: { select: { id: true, name: true } } },
      });
    });

    it('aplica los valores por defecto: sin recordatorio, tipo GENERAL y descripción null', async () => {
      await service.create({ title: 'Vacuna', date: fecha, childId: 4 });

      expect(prisma.event.create.mock.calls[0][0].data).toEqual({
        title: 'Vacuna',
        description: null,
        date: fecha,
        notification: false,
        type: 'GENERAL',
        childId: 4,
      });
    });

    it('convierte una descripción formada solo por espacios en null', async () => {
      await service.create({ title: 'Cita', description: '   ', date: fecha, childId: 4 });
      expect(prisma.event.create.mock.calls[0][0].data.description).toBeNull();
    });
  });

  describe('findAll', () => {
    it('lista todos los eventos ordenados por fecha ascendente', async () => {
      prisma.event.findMany.mockResolvedValue([existente]);
      await expect(service.findAll()).resolves.toEqual([existente]);
      expect(prisma.event.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { date: 'asc' } }));
    });
  });

  describe('findOne', () => {
    it('devuelve el evento con su menor', async () => {
      prisma.event.findUnique.mockResolvedValue(existente);
      await expect(service.findOne(7)).resolves.toBe(existente);
      expect(prisma.event.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
    });

    it('lanza 404 si el evento no existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update (RF-01: activar/desactivar recordatorio)', () => {
    beforeEach(() => prisma.event.findUnique.mockResolvedValue(existente));

    it('al desactivar el recordatorio cancela las notificaciones PENDING del evento', async () => {
      prisma.event.update.mockResolvedValue({ ...existente, notification: false });

      const result = await service.update(7, { notification: false });

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { eventId: 7, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      expect(result.notification).toBe(false);
    });

    it('al activar el recordatorio no cancela ninguna notificación', async () => {
      await service.update(7, { notification: true });
      expect(prisma.notification.updateMany).not.toHaveBeenCalled();
    });

    it('si no se envía "notification" no toca las notificaciones', async () => {
      await service.update(7, { title: 'Otra' });
      expect(prisma.notification.updateMany).not.toHaveBeenCalled();
    });

    it('solo actualiza los campos enviados y limpia espacios', async () => {
      await service.update(7, { title: '  Nueva  ', description: '  ' });

      const data = prisma.event.update.mock.calls[0][0].data;
      expect(data.title).toBe('Nueva');
      expect(data.description).toBeNull();
      expect(data.date).toBeUndefined();
      expect(data.childId).toBeUndefined();
    });

    it('si no se envían título ni descripción, no los modifica', async () => {
      await service.update(7, { childId: 5 });

      const data = prisma.event.update.mock.calls[0][0].data;
      expect(data.title).toBeUndefined();
      expect(data.description).toBeUndefined();
      expect(data.childId).toBe(5);
    });

    it('lanza 404 y no actualiza nada si el evento no existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(service.update(99, { notification: false })).rejects.toThrow(NotFoundException);
      expect(prisma.event.update).not.toHaveBeenCalled();
      expect(prisma.notification.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('borra el evento existente', async () => {
      prisma.event.findUnique.mockResolvedValue(existente);
      await service.remove(7);
      expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });

    it('lanza 404 y no borra nada si el evento no existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });
  });

  describe('findEventsForGuardianOnDate (RF-02: multiperfil)', () => {
    it('filtra por el tutor y por el día completo, ordenado por fecha', async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await service.findEventsForGuardianOnDate(26, '2027-03-15');

      const args = prisma.event.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        child: { parentId: 26 },
        date: { gte: new Date('2027-03-15T00:00:00.000Z'), lt: new Date('2027-03-16T00:00:00.000Z') },
      });
      expect(args.orderBy).toEqual({ date: 'asc' });
    });

    it('devuelve el menor de cada evento para que la app pueda filtrar por hijo', async () => {
      await service.findEventsForGuardianOnDate(26, '2027-03-15');
      expect(prisma.event.findMany.mock.calls[0][0].select.child).toEqual({ select: { id: true, name: true } });
    });

    it('usa el rango from/to para el calendario mensual', async () => {
      await service.findEventsForGuardianOnDate(26, undefined, '2027-03-01', '2027-04-01');

      expect(prisma.event.findMany.mock.calls[0][0].where.date).toEqual({
        gte: new Date('2027-03-01T00:00:00.000Z'),
        lt: new Date('2027-04-01T00:00:00.000Z'),
      });
    });

    it('rechaza fechas inválidas sin consultar la base de datos', async () => {
      await expect(service.findEventsForGuardianOnDate(26, '15-03-2027')).rejects.toThrow(BadRequestException);
      expect(prisma.event.findMany).not.toHaveBeenCalled();
    });
  });
});
