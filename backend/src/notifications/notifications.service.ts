import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { RegisterTokenDto } from './dto/register-tokenDto';
import { PrismaService } from 'prisma/prisma.service';
import { NotificationStatus, NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Guardar o actualizar el token del móvil de un usuario
  async registerPushToken(dto: RegisterTokenDto) {
    return this.prisma.user.update({
      where: {
        id: dto.userId,
      },
      data: {
        pushToken: dto.pushToken,
      },
    });
  }

  // 2. Crear una nueva notificación programada
  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        title: dto.title,
        body: dto.body,
        scheduledAt: new Date(dto.scheduledAt),
        userId: dto.userId,
        type: dto.type ?? NotificationType.EVENT,
        eventId: dto.eventId,
        vaccineId: dto.vaccineId,
        medicineId: dto.medicineId,
        data: dto.data ?? undefined,
        status: NotificationStatus.PENDING,
      },
    });
  }

  // 3. Obtener todas las notificaciones de un usuario (para su historial en la app)
  async findByUser(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        event: { select: { id: true, title: true, date: true } },
      },
    });
  }

  // 4. Obtener todas las notificaciones generales
  async findAll() {
    return this.prisma.notification.findMany({
      orderBy: { scheduledAt: 'desc' },
    });
  }

  // 5. Buscar una notificación por su ID
  async findOne(id: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException(`Notificación con ID ${id} no encontrada`);
    }
    return notification;
  }

  // 6. Actualizar una notificación (ej: cambiar la fecha programada)
  async update(id: number, updateNotificationDto: UpdateNotificationDto) {
    return this.prisma.notification.update({
      where: { id },
      data: {
        ...updateNotificationDto,
        scheduledAt: updateNotificationDto.scheduledAt
          ? new Date(updateNotificationDto.scheduledAt)
          : undefined,
      },
    });
  }

  // 7. Eliminar una notificación
  async remove(id: number) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  // 8. Cancelar la notificación asociada a un evento (si el usuario apaga la campana o borra el evento)
  async cancelByEvent(eventId: number) {
    return this.prisma.notification.updateMany({
      where: {
        eventId,
        status: NotificationStatus.PENDING,
      },
      data: {
        status: NotificationStatus.CANCELLED,
      },
    });
  }
}