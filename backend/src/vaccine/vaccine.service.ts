import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { UpdateVaccineDto } from './dto/update-vaccine.dto';
import { PrismaService } from 'prisma/prisma.service';
import { getDateRange } from '../common/date-range';
import { NotificationStatus } from '@prisma/client';

@Injectable()
export class VaccineService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVaccineDto: CreateVaccineDto) {
    return this.prisma.vaccine.create({
      data: {
        name: createVaccineDto.name.trim(),
        childId: createVaccineDto.childId,
        appliedAt: createVaccineDto.appliedAt ?? null,
        scheduledFor: createVaccineDto.scheduledFor ?? null,
        notification: createVaccineDto.notification ?? false,
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
    return this.prisma.vaccine.findMany({
      orderBy: [{ appliedAt: 'desc' }, { scheduledFor: 'desc' }, { id: 'desc' }],
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

  async findOne(id: number) {
    const vaccine = await this.prisma.vaccine.findUnique({
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
    if (!vaccine) {
      throw new NotFoundException(`Vacuna con ID ${id} no encontrada`);
    }
    return vaccine;
  }

  async update(id: number, updateVaccineDto: UpdateVaccineDto) {
    await this.findOne(id);

    const updated = await this.prisma.vaccine.update({
      where: { id },
      data: {
        name: updateVaccineDto.name?.trim(),
        childId: updateVaccineDto.childId,
        appliedAt: updateVaccineDto.appliedAt,
        scheduledFor: updateVaccineDto.scheduledFor,
        notification: updateVaccineDto.notification,
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

    if (updateVaccineDto.notification === false) {
      await this.prisma.notification.updateMany({
        where: {
          vaccineId: id,
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
    return this.prisma.vaccine.delete({ where: { id } });
  }

  async findVaccineForGuardianOnDate(guardianId: number, date?: string, from?: string, to?: string) {
    const { start, end } = getDateRange(date, from, to);

    const vaccines = await this.prisma.vaccine.findMany({
      where: {
        child: {
          parentId: guardianId,
        },
        OR: [
          { scheduledFor: { gte: start, lt: end } },
          { appliedAt: { gte: start, lt: end } },
        ],
      },
      include: {
        child: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { scheduledFor: 'asc' },
        { appliedAt: 'asc' },
      ],
    });

    return vaccines.map((vac) => {
      const vacDate = vac.appliedAt ?? vac.scheduledFor ?? start;
      return {
        id: `vaccine-${vac.id}`,
        title: `Vacuna: ${vac.name}`,
        description: vac.appliedAt ? 'Vacuna ya aplicada' : 'Pendiente de aplicación',
        date: vacDate.toISOString(),
        type: 'VACCINE' as const,
        status: vac.appliedAt ? 'Aplicada' : 'Pendiente',
        child: vac.child,
        notification: vac.notification ?? false,
      };
    });
  }
}
