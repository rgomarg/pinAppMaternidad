import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class MedicineService {
  constructor(private readonly prisma: PrismaService) {}

  create(createMedicineDto: CreateMedicineDto) {
    return this.prisma.medicine.create({
      data: {
        name: createMedicineDto.name.trim(),
        dosage: createMedicineDto.dosage.trim(),
        intervalHours: createMedicineDto.intervalHours,
        startDate: createMedicineDto.startDate,
        endDate: createMedicineDto.endDate ?? null,
        instructions: createMedicineDto.instructions,
        childId: createMedicineDto.childId,
      },
    });
  }

  findAll() {
    return this.prisma.medicine.findMany({ orderBy: { startDate: 'desc' } });
  }

  findOne(id: number) {
    return this.prisma.medicine.findUnique({ where: { id } });
  }

  update(id: number, updateMedicineDto: UpdateMedicineDto) {
    return this.prisma.medicine.update({ where: { id }, data: updateMedicineDto });
  }

  remove(id: number) {
    return this.prisma.medicine.delete({ where: { id } });
  }

  async findMedicineForGuardianOnDate(guardianId: number, date: string) {
    // El cliente envía una fecha en formato YYYY-MM-DD.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    if (!match) {
      throw new BadRequestException('La fecha debe tener el formato YYYY-MM-DD');
    }

    const [, year, month, day] = match;
    const start = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const end = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + 1));

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
        id:true,
        name:true,
        dosage:true,
        intervalHours:true,
        startDate:true,
        endDate:true,
        instructions:true,
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
        type: 'MEDICINE' as const,
        child: medicine.child,
      };
    });
  }
}
