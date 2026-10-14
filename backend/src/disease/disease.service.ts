import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateDiseaseDto } from './dto/create-disease.dto';
import { UpdateDiseaseDto } from './dto/update-disease.dto';

@Injectable()
export class DiseaseService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDiseaseDto) {
    return this.prisma.disease.create({ data: dto });
  }

  findAll(childId?: number) {
    return this.prisma.disease.findMany({
      where: childId ? { childId } : undefined,
    });
  }

  async findOne(id: number) {
    const disease = await this.prisma.disease.findUnique({ where: { id } });
    if (!disease) throw new NotFoundException(`No disease with id ${id} found`);
    return disease;
  }

  async update(id: number, dto: UpdateDiseaseDto) {
    await this.findOne(id);
    return this.prisma.disease.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.disease.delete({ where: { id } });
  }
}
