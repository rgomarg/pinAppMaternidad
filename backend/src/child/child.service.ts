import { Injectable } from '@nestjs/common';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class ChildService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createChildDto: CreateChildDto , userId: number) {
    return await this.prisma.child.create({
      data:{
        name: createChildDto.name,
        birthDate: createChildDto.birthDate,
        bloodGroup: createChildDto.bloodGroup,
        allergies: createChildDto.allergies,
        parentId: userId
      }
    })
  }

  findAll() {
    return `This action returns all child`;
  }

  findOne(id: number) {
    return `This action returns a #${id} child`;
  }

  update(id: number, updateChildDto: UpdateChildDto) {
    return `This action updates a #${id} child`;
  }

  remove(id: number) {
    return `This action removes a #${id} child`;
  }
}
