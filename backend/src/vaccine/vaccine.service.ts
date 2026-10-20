import { BadRequestException, Injectable } from '@nestjs/common';
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

  async findVaccineForGuardianOnDate(guardianId: number, date: string) {
    // El cliente envía una fecha en formato YYYY-MM-DD.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    if (!match) {
      throw new BadRequestException('La fecha debe tener el formato YYYY-MM-DD');
    }

    const [, year, month, day] = match;
    const start = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const end = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + 1));

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
        type: 'VACCINE',
        status: vac.appliedAt ? 'Aplicada' : 'Pendiente',
        child: vac.child,
      };
    });
  }
}
