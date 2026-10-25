import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { EventType, NotificationStatus } from '@prisma/client';
import { getDateRange } from '../common/date-range';

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        title: createEventDto.title.trim(),
        description: createEventDto.description?.trim() || null,
        date: createEventDto.date,
        notification: createEventDto.notification ?? false,
        type: createEventDto.type ?? EventType.GENERAL,
        childId: createEventDto.childId,
      },
      include: {
        child: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.event.findMany({
      include: {
        child: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        child: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);
    }

    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto) {
    await this.findOne(id);

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        title: updateEventDto.title !== undefined ? updateEventDto.title.trim() : undefined,
        description:
          updateEventDto.description !== undefined
            ? updateEventDto.description?.trim() || null
            : undefined,
        date: updateEventDto.date,
        notification: updateEventDto.notification,
        type: updateEventDto.type,
        childId: updateEventDto.childId,
      },
      include: {
        child: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Si se desactiva la alerta del evento, cancelar las notificaciones pendientes asociadas
    if (updateEventDto.notification === false) {
      await this.prisma.notification.updateMany({
        where: {
          eventId: id,
          status: NotificationStatus.PENDING,
        },
        data: {
          status: NotificationStatus.CANCELLED,
        },
      });
    }

    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.event.delete({
      where: { id },
    });
  }

  async findEventsForGuardianOnDate(guardianId: number, date?: string, from?: string, to?: string) {
    const { start, end } = getDateRange(date, from, to);

    return this.prisma.event.findMany({
      where: {
        child: {
          parentId: guardianId,
        },
        date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        notification: true,
        type: true,
        child: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
