import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
    title!: string;
    body!: string;
    scheduledAt!: string | Date;
    userId!: number;
    type?: NotificationType;
    eventId?: number;
    vaccineId?: number;
    medicineId?: number;
    data?: any; // JSON con { screen: 'Calendario', id: ... }
}
