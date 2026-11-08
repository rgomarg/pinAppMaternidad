import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { ListThreadsQueryDto } from './dto/list-threads-query.dto';
import { buildMessageTree } from './message-tree';
import { assertNotBlocked, visibleMessageWhere, visibleThreadWhere } from './visibility';

// Datos públicos del autor (nunca email ni password)
export const authorSelect = { id: true, name: true, avatarUrl: true, role: true } satisfies Prisma.UserSelect;

const threadSummarySelect = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  owner: { select: authorSelect },
  tags: { select: { id: true, name: true } },
} satisfies Prisma.ThreadSelect;

@Injectable()
export class ThreadService {
  constructor(private readonly prisma: PrismaService) {}

  async create({ title, content, ownerId, tagIds }: CreateThreadDto) {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, blockedAt: true } });
    if (!owner) {
      throw new NotFoundException(`No user with id ${ownerId} found`);
    }
    assertNotBlocked(owner);
    await this.assertTagsExist(tagIds);

    return this.prisma.thread.create({
      data: {
        title,
        content,
        ownerId,
        tags: tagIds?.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      },
      select: threadSummarySelect,
    });
  }

  async findAll({ tagId, page, limit }: ListThreadsQueryDto) {
    const where: Prisma.ThreadWhereInput = {
      ...visibleThreadWhere,
      ...(tagId && { tags: { some: { id: tagId } } }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.thread.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          ...threadSummarySelect,
          _count: { select: { messages: { where: visibleMessageWhere } } },
        },
      }),
      this.prisma.thread.count({ where }),
    ]);

    return {
      items: items.map(({ _count, ...thread }) => ({ ...thread, messageCount: _count.messages })),
      page,
      limit,
      total,
    };
  }

  // userId (opcional) sirve para marcar los mensajes a los que ese usuario dio like
  async findOne(id: number, userId?: number) {
    const thread = await this.prisma.thread.findFirst({
      where: { id, ...visibleThreadWhere },
      select: {
        ...threadSummarySelect,
        messages: {
          where: visibleMessageWhere,
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            likesCount: true,
            parentId: true,
            author: { select: authorSelect },
            // Sin userId se filtra por -1 (ningún usuario) y likedByMe queda a false
            likes: { where: { userId: userId ?? -1 }, select: { userId: true } },
          },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException(`No thread with id ${id} found`);
    }

    const messages = thread.messages.map(({ likes, ...message }) => ({ ...message, likedByMe: likes.length > 0 }));
    return { ...thread, messageCount: messages.length, messages: buildMessageTree(messages) };
  }

  async update(id: number, { ownerId, title, content, tagIds }: UpdateThreadDto) {
    await this.assertOwner(id, ownerId);
    await this.assertTagsExist(tagIds);

    return this.prisma.thread.update({
      where: { id },
      data: {
        title,
        content,
        // set reemplaza todos los tags del hilo por los enviados
        tags: tagIds ? { set: tagIds.map((tagId) => ({ id: tagId })) } : undefined,
      },
      select: threadSummarySelect,
    });
  }

  // Borrado lógico: el hilo deja de ser público pero se conserva en la BD para auditoría
  async remove(id: number, userId: number) {
    await this.assertOwner(id, userId);
    await this.prisma.thread.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async assertOwner(threadId: number, userId: number) {
    const thread = await this.prisma.thread.findFirst({
      where: { id: threadId, ...visibleThreadWhere },
      select: { ownerId: true },
    });
    if (!thread) {
      throw new NotFoundException(`No thread with id ${threadId} found`);
    }
    if (thread.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can modify this thread');
    }
  }

  private async assertTagsExist(tagIds?: number[]) {
    if (!tagIds?.length) return;
    const found = await this.prisma.tag.count({ where: { id: { in: tagIds } } });
    if (found !== tagIds.length) {
      throw new BadRequestException('Some tags do not exist');
    }
  }
}
