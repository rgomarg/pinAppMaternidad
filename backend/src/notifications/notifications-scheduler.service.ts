import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private expo = new Expo();

  constructor(private readonly prisma: PrismaService) {}

  // Se ejecuta automáticamente cada minuto (o cada 30 segundos si usas '*/30 * * * * *')
  @Cron('* * * * * *')
  async checkAndSendPendingNotifications() {
    const now = new Date();

    // 1. Buscar todas las notificaciones pendientes cuya hora haya llegado o pasado
    const pending = await this.prisma.notification.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
      },
      include: {
        user: { select: { id: true, pushToken: true } },
      },
    });

    if (pending.length === 0) return;

    this.logger.log(`Procesando ${pending.length} notificaciones pendientes...`);

    const messages: ExpoPushMessage[] = [];
    const sentNotifs: typeof pending = [];

    for (const notif of pending) {
      const token = notif.user?.pushToken;

      // Comprobar que el usuario tenga un token válido de Expo
      if (token && Expo.isExpoPushToken(token)) {
        messages.push({
          to: token,
          sound: 'default',
          title: notif.title,
          body: notif.body,
          data: notif.data as any,
          priority: 'high',
        });
        sentNotifs.push(notif);
      } else {
        // Si no tiene token o es inválido, marcamos como fallida
        await this.prisma.notification.update({
          where: { id: notif.id },
          data: { status: 'FAILED' },
        });
      }
    }

    // 2. Enviar en lotes (chunks) recomendados por Expo (o simular si MOCK_EXPO=true)
    if (messages.length > 0) {
      const chunks = this.expo.chunkPushNotifications(messages);
      if (process.env.MOCK_EXPO === 'true') {
        this.logger.log(
          `[MOCK_EXPO] Simulados ${messages.length} envíos en ${chunks.length} lote(s).`,
        );
      } else {
        for (const chunk of chunks) {
          try {
            await this.expo.sendPushNotificationsAsync(chunk);
          } catch (error) {
            this.logger.error('Error enviando chunk de notificaciones a Expo', error);
          }
        }
      }

      // 3. Marcar las notificaciones como enviadas (SENT) e instrumentar latencia (3.2.1.2)
      const sentAt = new Date();
      const notificationIdsSent = sentNotifs.map((n) => n.id);
      await this.prisma.notification.updateMany({
        where: { id: { in: notificationIdsSent } },
        data: { status: 'SENT', sentAt },
      });

      for (const notif of sentNotifs) {
        const latencyMs = sentAt.getTime() - notif.scheduledAt.getTime();
        this.logger.log(
          JSON.stringify({
            notificationId: notif.id,
            scheduledAt: notif.scheduledAt.toISOString(),
            sentAt: sentAt.toISOString(),
            latencyMs,
          }),
        );
      }
    }
  }
}