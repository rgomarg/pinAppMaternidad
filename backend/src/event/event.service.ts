import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  create(createEventDto: CreateEventDto) {
    return 'This action adds a new event';
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

  async findEventsForGuardianOnDate(guardianId: number, date: string) {
    // El cliente envía una fecha en formato YYYY-MM-DD.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    if (!match) {
      throw new BadRequestException('La fecha debe tener el formato YYYY-MM-DD');
    }

    const [, year, month, day] = match;
    const start = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const end = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + 1));

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
