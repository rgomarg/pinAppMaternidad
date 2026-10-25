import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { PrismaService } from 'prisma/prisma.service';
import { getDateRange } from '../common/date-range';
import { NotificationStatus } from '@prisma/client';

@Injectable()
export class MedicineService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMedicineDto: CreateMedicineDto) {
    return this.prisma.medicine.create({
      data: {
        name: createMedicineDto.name.trim(),
        dosage: createMedicineDto.dosage.trim(),
        intervalHours: createMedicineDto.intervalHours,
        startDate: createMedicineDto.startDate,
        endDate: createMedicineDto.endDate ?? null,
        instructions: createMedicineDto.instructions,
        childId: createMedicineDto.childId,
        notification: createMedicineDto.notification ?? false,
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
    return this.prisma.medicine.findMany({
      orderBy: { startDate: 'desc' },
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
    const medicine = await this.prisma.medicine.findUnique({
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
    if (!medicine) {
      throw new NotFoundException(`Medicamento con ID ${id} no encontrado`);
    }
    return medicine;
  }

  async update(id: number, updateMedicineDto: UpdateMedicineDto) {
    await this.findOne(id);

    const updated = await this.prisma.medicine.update({
      where: { id },
      data: {
        name: updateMedicineDto.name?.trim(),
        dosage: updateMedicineDto.dosage?.trim(),
        intervalHours: updateMedicineDto.intervalHours,
        startDate: updateMedicineDto.startDate,
        endDate: updateMedicineDto.endDate,
        instructions: updateMedicineDto.instructions,
        childId: updateMedicineDto.childId,
        notification: updateMedicineDto.notification,
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

    if (updateMedicineDto.notification === false) {
      await this.prisma.notification.updateMany({
        where: {
          medicineId: id,
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
    return this.prisma.medicine.delete({ where: { id } });
  }

  async findMedicineForGuardianOnDate(guardianId: number, date?: string, from?: string, to?: string) {
    const { start, end } = getDateRange(date, from, to);

    const medicines = await this.prisma.medicine.findMany({
      where: {
        child: {
          parentId: guardianId,
        },
        startDate: {
          lt: end,
        },
        OR: [
          { endDate: null },
          { endDate: { gte: start } },
        ],
      },
      select: {
        id: true,
        name: true,
        dosage: true,
        intervalHours: true,
        startDate: true,
        endDate: true,
        instructions: true,
        notification: true,
        child: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return medicines.map((medicine) => {
      const details = [
        medicine.dosage,
        medicine.intervalHours ? `Cada ${medicine.intervalHours} h` : null,
        medicine.instructions?.trim() || null,
      ].filter(Boolean);

      return {
        id: `medicine-${medicine.id}`,
        title: medicine.name,
        description: details.join(' · '),
        date: medicine.startDate.toISOString(),
        startDate: medicine.startDate.toISOString(),
        endDate: medicine.endDate?.toISOString() ?? null,
        type: 'MEDICINE' as const,
        child: medicine.child,
        notification: medicine.notification ?? false,
      };
    });
  }
}
