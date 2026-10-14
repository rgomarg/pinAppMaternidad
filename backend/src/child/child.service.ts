import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class ChildService {
  constructor (private readonly prisma: PrismaService){}

  create(createChildDto: CreateChildDto) {
    return 'This action adds a new child';
  }

  findAll() {
    return `This action returns all child`;
  }

  findOne(id: number) {
    return this.prisma.child.findUnique({
      where: {id:id},
      include:{
        measurements:true,
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

  update(id: number, updateChildDto: UpdateChildDto) {
    return `This action updates a #${id} child`;
  }

  remove(id: number) {
    return `This action removes a #${id} child`;
  }
}
