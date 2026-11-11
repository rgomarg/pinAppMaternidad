import { Logger } from '@nestjs/common';
import { NotificationSchedulerService } from './notifications-scheduler.service';

// @nestjs/schedule se distribuye como ESM y Jest no lo carga; aquí solo aporta
// el decorador @Cron (la programación cada minuto), que no influye en la lógica probada.
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_MINUTE: '0 * * * * *' },
}));

// Se simula el SDK de Expo para no enviar notificaciones reales.
const sendPushNotificationsAsync = jest.fn();
const chunkPushNotifications = jest.fn((messages: unknown[]) => [messages]);

jest.mock('expo-server-sdk', () => ({
  Expo: Object.assign(
    jest.fn().mockImplementation(() => ({ sendPushNotificationsAsync, chunkPushNotifications })),
    { isExpoPushToken: (t: string) => typeof t === 'string' && t.startsWith('ExponentPushToken[') },
  ),
}));

// RF-01: envío del recordatorio cuando llega la hora programada.
describe('NotificationSchedulerService (RF-01)', () => {
  const prisma = {
    notification: { findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  };
  let service: NotificationSchedulerService;

  const pendiente = (id: number, pushToken: string | null) => ({
    id,
    title: `Recordatorio ${id}`,
    body: 'Cita',
    data: { screen: 'Calendario' },
    user: { id: 26, pushToken },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    service = new NotificationSchedulerService(prisma as any);
  });

  it('busca solo notificaciones PENDING cuya hora ya ha llegado', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    const antes = new Date();

    await service.checkAndSendPendingNotifications();

    const where = prisma.notification.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('PENDING');
    expect(where.scheduledAt.lte.getTime()).toBeGreaterThanOrEqual(antes.getTime());
  });

  it('si no hay pendientes no envía nada', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    await service.checkAndSendPendingNotifications();
    expect(sendPushNotificationsAsync).not.toHaveBeenCalled();
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });

  it('envía a Expo los recordatorios con token válido y los marca como SENT', async () => {
    prisma.notification.findMany.mockResolvedValue([pendiente(1, 'ExponentPushToken[aaa]')]);

    await service.checkAndSendPendingNotifications();

    expect(sendPushNotificationsAsync).toHaveBeenCalledWith([
      expect.objectContaining({ to: 'ExponentPushToken[aaa]', title: 'Recordatorio 1', priority: 'high' }),
    ]);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1] } },
      data: { status: 'SENT', sentAt: expect.any(Date) },
    });
  });

  it('marca como FAILED los recordatorios sin token o con token inválido', async () => {
    prisma.notification.findMany.mockResolvedValue([pendiente(2, null), pendiente(3, 'token-malo')]);

    await service.checkAndSendPendingNotifications();

    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { status: 'FAILED' } });
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { status: 'FAILED' } });
    expect(sendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('en un lote mixto envía solo los válidos', async () => {
    prisma.notification.findMany.mockResolvedValue([pendiente(4, 'ExponentPushToken[b]'), pendiente(5, null)]);

    await service.checkAndSendPendingNotifications();

    expect(sendPushNotificationsAsync.mock.calls[0][0]).toHaveLength(1);
    expect(prisma.notification.updateMany.mock.calls[0][0].where).toEqual({ id: { in: [4] } });
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { status: 'FAILED' } });
  });

  it('si Expo falla al enviar, NO debe marcar el recordatorio como SENT', async () => {
    prisma.notification.findMany.mockResolvedValue([pendiente(6, 'ExponentPushToken[c]')]);
    sendPushNotificationsAsync.mockRejectedValueOnce(new Error('Expo no disponible'));

    await service.checkAndSendPendingNotifications();

    expect(prisma.notification.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SENT' }) }),
    );
  });
});
