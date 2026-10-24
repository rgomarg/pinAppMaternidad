import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { PrismaService } from 'prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const emailClean = createUserDto.email.trim().toLowerCase();

    // Comprobar si ya existe un usuario con ese correo
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: emailClean,
          mode: 'insensitive',
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe una cuenta registrada con este correo electrónico');
    }

    // Crear el nuevo usuario
    const newUser = await this.prisma.user.create({
      data: {
        name: createUserDto.name.trim(),
        email: emailClean,
        password: createUserDto.password,
        role: Role.USER,
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

    const { password, ...safeUser } = newUser;
    return safeUser;
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
