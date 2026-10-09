import { Injectable } from '@nestjs/common';
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
              take: 1
            }
          }
        }
      }
    })
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
