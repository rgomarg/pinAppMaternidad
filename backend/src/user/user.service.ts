import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  create(createUserDto: CreateUserDto) {        
    return 'This action adds a new user';
  }

  async login(loginUserDto: LoginUserDto) {
    const emailClean = loginUserDto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: emailClean,
          mode: 'insensitive',
        },
      },
      include: {
        children: {
          include: {
            measurements: {
              orderBy: { date: 'desc' },
              take: 20,
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Correo electrónico o contraseña incorrectos');
    }

    // Comprobación de contraseña
    if (user.password !== loginUserDto.password) {
      throw new UnauthorizedException('Correo electrónico o contraseña incorrectos');
    }

    const { password, ...safeUser } = user;
    return safeUser;
  }

  findAll() {
    return this.prisma.user.findMany({});
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id: id },
      include: {
        children: {
          include: {
            measurements: {
              orderBy: { date: 'desc' },
              take: 20,
            },
          },
        },
      },
    });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
