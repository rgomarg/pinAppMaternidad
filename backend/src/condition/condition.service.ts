import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConditionDto } from './dto/create-condition.dto';
import { UpdateConditionDto } from './dto/update-condition.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class ConditionService {
  constructor(private readonly prisma: PrismaService) {}

  create(createConditionDto: CreateConditionDto) {
    return this.prisma.condition.create({
      data: {
        tag: [],
        desciption: createConditionDto.desciption,
        notes: createConditionDto.notes,
        timestamp: createConditionDto.timestamp,
        childId: createConditionDto.childId,
      },
    });
  }

  findAll() {
    return this.prisma.condition.findMany({ orderBy: { timestamp: 'desc' } });
  }

  findOne(id: number) {
    return this.prisma.condition.findUnique({ where: { id } });
  }

  update(id: number, updateConditionDto: UpdateConditionDto) {
    return this.prisma.condition.update({ where: { id }, data: updateConditionDto });
  }

  remove(id: number) {
    return this.prisma.condition.delete({ where: { id } });
  }
}
