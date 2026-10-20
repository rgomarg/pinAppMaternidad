import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { ListThreadsQueryDto } from './dto/list-threads-query.dto';
import { buildMessageTree } from './message-tree';

// Datos públicos del autor (nunca email ni password)
export const authorSelect = { id: true, name: true, avatarUrl: true, role: true } satisfies Prisma.UserSelect;

@Injectable()
export class ThreadService {
  constructor(private readonly prisma: PrismaService) {}

  create(createThreadDto: CreateThreadDto) {
    return 'This action adds a new thread';
  }

  async findAll({ tagId, page, limit }: ListThreadsQueryDto) {
    const where: Prisma.ThreadWhereInput = {
      isHidden: false,
      ...(tagId && { tags: { some: { id: tagId } } }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.thread.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          owner: { select: authorSelect },
          tags: { select: { id: true, name: true } },
          _count: { select: { messages: { where: { isHidden: false } } } },
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
      where: { id, isHidden: false },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        owner: { select: authorSelect },
        tags: { select: { id: true, name: true } },
        messages: {
          where: { isHidden: false },
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

  update(id: number, updateThreadDto: UpdateThreadDto) {
    return `This action updates a #${id} thread`;
  }

  remove(id: number) {
    return `This action removes a #${id} thread`;
  }
}
