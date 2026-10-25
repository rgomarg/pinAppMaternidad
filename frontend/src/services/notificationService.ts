import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { API_URL } from '../api/config';

export const NOTIFICATION_PERMISSION_REQUIRED_TITLE = 'Permisos de notificación requeridos';
export const NOTIFICATION_PERMISSION_REQUIRED_MESSAGE =
  'No es posible programar el servicio en segundo plano ni emitir la notificación al dispositivo sin los permisos necesarios.';

/**
 * Comprueba y solicita permisos de notificación a nivel de sistema operativo.
 * Retorna true si están concedidos, false en caso contrario.
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted' || existing.granted) {
      return true;
    }

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return requested.status === 'granted' || (requested.granted ?? false);
  } catch (error) {
    console.warn('Error al verificar permisos de notificación del dispositivo:', error);
    return false;
  }
}

/**
 * Asegura la configuración del canal de notificaciones en Android
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6d83a1',
        sound: 'default',
      });
    } catch (error) {
      console.warn('Error al configurar canal de notificación en Android:', error);
    }
  }
}

export interface ScheduleParams {
  eventId: number | string;
  itemType?: 'EVENT' | 'VACCINE' | 'MEDICINE';
  title: string;
  body: string;
  targetDate: Date;
  advanceMinutes?: number;
  intervalHours?: number | null;
  endDate?: Date | string | null;
}

/**
 * Programa una o varias notificaciones locales en el móvil para eventos, vacunas o tomas periódicas de medicación.
 * Si es un medicamento periódico (intervalHours > 0), programa todas las tomas futuras hasta endDate
 * (o hasta un horizonte de 30 días si es crónico/indefinido).
 */
export async function scheduleLocalEventNotification(
  params: ScheduleParams,
): Promise<string | null> {
  const {
    eventId,
    itemType = 'EVENT',
    title,
    body,
    targetDate,
    advanceMinutes = 0,
    intervalHours,
    endDate,
  } = params;

  try {
    await setupNotificationChannel();

    // Limpiar previamente cualquier notificación existente de este registro para evitar duplicados
    await cancelLocalEventNotification(eventId, itemType);

    const now = Date.now();
    let triggerMs = targetDate.getTime() - advanceMinutes * 60 * 1000;

    // Si es un MEDICAMENTO con intervalo (ej: cada 8h, cada 24h para toma diaria, etc.)
    if (itemType === 'MEDICINE' && intervalHours && intervalHours > 0) {
      const intervalMs = intervalHours * 3600 * 1000;

      // Calcular fecha límite del tratamiento
      let endLimitMs = Infinity;
      if (endDate) {
        const endD = new Date(endDate);
        // Si no tiene hora específica (viene en medianoche 00:00:00), cubrir el último día completo
        if (endD.getHours() === 0 && endD.getMinutes() === 0 && endD.getSeconds() === 0) {
          endD.setHours(23, 59, 59, 999);
        }
        endLimitMs = endD.getTime();
      }

      // Límite de horizonte prudente de 30 días para no saturar la cola del SO si es crónico
      const maxHorizonMs = now + 30 * 24 * 3600 * 1000;
      if (endLimitMs > maxHorizonMs) {
        endLimitMs = maxHorizonMs;
      }

      // Avanzar al futuro si la fecha de inicio del medicamento ya quedó en el pasado
      while (triggerMs <= now && triggerMs + intervalMs <= endLimitMs) {
        triggerMs += intervalMs;
      }

      if (triggerMs <= now || triggerMs > endLimitMs) {
        console.log(
          `ℹ️ [Notificaciones] No hay tomas futuras pendientes para "${title}" (tratamiento finalizado).`,
        );
        return null;
      }

      // Programar en bucle todas las tomas futuras del período (máximo 60 por límites del SO)
      let doseCount = 0;
      const maxDoses = 60;
      let firstNotifId: string | null = null;

      while (triggerMs <= endLimitMs && doseCount < maxDoses) {
        if (triggerMs > now) {
          const doseDate = new Date(triggerMs);
          const notifId = await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: {
                screen: 'Calendario',
                id: eventId,
                uniqueKey: String(eventId),
                itemType,
                doseIndex: doseCount + 1,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: doseDate,
              channelId: 'default',
            },
          });

          if (!firstNotifId) firstNotifId = notifId;
          doseCount++;
        }
        triggerMs += intervalMs;
      }

      console.log(
        `✅ [Notificaciones] Se programaron ${doseCount} tomas para "${title}" cada ${intervalHours}h hasta ${new Date(endLimitMs).toLocaleDateString()}.`,
      );
      return firstNotifId;
    }

    // Para EVENTOS o VACUNAS individuales (o medicamentos sin intervalo)
    if (triggerMs <= now) {
      console.log(
        `ℹ️ [Notificaciones] No se programa alarma local para "${title}" porque su fecha/hora ya ha vencido.`,
      );
      return null;
    }

    const finalDate = new Date(triggerMs);

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          screen: 'Calendario',
          id: eventId,
          uniqueKey: String(eventId),
          itemType,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: finalDate,
        channelId: 'default',
      },
    });

    console.log(`✅ [Notificaciones] Alerta programada con éxito para "${title}" en: ${finalDate.toLocaleString()}`);
    return notifId;
  } catch (error) {
    console.warn('Error al programar alerta local:', error);
    return null;
  }
}

/**
 * Cancela del dispositivo todas las notificaciones locales vinculadas a un evento, medicamento o vacuna
 */
export async function cancelLocalEventNotification(
  id: number | string,
  itemType?: string,
): Promise<void> {
  try {
    const targetStr = String(id);
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    let cancelledCount = 0;
    for (const item of scheduled) {
      const data = item.content?.data;
      if (data) {
        const matchesKey =
          data.id === id ||
          data.eventId === id ||
          data.uniqueKey === targetStr ||
          String(data.id) === targetStr ||
          String(data.eventId) === targetStr;

        const matchesType = !itemType || data.itemType === itemType;

        if (matchesKey && matchesType) {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
          cancelledCount++;
        }
      }
    }
    if (cancelledCount > 0) {
      console.log(`🗑️ [Notificaciones] Se cancelaron ${cancelledCount} alertas del registro ${id}.`);
    }
  } catch (error) {
    console.warn('Error al cancelar alerta local:', error);
  }
}

/**
 * Registra notificación en backend
 */
export async function registerBackendNotification(params: {
  userId: number;
  eventId?: number;
  vaccineId?: number;
  medicineId?: number;
  type?: 'EVENT' | 'VACCINE' | 'MEDICINE';
  title: string;
  body: string;
  scheduledAt: string;
}): Promise<void> {
  try {
    await fetch(`${API_URL}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: params.title,
        body: params.body,
        scheduledAt: params.scheduledAt,
        userId: params.userId,
        type: params.type ?? 'EVENT',
        eventId: params.eventId,
        vaccineId: params.vaccineId,
        medicineId: params.medicineId,
        data: {
          screen: 'Calendario',
          id: params.eventId ?? params.vaccineId ?? params.medicineId,
          type: params.type ?? 'EVENT',
        },
      }),
    });
  } catch (error) {
    console.warn('No se pudo sincronizar la notificación en backend:', error);
  }
}
