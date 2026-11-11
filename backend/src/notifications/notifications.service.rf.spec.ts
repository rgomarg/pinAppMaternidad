import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

// Pruebas unitarias del almacenamiento de recordatorios (RF-01).
describe('NotificationsService (RF-01)', () => {
  const prisma = {
    user: { update: jest.fn() },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new NotificationsService(prisma as any);
  });

  it('registerPushToken guarda el token del móvil en el usuario', async () => {
    await service.registerPushToken({ userId: 26, pushToken: 'ExponentPushToken[abc]' } as any);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 26 },
      data: { pushToken: 'ExponentPushToken[abc]' },
    });
  });

  describe('create', () => {
    it('guarda el recordatorio como PENDING, convirtiendo la fecha a Date', async () => {
      await service.create({
        title: 'Cita médica',
        body: 'Evento para Leo',
        scheduledAt: '2027-03-15T09:00:00.000Z',
        userId: 26,
        type: 'EVENT',
        eventId: 88,
        data: { screen: 'Calendario' },
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          title: 'Cita médica',
          body: 'Evento para Leo',
          scheduledAt: new Date('2027-03-15T09:00:00.000Z'),
          userId: 26,
          type: 'EVENT',
          eventId: 88,
          vaccineId: undefined,
          medicineId: undefined,
          data: { screen: 'Calendario' },
          status: 'PENDING',
        },
      });
    });

    it('por defecto el tipo es EVENT y sin datos extra', async () => {
      await service.create({ title: 't', body: 'b', scheduledAt: new Date('2027-03-15T09:00:00Z'), userId: 1 });

      const data = prisma.notification.create.mock.calls[0][0].data;
      expect(data.type).toBe('EVENT');
      expect(data.data).toBeUndefined();
    });
  });

  it('findByUser devuelve el historial del usuario, del más reciente al más antiguo', async () => {
    await service.findByUser(26);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 26 }, orderBy: { scheduledAt: 'desc' } }),
    );
  });

  it('findAll ordena por fecha programada descendente', async () => {
    await service.findAll();
    expect(prisma.notification.findMany).toHaveBeenCalledWith({ orderBy: { scheduledAt: 'desc' } });
  });

  describe('findOne', () => {
    it('devuelve la notificación', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 5 });
      await expect(service.findOne(5)).resolves.toEqual({ id: 5 });
    });

    it('lanza 404 si no existe', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.findOne(5)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('convierte la nueva fecha programada a Date', async () => {
      await service.update(5, { scheduledAt: '2027-03-16T09:00:00.000Z' } as any);
      expect(prisma.notification.update.mock.calls[0][0].data.scheduledAt).toEqual(new Date('2027-03-16T09:00:00.000Z'));
    });

    it('si no cambia la fecha, no la modifica', async () => {
      await service.update(5, { title: 'Nuevo' } as any);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { title: 'Nuevo', scheduledAt: undefined },
      });
    });
  });

  it('remove borra la notificación', async () => {
    await service.remove(5);
    expect(prisma.notification.delete).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it('cancelByEvent cancela solo las notificaciones PENDING del evento', async () => {
    await service.cancelByEvent(88);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { eventId: 88, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  });
});
