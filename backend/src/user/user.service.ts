import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UserService {
  constructor (private readonly prisma: PrismaService) {}

  create(createUserDto: CreateUserDto) {        
    return 'This action adds a new user';
  }

  findAll() {
    return this.prisma.user.findMany({});
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: {id:id},
      include:{
        children: {
          include: {
            measurements: {
              orderBy: { date: 'desc' },
              take: 20
            }
          }
        }
      }
    })
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      throw new NotFoundException(`No user with id ${id} found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        phone: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
