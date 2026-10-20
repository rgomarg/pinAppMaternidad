import { Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { EventType } from '@prisma/client';
import { getDateRange } from '../common/date-range';

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  create(createEventDto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        title: createEventDto.title.trim(),
        description: createEventDto.description?.trim() || null,
        date: createEventDto.date,
        notification: createEventDto.notification ?? false,
        type: createEventDto.type ?? EventType.GENERAL,
        childId: createEventDto.childId,
      }
    });
  }

  findAll() {
    return `This action returns all event`;
  }

  findOne(id: number) {
    return `This action returns a #${id} event`;
  }

  update(id: number, updateEventDto: UpdateEventDto) {
    return `This action updates a #${id} event`;
  }

  remove(id: number) {
    return `This action removes a #${id} event`;
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
