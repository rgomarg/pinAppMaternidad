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
}

/**
 * Programa una notificación local en el móvil
 */
export async function scheduleLocalEventNotification(
  params: ScheduleParams,
): Promise<string | null> {
  const { eventId, itemType = 'EVENT', title, body, targetDate, advanceMinutes = 0 } = params;

  try {
    await setupNotificationChannel();

    const triggerMs = targetDate.getTime() - advanceMinutes * 60 * 1000;
    const now = Date.now();
    let finalDate = new Date(triggerMs);

    // Si la fecha calculada ya pasó pero es hoy en breves minutos o inmediata,
    // se dispara en 3 segundos para que el usuario la reciba
    if (finalDate.getTime() <= now) {
      finalDate = new Date(now + 3000);
    }

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
    for (const item of scheduled) {
      const data = item.content?.data;
      if (data) {
        const matchesKey =
          data.id === id ||
          data.eventId === id ||
          data.uniqueKey === targetStr ||
          String(data.id) === targetStr;

        const matchesType = !itemType || data.itemType === itemType;

        if (matchesKey && matchesType) {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        }
      }
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
