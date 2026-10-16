import { Injectable } from '@nestjs/common';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { UpdateVaccineDto } from './dto/update-vaccine.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class VaccineService {
  constructor(private readonly prisma: PrismaService) {}

  create(createVaccineDto: CreateVaccineDto) {
    return this.prisma.vaccine.create({
      data: {
        name: createVaccineDto.name.trim(),
        childId: createVaccineDto.childId,
        appliedAt: createVaccineDto.appliedAt ?? null,
        scheduledFor: createVaccineDto.scheduledFor ?? null,
      },
    });
  }

  findAll() {
    return this.prisma.vaccine.findMany({
      orderBy: [{ appliedAt: 'desc' }, { scheduledFor: 'desc' }, { id: 'desc' }],
    });
  }

  findOne(id: number) {
    return this.prisma.vaccine.findUnique({ where: { id } });
  }

  update(id: number, updateVaccineDto: UpdateVaccineDto) {
    return `This action updates a #${id} vaccine`;
  }

  remove(id: number) {
    return `This action removes a #${id} vaccine`;
  }
}
