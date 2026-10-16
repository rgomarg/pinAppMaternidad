import { Injectable } from '@nestjs/common';
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
}
