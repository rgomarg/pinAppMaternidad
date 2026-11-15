import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCheckListItemDto } from './dto/create-check-list-item.dto';
import { UpdateCheckListItemDto } from './dto/update-check-list-item.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CheckListItemService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertChildAccess(childId: number, userId: number) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId: userId },
      select: { id: true },
    });
    if (!child) {
      throw new ForbiddenException('El usuario no puede acceder a este hijo');
    }
  }

  async create(dto: CreateCheckListItemDto) {
    await this.assertChildAccess(dto.childId, dto.userId);
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('La tarea no puede estar vacía');
    }
    return this.prisma.checklistItem.create({
      data: { title, childId: dto.childId },
    });
  }

  async findAll(childId: number, userId: number) {
    await this.assertChildAccess(childId, userId);
    return this.prisma.checklistItem.findMany({
      where: { childId },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, userId?: number) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }
    if (userId !== undefined) {
      await this.assertChildAccess(item.childId, userId);
    }
    return item;
  }

  async update(id: number, dto: UpdateCheckListItemDto) {
    const item = await this.findOne(id);
    await this.assertChildAccess(item.childId, dto.userId);
    const title = dto.title?.trim();
    if (dto.title !== undefined && !title) {
      throw new BadRequestException('La tarea no puede estar vacía');
    }
    return this.prisma.checklistItem.update({
      where: { id },
      data: {
        title,
        isCompleted: dto.isCompleted,
        completedAt: dto.isCompleted === undefined
          ? undefined
          : dto.isCompleted ? new Date() : null,
      },
    });
  }

  async remove(id: number, userId: number) {
    const item = await this.findOne(id);
    await this.assertChildAccess(item.childId, userId);
    return this.prisma.checklistItem.delete({ where: { id } });
  }
}
