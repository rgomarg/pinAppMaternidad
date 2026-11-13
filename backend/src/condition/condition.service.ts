import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConditionDto } from './dto/create-condition.dto';
import { UpdateConditionDto } from './dto/update-condition.dto';
import { PrismaService } from 'prisma/prisma.service';
import { getDateRange } from '../common/date-range';

@Injectable()
export class ConditionService {
  constructor(private readonly prisma: PrismaService) {}

  create(createConditionDto: CreateConditionDto) {
    return this.prisma.condition.create({
      data: {
        tag: createConditionDto.tag,
        desciption: null,
        notes: createConditionDto.notes,
        timestamp: createConditionDto.timestamp,
        childId: createConditionDto.childId,
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

  async findConditionsForGuardianOnDate(guardianId: number, date?: string, from?: string, to?: string) {
    const { start, end } = getDateRange(date, from, to);

    const dataConditions = await this.prisma.condition.findMany({
      where: {
        child: {
          parentId: guardianId,
        },
        timestamp: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
      select: {
        id: true,
        tag: true,
        notes: true,
        timestamp: true,
        child: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const CONDITION_LABELS: Record<string, string> = {
      HEADACHE: 'Dolor de cabeza',
      FEVER: 'Fiebre',
      COUGH: 'Tos',
      SORE_THROAT: 'Dolor de garganta',
      RUNNY_NOSE: 'Mocos',
      NASAL_CONGESTION: 'Congestión nasal',
      SNEEZING: 'Estornudos',
      STOMACHACHE: 'Dolor de barriga',
      CRAMPS: 'Calambres',
      NAUSEA: 'Náuseas',
      VOMITING: 'Vómitos',
      DIARRHEA: 'Diarrea',
      CONSTIPATION: 'Estreñimiento',
      DIZZINESS: 'Mareos',
      FATIGUE: 'Cansancio',
      EARACHE: 'Dolor de oído',
      TOOTHACHE: 'Dolor de muelas',
      RASH: 'Erupción cutánea',
      ITCHING: 'Picor',
      WATERY_EYES: 'Ojos llorosos',
      RED_EYES: 'Ojos rojos',
      LOSS_OF_APPETITE: 'Falta de apetito',
      MUSCLE_PAIN: 'Dolor muscular',
      JOINT_PAIN: 'Dolor en articulaciones',
      CHILLS: 'Escalofríos',
      SHORTNESS_OF_BREATH: 'Dificultad al respirar',
      WHEEZING: 'Pitidos al respirar',
      SWOLLEN_GLANDS: 'Ganglios inflamados',
      TROUBLE_SLEEPING: 'Problemas para dormir',
      IRRITABILITY: 'Irritabilidad',
    };

    return dataConditions.map((condition: any) => ({
      id: `condition-${condition.id}`,
      title: condition.tag.map((tag: string) => CONDITION_LABELS[tag] ?? tag).join(', '),
      description: condition.notes,
      date: condition.timestamp,
      type: 'CONDITION',
      child: condition.child,
      notification: false,
    }));
  }
}
