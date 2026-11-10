import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { authorSelect } from '../thread/thread.service';
import { assertNotBlocked, visibleMessageWhere, visibleThreadWhere } from '../thread/visibility';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async create({ content, authorId, threadId, parentId }: CreateMessageDto) {
    const [thread, author] = await Promise.all([
      this.prisma.thread.findFirst({ where: { id: threadId, ...visibleThreadWhere }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { id: authorId }, select: { id: true, blockedAt: true } }),
    ]);
    if (!thread) {
      throw new NotFoundException(`No thread with id ${threadId} found`);
    }
    if (!author) {
      throw new NotFoundException(`No user with id ${authorId} found`);
    }
    assertNotBlocked(author);

    if (parentId !== undefined) {
      const parent = await this.prisma.message.findFirst({
        where: { id: parentId, ...visibleMessageWhere },
        select: { threadId: true },
      });
      if (!parent || parent.threadId !== threadId) {
        throw new BadRequestException('The parent message does not belong to this thread');
      }
    }

    const message = await this.prisma.message.create({
      data: { content, authorId, threadId, parentId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        likesCount: true,
        parentId: true,
        author: { select: authorSelect },
      },
    });
    // Mismo formato que los nodos de GET /thread/:id
    return { ...message, likedByMe: false, replies: [] };
  }

  // Idempotente: si el usuario ya dio like no se duplica ni suma al contador
  async like(id: number, userId: number) {
    await this.assertVisible(id);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, blockedAt: true } });
    if (!user) {
      throw new NotFoundException(`No user with id ${userId} found`);
    }
    assertNotBlocked(user);
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.messageLike.createMany({
        data: { userId, messageId: id },
        skipDuplicates: true,
      });
      const message = await tx.message.update({
        where: { id },
        data: { likesCount: { increment: count } },
        select: { likesCount: true },
      });
      return { likesCount: message.likesCount, likedByMe: true };
    });
  }

  async unlike(id: number, userId: number) {
    await this.assertVisible(id);
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.messageLike.deleteMany({ where: { userId, messageId: id } });
      const message = await tx.message.update({
        where: { id },
        data: { likesCount: { decrement: count } },
        select: { likesCount: true },
      });
      return { likesCount: message.likesCount, likedByMe: false };
    });
  }

  // Las respuestas al mensaje no se borran: su parentId pasa a null (onDelete: SetNull)
  async remove(id: number, userId: number) {
    const message = await this.prisma.message.findUnique({ where: { id }, select: { authorId: true } });
    if (!message) {
      throw new NotFoundException(`No message with id ${id} found`);
    }
    if (message.authorId !== userId) {
      throw new ForbiddenException('Only the author can delete this message');
    }
    await this.prisma.message.delete({ where: { id } });
  }

  private async assertVisible(id: number) {
    const message = await this.prisma.message.findFirst({
      where: { id, ...visibleMessageWhere, thread: visibleThreadWhere },
      select: { id: true },
    });
    if (!message) {
      throw new NotFoundException(`No message with id ${id} found`);
    }
  }
}
