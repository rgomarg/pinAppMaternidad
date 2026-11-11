import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { PrismaService } from 'prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChildCreatedEvent } from './entities/child-created.events';


@Injectable()
export class ChildService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter2: EventEmitter2,
  ) { }
  async create(createChildDto: CreateChildDto) {
    const child = await this.prisma.child.create({
      data: {
        name: createChildDto.name,
        surname: createChildDto.surname,
        birthDate: createChildDto.birthDate,
        bloodGroup: createChildDto.bloodGroup,
        allergies: createChildDto.allergies,
        parentId: createChildDto.parentId,
        sex: createChildDto.sex,
        measurements:
          createChildDto.weight && createChildDto.height
            ? {
              create: {
                date: new Date(),
                weight: createChildDto.weight,
                height: createChildDto.height
              }
            }
            : undefined,

        diseases: createChildDto.diseases?.length
          ? {
            create: createChildDto.diseases.map(name => ({
              name
            })),
          }
          : undefined,


      }
    });
    this.eventEmitter2.emit(
      'child.created',
      new ChildCreatedEvent(child.id, child.birthDate)
    )
    return child;
  }

  findAll() {
    return `This action returns all child`;
  }

  findOne(id: number) {
    return this.prisma.child.findUnique({
      where: { id: id },
      include: {
        measurements: true,
        vaccines: true,
        conditions: true,
        medicine: true,
        diseases: true,
      }
    })
  }

  async getDashboardData(id: number) {
    const child = await this.prisma.child.findUnique({
      where: { id },
      include: {
        vaccines: true,
        conditions: true,
        medicine: true,
        diseases: true,
      },
    });

    if (!child) {
      throw new NotFoundException(`No child with id ${id} found`);
    }

    return child;
  }

  async update(id: number, updateChildDto: UpdateChildDto) {
    await this.findExistingOrFail(id);
    return this.prisma.child.update({
      where: { id },
      data: {
        name: updateChildDto.name?.trim(),
        surname: updateChildDto.surname,
        birthDate: updateChildDto.birthDate,
        bloodGroup: updateChildDto.bloodGroup,
        allergies: updateChildDto.allergies,
        sex: updateChildDto.sex,
      },
    });
  }

  // Las vacunas, medicamentos, condiciones, mediciones y notificaciones asociadas
  // se eliminan en cascada (onDelete: Cascade en el esquema de Prisma).
  async remove(id: number) {
    await this.findExistingOrFail(id);
    return this.prisma.child.delete({ where: { id } });
  }

  private async findExistingOrFail(id: number) {
    const child = await this.prisma.child.findUnique({ where: { id } });
    if (!child) {
      throw new NotFoundException(`No child with id ${id} found`);
    }
    return child;
  }

  async exportData(id: number) {
    const child = await this.prisma.child.findUnique({
      where: { id },
      include: {
        measurements: true,
        vaccines: true,
        conditions: true,
        medicine: true,
        diseases: true,
      }
    });
    if(!child) {
      throw new NotFoundException(`No child with id ${id} found`);
    }

    

    return child;
  }
}
