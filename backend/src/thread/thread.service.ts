import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { ListThreadsQueryDto } from './dto/list-threads-query.dto';

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

  findOne(id: number) {
    return `This action returns a #${id} thread`;
  }

  update(id: number, updateThreadDto: UpdateThreadDto) {
    return `This action updates a #${id} thread`;
  }

  remove(id: number) {
    return `This action removes a #${id} thread`;
  }
}
