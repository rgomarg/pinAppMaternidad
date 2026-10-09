import { Injectable } from '@nestjs/common';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}


  async create(createMeasurementDto: CreateMeasurementDto) {

    return this.prisma.measurement.create({
      data: {
        childId: createMeasurementDto.childId,
        date: new Date(createMeasurementDto.date),
        weight: createMeasurementDto.weight,
        height: createMeasurementDto.height,

      },
    });
  }


  async findAll(childId:number) {
    return this.prisma.measurement.findMany({
      where: {
        childId:childId,
      },
      orderBy:{
        date: 'desc'
      }
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} measurement`;
  }

  update(id: number, updateMeasurementDto: UpdateMeasurementDto) {
    return `This action updates a #${id} measurement`;
  }

  remove(id: number) {
    return `This action removes a #${id} measurement`;
  }

  
  
}
